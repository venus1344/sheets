const IncidentUpdate = require('../models/incident-update');
const incidentsQueue = require('../queues/incidents.queue');

module.exports.processIncident = async (body) => {
    const updateId = IncidentUpdate.create(body);

    const job = await incidentsQueue.add('incident-log', {
        updateId,
        payload: body
    });

    return {
        success: true,
        id: updateId,
        jobId: job.id,
        message: 'Incident queued for processing'
    };
};

module.exports.retryFailed = async () => {
    const retryable = IncidentUpdate.getRetryable();
    const jobs = [];

    for (const update of retryable) {
        const job = await incidentsQueue.add('incident-retry', {
            updateId: update.id,
            payload: update.payload
        });
        jobs.push({ updateId: update.id, jobId: job.id });
    }

    return {
        queued: jobs.length,
        jobs,
        message: `${jobs.length} incident jobs queued for retry`
    };
};

module.exports.getStatus = () => {
    return IncidentUpdate.getAll();
};
