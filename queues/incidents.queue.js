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
    // Rate limit: 30 jobs per minute (each job = 1 API call: append)
    // Google Sheets API limit: 60 requests/min per user
    limiter: {
        max: 30,
        duration: 60000  // 1 minute in ms
    }
});

module.exports = incidentsQueue;
