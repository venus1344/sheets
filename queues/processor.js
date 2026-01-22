const usersQueue = require('./sheets.queue');
const GoogleSheet = require('../config/google');
const UserUpdate = require('../models/user-update');

const USERS_SPREADSHEET = process.env.USERS_SPREADSHEET_ID;

// Columns: B=Name | C=Department | D=Value | E=Date | F=Email
const EMAIL_COL_INDEX = 4; // Column F in B-F range (0-indexed: B=0, C=1, D=2, E=3, F=4)
const DATA_START_ROW = 4;  // Row 4 (row 3 is header)
const DEFAULT_DEPARTMENT = 'Antipoaching';

// Batch processing configuration
const BATCH_SIZE = 20;           // Max jobs per batch
const BATCH_TIMEOUT_MS = 5000;   // Max wait time to fill batch (5 seconds)

let batchBuffer = [];
let batchTimer = null;

/**
 * Process a batch of payloads in a single API call
 * Deduplicates by email - latest update wins
 */
async function processBatchToGoogleSheets(jobs) {
    if (jobs.length === 0) return [];

    const sheet = await GoogleSheet();

    // Single read to get current sheet data
    const result = await sheet.spreadsheets.values.get({
        spreadsheetId: USERS_SPREADSHEET,
        range: 'Raw_Export!B3:F',
    });

    const rows = result.data.values || [];
    const dataRows = rows.slice(1); // Skip header row

    // Build email-to-row index for fast lookup (from existing sheet data)
    const emailToSheetRow = new Map();
    dataRows.forEach((row, index) => {
        if (row[EMAIL_COL_INDEX]) {
            emailToSheetRow.set(row[EMAIL_COL_INDEX].toLowerCase(), {
                rowIndex: index,
                department: row[1] || DEFAULT_DEPARTMENT,
                existingEmail: row[4]
            });
        }
    });

    // Deduplicate jobs by email - Map keeps latest value for each key
    // Process in order so later jobs overwrite earlier ones for same email
    const dedupedByEmail = new Map();
    for (const job of jobs) {
        const email = job.data.payload.email.toLowerCase();
        dedupedByEmail.set(email, job);
    }

    const uniqueJobs = Array.from(dedupedByEmail.values());
    const duplicateCount = jobs.length - uniqueJobs.length;
    if (duplicateCount > 0) {
        console.log(`Deduplicated ${duplicateCount} duplicate email(s) in batch (kept latest)`);
    }

    // Prepare batch update data using deduplicated jobs
    const updateDataByRange = new Map();  // Prevents duplicate ranges
    let nextNewRow = DATA_START_ROW + dataRows.length;

    for (const job of uniqueJobs) {
        const { payload } = job.data;
        const email = payload.email.toLowerCase();
        const existing = emailToSheetRow.get(email);

        if (existing) {
            // Update existing row
            const sheetRowNumber = DATA_START_ROW + existing.rowIndex;
            const range = `Raw_Export!B${sheetRowNumber}:F${sheetRowNumber}`;

            updateDataByRange.set(range, {
                range,
                values: [[
                    payload.name,
                    existing.department,
                    payload.value,
                    payload.date,
                    existing.existingEmail || payload.email
                ]]
            });
        } else {
            // Check if this email was already added as new row in this batch
            const existingNewRow = emailToSheetRow.get(email);
            if (existingNewRow) {
                // Update the pending new row
                const sheetRowNumber = DATA_START_ROW + existingNewRow.rowIndex;
                const range = `Raw_Export!B${sheetRowNumber}:F${sheetRowNumber}`;

                updateDataByRange.set(range, {
                    range,
                    values: [[
                        payload.name,
                        DEFAULT_DEPARTMENT,
                        payload.value,
                        payload.date,
                        payload.email
                    ]]
                });
            } else {
                // Append new row
                const range = `Raw_Export!B${nextNewRow}:F${nextNewRow}`;

                updateDataByRange.set(range, {
                    range,
                    values: [[
                        payload.name,
                        DEFAULT_DEPARTMENT,
                        payload.value,
                        payload.date,
                        payload.email
                    ]]
                });

                // Track new email to handle duplicates within batch
                emailToSheetRow.set(email, {
                    rowIndex: nextNewRow - DATA_START_ROW,
                    department: DEFAULT_DEPARTMENT,
                    existingEmail: payload.email
                });
                nextNewRow++;
            }
        }
    }

    // Convert to array for API call
    const updateData = Array.from(updateDataByRange.values());

    // Single batch update API call
    if (updateData.length > 0) {
        console.log(`Batch updating ${updateData.length} unique rows (from ${jobs.length} jobs) in single API call`);

        await sheet.spreadsheets.values.batchUpdate({
            spreadsheetId: USERS_SPREADSHEET,
            requestBody: {
                valueInputOption: 'USER_ENTERED',
                data: updateData
            }
        });
    }

    return jobs.map(job => ({ success: true, updateId: job.data.updateId }));
}

/**
 * Flush the batch buffer - process all accumulated jobs
 */
async function flushBatch() {
    if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
    }

    if (batchBuffer.length === 0) return;

    const jobsToProcess = batchBuffer.splice(0, batchBuffer.length);
    console.log(`Flushing batch of ${jobsToProcess.length} jobs`);

    // Mark all as processing
    for (const { job } of jobsToProcess) {
        UserUpdate.setProcessing(job.data.updateId);
    }

    try {
        await processBatchToGoogleSheets(jobsToProcess.map(j => j.job));

        // Mark all as completed
        for (const { job, resolve } of jobsToProcess) {
            UserUpdate.setCompleted(job.data.updateId);
            console.log(`User job ${job.id} completed successfully`);
            resolve({ success: true, updateId: job.data.updateId });
        }
    } catch (error) {
        console.error(`Batch processing failed:`, error.message);

        // Mark all as failed
        for (const { job, reject } of jobsToProcess) {
            UserUpdate.setFailed(job.data.updateId, error.message);
            reject(error);
        }
    }
}

/**
 * Add job to batch buffer
 */
function addToBatch(job) {
    return new Promise((resolve, reject) => {
        batchBuffer.push({ job, resolve, reject });

        // Flush immediately if batch is full
        if (batchBuffer.length >= BATCH_SIZE) {
            flushBatch();
        } else if (!batchTimer) {
            // Start timer to flush partial batch
            batchTimer = setTimeout(flushBatch, BATCH_TIMEOUT_MS);
        }
    });
}

// Process jobs by adding to batch
usersQueue.process('*', async (job) => {
    console.log(`Queuing user job ${job.name}:${job.id} for batch processing`);
    return addToBatch(job);
});

usersQueue.on('completed', (job, result) => {
    console.log(`User job ${job.id} completed with result:`, result);
});

usersQueue.on('failed', (job, err) => {
    console.error(`User job ${job.id} failed with error:`, err.message);
});

// Export for testing
module.exports = { usersQueue, processBatchToGoogleSheets, flushBatch };
