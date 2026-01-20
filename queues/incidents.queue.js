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
    }
});

module.exports = incidentsQueue;
