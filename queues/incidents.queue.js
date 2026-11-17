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
    // API pacing is handled by the processor's fixed flush cadence (see
    // incidents.processor.js), so no per-job limiter is needed here.
});

module.exports = incidentsQueue;
