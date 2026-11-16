const GoogleSheet = require('../config/google');
const Reconciliation = require('../models/reconciliation');
const Alert = require('../models/alert');
const { notifyReconciliationMismatch } = require('../utils/notifications');
const { computeUsersDiff, computeIncidentsDiff } = require('../utils/reconcile-diff');

const USERS_SPREADSHEET = process.env.USERS_SPREADSHEET_ID;

const USERS_SHEET_TITLE = 'Data Import';
const USERS_DATA_START_ROW = 4;
const USERS_RANGE = 'Data Import!B4:F';
const USERS_APPEND_RANGE = 'Data Import!B4:F';

const INCIDENTS_SHEET_TITLE = 'Incident Import';
const INCIDENTS_DATA_START_ROW = 2;
const INCIDENTS_RANGE = 'Incident Import!A2:E';
const INCIDENTS_APPEND_RANGE = 'Incident Import!A2:E';

const userRowRange = (row) => `Data Import!B${row}:F${row}`;
const incidentRowRange = (row) => `Incident Import!A${row}:E${row}`;

async function getSheetId(sheet, title) {
    const res = await sheet.spreadsheets.get({
        spreadsheetId: USERS_SPREADSHEET,
        fields: 'sheets(properties(sheetId,title))',
    });

    const found = (res.data.sheets || []).find((s) => s.properties.title === title);
    if (!found) {
        throw new Error(`Sheet "${title}" not found`);
    }

    return found.properties.sheetId;
}

async function deleteRows(sheet, sheetId, rowNumbers) {
    if (!rowNumbers.length) return;

    // Delete from the bottom up so row indices do not shift under us.
    const sorted = [...rowNumbers].sort((a, b) => b - a);
    const requests = sorted.map((row) => ({
        deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: row - 1, endIndex: row },
        },
    }));

    await sheet.spreadsheets.batchUpdate({
        spreadsheetId: USERS_SPREADSHEET,
        requestBody: { requests },
    });
}

async function applyDiff(sheet, { sheetTitle, dataStartRow, appendRange, rowRangeFn, diff }) {
    if (diff.updates.length) {
        const data = diff.updates.map((u) => ({
            range: rowRangeFn(dataStartRow + u.index),
            values: [u.values],
        }));

        await sheet.spreadsheets.values.batchUpdate({
            spreadsheetId: USERS_SPREADSHEET,
            requestBody: { valueInputOption: 'USER_ENTERED', data },
        });
    }

    if (diff.toAppend.length) {
        await sheet.spreadsheets.values.append({
            spreadsheetId: USERS_SPREADSHEET,
            range: appendRange,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: { values: diff.toAppend },
        });
    }

    if (diff.rowsToDelete.length) {
        const sheetId = await getSheetId(sheet, sheetTitle);
        await deleteRows(sheet, sheetId, diff.rowsToDelete.map((i) => dataStartRow + i));
    }

    return diff.stats;
}

async function runReconciliation(req, res, {
    type, field, range, sheetTitle, dataStartRow, appendRange, rowRangeFn, computeDiff,
}) {
    const { runId } = req.body || {};
    const items = (req.body || {})[field];

    if (!runId || !Array.isArray(items)) {
        return res.status(400).json({ error: `runId and ${field}[] are required` });
    }

    // Safety guard: never wipe the sheet because the source query returned nothing.
    if (!items.length) {
        Reconciliation.create({ runId, type, status: 'failed', error: 'authoritative data set is empty; refusing to reconcile' });
        return res.status(400).json({ error: 'authoritative data set is empty; refusing to reconcile' });
    }

    try {
        const sheet = await GoogleSheet();
        const read = await sheet.spreadsheets.values.get({ spreadsheetId: USERS_SPREADSHEET, range });
        const rows = read.data.values || [];

        const diff = computeDiff(rows, items);
        const stats = await applyDiff(sheet, { sheetTitle, dataStartRow, appendRange, rowRangeFn, diff });

        Reconciliation.create({ runId, type, status: 'completed', stats });

        if (stats.deleted > 0) {
            notifyReconciliationMismatch({ type, stats }).catch(() => { });
            Alert.create({
                alertType: 'reconciliation_mismatch',
                channel: 'email+slack',
                recipient: process.env.TECH_ALERT_EMAIL,
                subject: `Data out of sync (${type})`,
            });
        }

        return res.json({ success: true, runId, stats });
    } catch (error) {
        console.error(`Reconciliation ${type} failed:`, error.message);
        Reconciliation.create({ runId, type, status: 'failed', error: error.message });
        return res.status(500).json({ error: error.message });
    }
}

module.exports = {
    reconcileUsers: (req, res) => runReconciliation(req, res, {
        type: 'users',
        field: 'users',
        range: USERS_RANGE,
        sheetTitle: USERS_SHEET_TITLE,
        dataStartRow: USERS_DATA_START_ROW,
        appendRange: USERS_APPEND_RANGE,
        rowRangeFn: userRowRange,
        computeDiff: computeUsersDiff,
    }),

    reconcileIncidents: (req, res) => runReconciliation(req, res, {
        type: 'incidents',
        field: 'incidents',
        range: INCIDENTS_RANGE,
        sheetTitle: INCIDENTS_SHEET_TITLE,
        dataStartRow: INCIDENTS_DATA_START_ROW,
        appendRange: INCIDENTS_APPEND_RANGE,
        rowRangeFn: incidentRowRange,
        computeDiff: computeIncidentsDiff,
    }),
};
