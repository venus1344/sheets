const incidentsQueue = require('./incidents.queue');
const GoogleSheet = require('../config/google');
const IncidentUpdate = require('../models/incident-update');
const { notifyIncidentFailure } = require('../utils/notifications');

const USERS_SPREADSHEET = process.env.USERS_SPREADSHEET_ID;

async function processIncidentToSheets(payload) {
    const sheet = await GoogleSheet();

    // Build row from payload
    // Columns: Report Date | Type | Reported By | Notes
    const newRow = [
        payload.reportDate,
        payload.type,
        payload.reportedBy,
        payload.notes || ''
    ];

    console.log(`Appending incident to Incident Import`);

    await sheet.spreadsheets.values.append({
        spreadsheetId: USERS_SPREADSHEET,
        range: 'Incident Import!A2:D',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
            values: [newRow]
        }
    });

    return 'OK';
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
