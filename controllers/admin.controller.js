const bcrypt = require('bcryptjs');

const User = require('../models/user');
const Alert = require('../models/alert');
const DagRun = require('../models/dag-run');
const Reconciliation = require('../models/reconciliation');
const UserUpdate = require('../models/user-update');
const IncidentUpdate = require('../models/incident-update');
const usersQueue = require('../queues/sheets.queue');
const incidentsQueue = require('../queues/incidents.queue');
const { notifyQueueEscalation } = require('../utils/notifications');

const TECH_ALERT_EMAIL = process.env.TECH_ALERT_EMAIL;

const parseStats = (row) => (row && row.stats_json ? JSON.parse(row.stats_json) : null);

function inSync(recon) {
    return Boolean(recon && recon.status === 'completed' && (parseStats(recon)?.deleted ?? 0) === 0);
}

module.exports = {
    async login(req, res) {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required' });
        }

        const user = User.findByEmail(email);
        if (!user || !bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        req.session.user = { id: user.id, email: user.email, role: user.role };
        return res.json({ user: req.session.user });
    },

    logout(req, res) {
        req.session.destroy((err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.clearCookie('sheets.sid');
            return res.json({ success: true });
        });
    },

    me(req, res) {
        return res.json({ user: req.session.user || null });
    },

    overview(req, res) {
        const userRecon = Reconciliation.latest('users');
        const incidentRecon = Reconciliation.latest('incidents');

        return res.json({
            queues: {
                users: UserUpdate.stats(),
                incidents: IncidentUpdate.stats(),
            },
            dags: DagRun.recent(10),
            reconciliation: {
                users: userRecon ? { ...userRecon, stats: parseStats(userRecon), inSync: inSync(userRecon) } : null,
                incidents: incidentRecon ? { ...incidentRecon, stats: parseStats(incidentRecon), inSync: inSync(incidentRecon) } : null,
            },
            alerts: Alert.recent(5),
        });
    },

    dags(req, res) {
        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
        return res.json({ dags: DagRun.recent(limit) });
    },

    updates(req, res) {
        const type = req.query.type || 'users';
        const status = req.query.status || null;
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        const offset = parseInt(req.query.offset, 10) || 0;

        const Model = type === 'incidents' ? IncidentUpdate : UserUpdate;
        return res.json({
            type,
            total: Model.count({ status }),
            limit,
            offset,
            updates: Model.list({ status, limit, offset }),
        });
    },

    reconciliations(req, res) {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        return res.json({ reconciliations: Reconciliation.recent(limit) });
    },

    alerts(req, res) {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        return res.json({ alerts: Alert.recent(limit) });
    },

    listUsers(req, res) {
        return res.json({ users: User.list() });
    },

    async createUser(req, res) {
        const { email, password, role } = req.body || {};
        const errors = [];

        if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('a valid email is required');
        }
        if (!password || typeof password !== 'string' || password.length < 8) {
            errors.push('password must be at least 8 characters');
        }
        if (!['office_admin', 'technical'].includes(role)) {
            errors.push('role must be office_admin or technical');
        }

        if (errors.length) {
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (User.findByEmail(normalizedEmail)) {
            return res.status(409).json({ error: 'A user with that email already exists' });
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        const created = User.create({ email: normalizedEmail, passwordHash, role });

        return res.status(201).json({ user: created });
    },

    async retry(req, res) {
        const { type, updateId } = req.body || {};

        if (!type || !updateId) {
            return res.status(400).json({ error: 'type and updateId are required' });
        }
        if (!['users', 'incidents'].includes(type)) {
            return res.status(400).json({ error: 'type must be users or incidents' });
        }

        const Model = type === 'users' ? UserUpdate : IncidentUpdate;
        const Queue = type === 'users' ? usersQueue : incidentsQueue;
        const jobName = type === 'users' ? 'user-retry' : 'incident-retry';

        const update = Model.find(updateId);
        if (!update) return res.status(404).json({ error: 'Update not found' });
        if (update.status !== 'failed') return res.status(400).json({ error: 'Only failed updates can be retried' });
        if (update.escalated) return res.status(400).json({ error: 'Update already escalated' });

        if (update.retry_count >= update.max_retries) {
            Model.markEscalated(updateId);
            Alert.create({
                alertType: 'queue_escalation',
                channel: 'email+slack',
                recipient: TECH_ALERT_EMAIL,
                subject: `${type} retry escalated: ${updateId}`,
            });
            await notifyQueueEscalation({
                type,
                updateId,
                error: update.error_message,
                retryCount: update.retry_count,
            });
            return res.json({ success: true, updateId, escalated: true, retryCount: update.retry_count });
        }

        const counter = Model.incrementRetry(updateId);
        Model.markPending(updateId);

        const job = await Queue.add(jobName, { updateId, payload: update.payload });

        return res.json({ success: true, updateId, jobId: job.id, retryCount: counter.retry_count });
    },
};
