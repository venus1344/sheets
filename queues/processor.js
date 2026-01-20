const usersQueue = require('./sheets.queue');
const GoogleSheet = require('../config/google');
const UserUpdate = require('../models/user-update');

const USERS_SPREADSHEET = process.env.USERS_SPREADSHEET_ID;

// Columns: B=Name | C=Department | D=Value | E=Date | F=Email
const EMAIL_COL_INDEX = 4; // Column F in B-F range (0-indexed: B=0, C=1, D=2, E=3, F=4)
const DATA_START_ROW = 4;  // Row 4 (row 3 is header)
const DEFAULT_DEPARTMENT = 'Antipoaching';

async function processToGoogleSheets(payload) {
    const sheet = await GoogleSheet();

    // Read columns B-F (Name, Department, Value, Date, Email)
    const result = await sheet.spreadsheets.values.get({
        spreadsheetId: USERS_SPREADSHEET,
        range: 'Raw_Export!B3:F',
    });

    const rows = result.data.values || [];
    const dataRows = rows.slice(1); // Skip header row

    // Find existing row by email (column F = index 4 in B-F range)
    const email = payload.email;
    const existingRowIndex = dataRows.findIndex(row => row[EMAIL_COL_INDEX] === email);

    if (existingRowIndex !== -1) {
        // Update existing row B-F
        const existingRow = dataRows[existingRowIndex];
        const sheetRowNumber = DATA_START_ROW + existingRowIndex;

        const updatedRow = [
            payload.name,
            existingRow[1],      // department - keep from sheet
            payload.value,
            payload.date,
            existingRow[4]       // email - keep from sheet
        ];

        console.log(`Updating row ${sheetRowNumber} for email: ${email}`);

        await sheet.spreadsheets.values.update({
            spreadsheetId: USERS_SPREADSHEET,
            range: `Raw_Export!B${sheetRowNumber}:F${sheetRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [updatedRow]
            }
        });
    } else {
        // Append new row to B-F using update (append always starts at col A)
        const nextRowNumber = DATA_START_ROW + dataRows.length;

        const newRow = [
            payload.name,
            DEFAULT_DEPARTMENT,
            payload.value,
            payload.date,
            payload.email
        ];

        console.log(`Appending new row ${nextRowNumber} for email: ${email}`);

        await sheet.spreadsheets.values.update({
            spreadsheetId: USERS_SPREADSHEET,
            range: `Raw_Export!B${nextRowNumber}:F${nextRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [newRow]
            }
        });
    }

    return 'OK';
}

usersQueue.process('*', async (job) => {
    const { updateId, payload } = job.data;

    console.log(`Processing user job ${job.name}:${job.id} for update ${updateId}`);
    UserUpdate.setProcessing(updateId);

    try {
        await processToGoogleSheets(payload);
        UserUpdate.setCompleted(updateId);
        console.log(`User job ${job.id} completed successfully`);
        return { success: true, updateId };
    } catch (error) {
        console.error(`User job ${job.id} failed:`, error.message);
        console.error(`Full error:`, error);
        UserUpdate.setFailed(updateId, error.message);
        throw error;
    }
});

usersQueue.on('completed', (job, result) => {
    console.log(`User job ${job.id} completed with result:`, result);
});

usersQueue.on('failed', (job, err) => {
    console.error(`User job ${job.id} failed with error:`, err.message);
});

module.exports = { usersQueue, processToGoogleSheets };
