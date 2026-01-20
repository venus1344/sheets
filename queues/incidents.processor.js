const incidentsQueue = require('./incidents.queue');
const GoogleSheet = require('../config/google');
const IncidentUpdate = require('../models/incident-update');

const USERS_SPREADSHEET = process.env.USERS_SPREADSHEET_ID;

async function processIncidentToSheets(payload) {
    const sheet = await GoogleSheet();

    // Build row from payload
    // Columns: Report Date | Type | Category | Severity | Reported By | Team | Location | Notes
    const newRow = [
        payload.reportDate,
        payload.type,
        payload.category,
        payload.severity,
        payload.reportedBy,
        payload.team,
        payload.location,
        payload.notes || ''
    ];

    console.log(`Appending incident to Incident_Log`);

    await sheet.spreadsheets.values.append({
        spreadsheetId: USERS_SPREADSHEET,
        range: 'Incident_Log!A2:H',
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
});

module.exports = { incidentsQueue, processIncidentToSheets };
