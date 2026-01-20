const UserUpdate = require('../models/user-update');
const usersQueue = require('../queues/sheets.queue');

module.exports.processUserUpdate = async (body) => {
    const updateId = UserUpdate.create(body);

    const job = await usersQueue.add('user-update', {
        updateId,
        payload: body
    });

    return {
        success: true,
        id: updateId,
        jobId: job.id,
        message: 'Queued for processing'
    };
};

module.exports.retryFailed = async () => {
    const retryable = UserUpdate.getRetryable();
    const jobs = [];

    for (const update of retryable) {
        const job = await usersQueue.add('user-retry', {
            updateId: update.id,
            payload: update.payload
        });
        jobs.push({ updateId: update.id, jobId: job.id });
    }

    return {
        queued: jobs.length,
        jobs,
        message: `${jobs.length} user jobs queued for retry`
    };
};

module.exports.getStatus = () => {
    return UserUpdate.getAll();
};
