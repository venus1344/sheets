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
});

module.exports = sheetsQueue;
