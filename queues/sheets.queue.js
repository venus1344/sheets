const Queue = require('bull');
const { REDIS_URL } = require('../config/redis');

const sheetsQueue = new Queue('sheets-processing', REDIS_URL, {
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000
        },
        removeOnComplete: 100,
        removeOnFail: false
    }
    // Note: Rate limiting now handled by batch processing (20 jobs = 2 API calls)
    // Batches flush every 5 seconds or when 20 jobs accumulate
});

module.exports = sheetsQueue;
