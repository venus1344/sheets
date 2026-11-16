const DagRun = require('../models/dag-run');
const Alert = require('../models/alert');
const { notifyDagMissed } = require('./notifications');

// Monitored DAGs and how long they may stay silent after their scheduled run
// before being considered missed. Both run daily at 06:00, so 26h allows for a
// late run plus retries.
const MONITORED_DAGS = [
    { dagId: 'incident_log_to_sheets', windowMs: 26 * 60 * 60 * 1000 },
    { dagId: 'user_summary_to_sheets', windowMs: 26 * 60 * 60 * 1000 },
];

const CHECK_INTERVAL_MS = Number(process.env.DAG_WATCHDOG_INTERVAL_MS) || 60 * 60 * 1000; // hourly

const alerted = new Set();

/**
 * Check every monitored DAG once. A DAG whose last successful run is older than
 * its window is alerted once, then not re-alerted until it recovers.
 */
function checkOnce() {
    const now = Date.now();

    for (const { dagId, windowMs } of MONITORED_DAGS) {
        const last = DagRun.lastSucceeded(dagId);
        const lastRunAt = last ? last.finished_at : null;
        const age = lastRunAt ? now - Date.parse(lastRunAt) : Infinity;

        if (age > windowMs) {
            if (!alerted.has(dagId)) {
                alerted.add(dagId);
                console.warn(`DAG ${dagId} is overdue (last success: ${lastRunAt || 'never'})`);
                notifyDagMissed({
                    dagId,
                    expectedWindow: `${Math.round(windowMs / 3600000)}h`,
                    lastRunAt,
                }).catch(() => {});
                Alert.create({
                    alertType: 'dag_missed',
                    channel: 'email+slack',
                    recipient: process.env.TECH_ALERT_EMAIL,
                    subject: `DAG missed: ${dagId}`,
                });
            }
        } else {
            alerted.delete(dagId);
        }
    }
}

/**
 * Start the watchdog. The timers are unref'd so they never keep a short-lived
 * process (e.g. a script or test) alive; the server keeps itself running anyway.
 */
function startWatchdog() {
    const initial = setTimeout(checkOnce, 10_000);
    if (typeof initial.unref === 'function') initial.unref();

    const timer = setInterval(checkOnce, CHECK_INTERVAL_MS);
    if (typeof timer.unref === 'function') timer.unref();

    return { stop: () => clearInterval(timer) };
}

module.exports = { startWatchdog, checkOnce };
