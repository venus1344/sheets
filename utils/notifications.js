/**
 * Slack notifications for the Sheets webhook.
 *
 * Mirrors airflow/dags/utils/slack_notifications.py: a red failure alert posted
 * to the incoming webhook in SLACK_WEBHOOK_URL. When that variable is unset the
 * module is a no-op, and a failure to notify is only logged so it can never mask
 * the original job failure.
 *
 * Incident failures are batched into a single message so a burst (for example a
 * DNS outage failing every queued job) produces one alert, not one per incident.
 * Set SLACK_FAILURE_DIGEST_MS=0 to send each failure immediately.
 */

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

const DIGEST_MS = Math.max(0, Number(process.env.SLACK_FAILURE_DIGEST_MS ?? 30000));
const MAX_SAMPLES = 10;

let warnedMissingWebhook = false;
let pendingFailures = [];
let flushTimer = null;

function truncate(value, max = 500) {
    const text = String(value ?? '');
    return text.length > max ? `${text.slice(0, max)}…` : text;
}

function isEnabled() {
    if (SLACK_WEBHOOK_URL) return true;

    if (!warnedMissingWebhook) {
        console.warn('SLACK_WEBHOOK_URL not set — Slack notifications are disabled');
        warnedMissingWebhook = true;
    }

    return false;
}

async function postToSlack(payload) {
    if (!SLACK_WEBHOOK_URL) return false;

    try {
        const response = await fetch(SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const body = await response.text();
            console.error(`Slack notification rejected (${response.status}): ${truncate(body, 200)}`);
            return false;
        }

        return true;
    } catch (error) {
        // Never let notification problems mask the original failure.
        console.error('Failed to send Slack notification:', error.message);
        return false;
    }
}

function buildIncidentFailureBlocks(failures) {
    const count = failures.length;
    const first = failures[0] || {};
    const payload = first.payload || {};

    const blocks = [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: count === 1
                    ? ':red_circle: Incident import failure'
                    : `:red_circle: ${count} incident import failures`,
            },
        },
        {
            type: 'section',
            fields: [
                { type: 'mrkdwn', text: `*Report date:*\n${payload.reportDate || 'unknown'}` },
                { type: 'mrkdwn', text: `*Incident type:*\n${payload.type || 'unknown'}` },
                { type: 'mrkdwn', text: `*Reported by:*\n${payload.reportedBy || 'unknown'}` },
                { type: 'mrkdwn', text: `*Attempts:*\n${first.attempts ?? 'unknown'}` },
                { type: 'mrkdwn', text: `*Update ID:*\n${first.updateId || 'n/a'}` },
                { type: 'mrkdwn', text: `*Job ID:*\n${first.jobId || 'n/a'}` },
            ],
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Error:*\n\`\`\`${truncate(first.error)}\`\`\``,
            },
        },
    ];

    if (count > 1) {
        const lines = failures.slice(0, MAX_SAMPLES).map((failure) => {
            const incident = failure.payload || {};
            return `• ${incident.reportDate || 'unknown'} — ${incident.type || 'unknown'} — `
                + `${incident.reportedBy || 'unknown'} — \`${truncate(failure.error, 140)}\``;
        });

        blocks.push({
            type: 'section',
            text: { type: 'mrkdwn', text: `*Failed incidents:*\n${lines.join('\n')}` },
        });

        if (count > MAX_SAMPLES) {
            blocks.push({
                type: 'context',
                elements: [{ type: 'mrkdwn', text: `…and ${count - MAX_SAMPLES} more.` }],
            });
        }
    }

    blocks.push({
        type: 'context',
        elements: [{
            type: 'mrkdwn',
            text: 'Retry via `POST /webhook/incidents/retry` or Bull Board → `incidents-processing` → Failed.',
        }],
    });

    return blocks;
}

function scheduleFlush() {
    if (flushTimer) return;

    flushTimer = setTimeout(() => {
        flushTimer = null;
        flushNotifications().catch(() => {});
    }, DIGEST_MS);

    if (typeof flushTimer.unref === 'function') {
        flushTimer.unref();
    }
}

/**
 * Record a failed incident import and alert Slack once retries are exhausted.
 *
 * @param {{jobId?: string|number, updateId?: string, payload?: object, attempts?: number, error?: string}} failure
 */
function notifyIncidentFailure(failure) {
    if (!isEnabled()) return;

    pendingFailures.push(failure);

    if (DIGEST_MS === 0) {
        flushNotifications().catch(() => {});
        return;
    }

    scheduleFlush();
}

/**
 * Send any buffered failures now. Safe to call when nothing is pending, and
 * called on shutdown so a restart does not drop a queued alert.
 */
async function flushNotifications() {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }

    if (!pendingFailures.length) return;

    const failures = pendingFailures;
    pendingFailures = [];

    const sent = await postToSlack({
        attachments: [{ color: '#FF0000', blocks: buildIncidentFailureBlocks(failures) }],
    });

    if (sent) {
        console.log('Slack failure notification sent');
    }
}

/**
 * Post a message to Slack. Accepts plain text or a full payload object.
 * @param {string|object} message
 */
async function slackNotify(message) {
    if (!isEnabled()) return false;

    return postToSlack(typeof message === 'string' ? { text: message } : message);
}

/**
 * TO-DO: Notify users via email.
 * - Get list of users to be notified from the .env variables
 * - Implement notifications via Brevo email service
 * - 
 * @param {*} message 
 */
function emailNotify(message) {

}

module.exports = {
    slackNotify,
    emailNotify,
    notifyIncidentFailure,
    flushNotifications,
};
