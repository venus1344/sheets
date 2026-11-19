const express = require('express');
const router = express.Router();

const { apiKeyAuth } = require('../middleware/auth');
const DagRun = require('../models/dag-run');
const Alert = require('../models/alert');
const { notifyDagFailure } = require('../utils/notifications');

const VALID_STATUSES = ['started', 'succeeded', 'failed'];

router.use(apiKeyAuth);

/**
 * POST /api/dags/heartbeat
 * Body: { dagId, runId, status, error?, timestamp? }
 *
 * Called by the Airflow DAGs to report run start/success/failure. A failed run
 * escalates to the technical owner (email + Slack) without blocking the DAG.
 */
router.post('/heartbeat', async (req, res) => {
    const { dagId, runId, status, error, timestamp } = req.body || {};

    if (!dagId || !runId || !status) {
        return res.status(400).json({ error: 'dagId, runId and status are required' });
    }

    if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const run = DagRun.upsert({ dagId, runId, status, error, timestamp });

    if (status === 'failed') {
        notifyDagFailure({ dagId, runId, error }).catch(() => {});
        Alert.create({
            alertType: 'dag_failure',
            channel: 'email+slack',
            recipient: process.env.TECH_ALERT_EMAIL,
            subject: `DAG failed: ${dagId}`,
        });
    }

    return res.json({ success: true, run });
});

module.exports = router;
