const incidentsQueue = require('./incidents.queue');
const GoogleSheet = require('../config/google');
const IncidentUpdate = require('../models/incident-update');
const { notifyIncidentFailure } = require('../utils/notifications');

const USERS_SPREADSHEET = process.env.USERS_SPREADSHEET_ID;

// Columns: A=Report Date | B=Type | C=Reported By | D=Notes | E=Incident ID
const INCIDENT_RANGE = 'Incident Import!A2:E';
const INCIDENT_ID_COL = 4; // column E within the A:E range (0-indexed)
const DATA_START_ROW = 2;

// Batch processing: instead of a read + write per incident, accumulate jobs and
// do ONE read + one batchUpdate (updates) + one append (new rows) per batch.
const BATCH_SIZE = 10;
const BATCH_TIMEOUT_MS = 1000;

/**
 * Upsert a batch of incident payloads into the sheet.
 * Dedupes by incidentId (latest wins), reads existing rows once, applies updates
 * in a single batchUpdate and new rows in a single multi-row append.
 */
async function processIncidentBatch(payloads) {
    const byId = new Map();
    for (const p of payloads) {
        const id = String(p.incidentId ?? '').trim();
        if (id) byId.set(id, p);
    }
    const unique = Array.from(byId.values());

    if (!unique.length) return { updated: 0, appended: 0 };

    const sheet = await GoogleSheet();

    const result = await sheet.spreadsheets.values.get({
        spreadsheetId: USERS_SPREADSHEET,
        range: INCIDENT_RANGE,
    });
    const rows = result.data.values || [];

    const idToRow = new Map();
    rows.forEach((row, i) => {
        const id = String(row[INCIDENT_ID_COL] ?? '').trim();
        if (id) idToRow.set(id, DATA_START_ROW + i);
    });

    const updates = [];
    const toAppend = [];

    for (const p of unique) {
        const incidentId = String(p.incidentId ?? '').trim();
        const newRow = [
            p.reportDate,
            p.type,
            p.reportedBy,
            p.notes || '',
            incidentId,
        ];

        if (idToRow.has(incidentId)) {
            const sheetRow = idToRow.get(incidentId);
            updates.push({ range: `Incident Import!A${sheetRow}:E${sheetRow}`, values: [newRow] });
        } else {
            toAppend.push(newRow);
            idToRow.set(incidentId, -1); // guard against duplicate appends in the batch
        }
    }

    if (updates.length) {
        await sheet.spreadsheets.values.batchUpdate({
            spreadsheetId: USERS_SPREADSHEET,
            requestBody: { valueInputOption: 'USER_ENTERED', data: updates },
        });
    }

    if (toAppend.length) {
        await sheet.spreadsheets.values.append({
            spreadsheetId: USERS_SPREADSHEET,
            range: 'Incident Import!A2:E',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: { values: toAppend },
        });
    }

    return { updated: updates.length, appended: toAppend.length };
}

// --- job batching (mirrors the users processor) ---

let batchBuffer = [];
let batchTimer = null;

function flushBatch() {
    if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
    }
    if (!batchBuffer.length) return;

    const entries = batchBuffer.splice(0, batchBuffer.length);
    console.log(`Flushing batch of ${entries.length} incident job(s)`);

    for (const { job } of entries) {
        IncidentUpdate.setProcessing(job.data.updateId);
    }

    processIncidentBatch(entries.map((e) => e.job.data.payload))
        .then((res) => {
            for (const { job, resolve } of entries) {
                IncidentUpdate.setCompleted(job.data.updateId);
                resolve({ success: true, updateId: job.data.updateId, ...res });
            }
        })
        .catch((error) => {
            for (const { job, reject } of entries) {
                IncidentUpdate.setFailed(job.data.updateId, error.message);
                reject(error);
            }
        });
}

function addToBatch(job) {
    return new Promise((resolve, reject) => {
        batchBuffer.push({ job, resolve, reject });

        if (batchBuffer.length >= BATCH_SIZE) {
            flushBatch();
        } else if (!batchTimer) {
            batchTimer = setTimeout(flushBatch, BATCH_TIMEOUT_MS);
            if (typeof batchTimer.unref === 'function') batchTimer.unref();
        }
    });
}

incidentsQueue.process('*', (job) => addToBatch(job));

incidentsQueue.on('completed', (job, result) => {
    console.log(`Incident job ${job.id} completed with result:`, result);
});

incidentsQueue.on('failed', (job, err) => {
    console.error(`Incident job ${job.id} failed with error:`, err.message);

    // Bull emits 'failed' for every attempt. Only alert once the retries are
    // exhausted, otherwise one incident produces an alert per attempt.
    const attempts = job.opts.attempts || 1;

    if (job.attemptsMade < attempts) {
        console.warn(`Incident job ${job.id} will retry (attempt ${job.attemptsMade}/${attempts})`);
        return;
    }

    notifyIncidentFailure({
        jobId: job.id,
        updateId: job.data?.updateId,
        payload: job.data?.payload,
        attempts: job.attemptsMade,
        error: err.message,
    });
});

module.exports = { incidentsQueue, processIncidentBatch };

