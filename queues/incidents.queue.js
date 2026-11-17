const Queue = require('bull');
const { REDIS_URL } = require('../config/redis');

const incidentsQueue = new Queue('incidents-processing', REDIS_URL, {
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000
        },
        removeOnComplete: 100,
        removeOnFail: false
    },
    // Batch processing keeps API calls low (one read + one batchUpdate + one
    // append per batch of ~10), so the per-job limiter can be raised safely.
    // ~120 jobs/min ≈ 12 batches/min ≈ 36 Sheets API calls/min, under Google's 60/min cap.
    limiter: {
        max: 120,
        duration: 60000
    }
});

module.exports = incidentsQueue;
