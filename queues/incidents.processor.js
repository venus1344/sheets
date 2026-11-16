const incidentsQueue = require('./incidents.queue');
const GoogleSheet = require('../config/google');
const IncidentUpdate = require('../models/incident-update');
const { notifyIncidentFailure } = require('../utils/notifications');

const USERS_SPREADSHEET = process.env.USERS_SPREADSHEET_ID;

// Columns: A=Report Date | B=Type | C=Reported By | D=Notes | E=Incident ID
const INCIDENT_RANGE = 'Incident Import!A2:E';
const INCIDENT_ID_COL = 4; // column E within the A:E range (0-indexed)
const DATA_START_ROW = 2;

async function processIncidentToSheets(payload) {
    const incidentId = String(payload.incidentId ?? '').trim();

    if (!incidentId) {
        throw new Error('incidentId is required');
    }

    const sheet = await GoogleSheet();

    const newRow = [
        payload.reportDate,
        payload.type,
        payload.reportedBy,
        payload.notes || '',
        incidentId,
    ];

    // Find an existing row for this incident so a retry updates it instead of
    // appending a duplicate.
    const result = await sheet.spreadsheets.values.get({
        spreadsheetId: USERS_SPREADSHEET,
        range: INCIDENT_RANGE,
    });

    const rows = result.data.values || [];
    const existingIndex = rows.findIndex(
        (row) => String(row[INCIDENT_ID_COL] ?? '').trim() === incidentId
    );

    if (existingIndex !== -1) {
        const sheetRow = DATA_START_ROW + existingIndex;
        console.log(`Updating existing incident ${incidentId} at row ${sheetRow}`);

        await sheet.spreadsheets.values.update({
            spreadsheetId: USERS_SPREADSHEET,
            range: `Incident Import!A${sheetRow}:E${sheetRow}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [newRow] },
        });

        return { action: 'updated', row: sheetRow, incidentId };
    }

    console.log(`Appending new incident ${incidentId}`);

    await sheet.spreadsheets.values.append({
        spreadsheetId: USERS_SPREADSHEET,
        range: 'Incident Import!A2:E',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
            values: [newRow],
        },
    });

    return { action: 'appended', incidentId };
}

incidentsQueue.process('*', async (job) => {
    const { updateId, payload } = job.data;

    console.log(`Processing incident job ${job.name}:${job.id} for update ${updateId}`);
    IncidentUpdate.setProcessing(updateId);

    try {
        await processIncidentToSheets(payload);
        IncidentUpdate.setCompleted(updateId);
        console.log(`Incident job ${job.id} completed successfully`);
        return { success: true, updateId };
    } catch (error) {
        console.error(`Incident job ${job.id} failed:`, error.message);
        console.error(`Full error:`, error);
        IncidentUpdate.setFailed(updateId, error.message);
        throw error;
    }
});

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

module.exports = { incidentsQueue, processIncidentToSheets };
