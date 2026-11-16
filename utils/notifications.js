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

const nodemailer = require('nodemailer');

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
        flushNotifications().catch(() => { });
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
        flushNotifications().catch(() => { });
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
 * Brevo SMTP email + technical escalation.
 *
 * Transactional email is sent through Brevo's SMTP relay using the SMTP_*
 * environment variables. The recipient is TECH_ALERT_EMAIL (the technical
 * owner). Like the Slack path, a missing configuration turns the module into a
 * no-op and a failed send is only logged so it can never mask the original
 * failure.
 */

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_ENCRYPTION = (process.env.SMTP_ENCRYPTION || 'tls').toLowerCase();
const SMTP_LOGIN = process.env.SMTP_LOGIN;
const SMTP_API_KEY = process.env.SMTP_API_KEY;
const SMTP_SENDER_NAME = process.env.SMTP_SENDER_NAME || 'Sheets Sync Monitor';
// Sender address: prefer an explicit SMTP_FROM_EMAIL (a sender validated in
// Brevo); otherwise fall back to the technical recipient's address.
const SMTP_FROM_EMAIL =
    process.env.SMTP_FROM_EMAIL || process.env.SMTP_SENDER_EMAIL || process.env.TECH_ALERT_EMAIL;
const TECH_ALERT_EMAIL = process.env.TECH_ALERT_EMAIL;

let transporter = null;
let warnedMissingEmail = false;

function emailEnabled() {
    if (SMTP_HOST && SMTP_LOGIN && SMTP_API_KEY && TECH_ALERT_EMAIL) return true;

    if (!warnedMissingEmail) {
        console.warn(
            'Email notifications disabled — set SMTP_HOST, SMTP_LOGIN, SMTP_API_KEY and TECH_ALERT_EMAIL'
        );
        warnedMissingEmail = true;
    }

    return false;
}

function getTransporter() {
    if (!transporter && emailEnabled()) {
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_ENCRYPTION === 'ssl', // 465 = ssl, 587 = starttls
            auth: {
                user: SMTP_LOGIN,
                pass: SMTP_API_KEY,
            },
        });
    }

    return transporter;
}

/**
 * Send a transactional email through Brevo's SMTP relay.
 * @param {{subject: string, html?: string, text?: string}} params
 * @returns {Promise<boolean>}
 */
async function sendEmail({ subject, html, text }) {
    if (!emailEnabled()) return false;

    try {
        const info = await getTransporter().sendMail({
            from: `"${SMTP_SENDER_NAME}" <${SMTP_FROM_EMAIL}>`,
            to: TECH_ALERT_EMAIL,
            subject,
            html: html || undefined,
            text: text || subject,
        });

        console.log(`Email sent: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('Failed to send email:', error.message);
        return false;
    }
}

/**
 * Send a technical escalation to both Slack and Brevo email.
 * @returns {Promise<{email: boolean, slack: boolean}>}
 */
async function notifyTechnical(subject, message, slackText) {
    const email = await sendEmail({ subject, html: String(message).replace(/\n/g, '<br>') });
    const slack = await slackNotify(slackText || message);
    return { email, slack };
}

/**
 * Legacy wrapper kept for backward compatibility.
 * @param {string|{subject?: string, html?: string}} message
 */
function emailNotify(message) {
    const subject =
        typeof message === 'string' ? message : (message && message.subject) || 'Sheets Sync alert';
    const html =
        typeof message === 'string' ? message : (message && message.html) || subject;
    return sendEmail({ subject, html });
}

/**
 * Alert the technical owner that a DAG reported a failed run.
 */
async function notifyDagFailure({ dagId, runId, error }) {
    const subject = `[Sheets Sync] DAG failed: ${dagId}`;
    const message = `DAG ${dagId} (run ${runId}) failed.\n\nError: ${truncate(error)}`;
    return notifyTechnical(subject, message);
}

/**
 * Alert the technical owner that a DAG missed its expected run window.
 */
async function notifyDagMissed({ dagId, expectedWindow, lastRunAt }) {
    const subject = `[Sheets Sync] DAG missed: ${dagId}`;
    const message =
        `DAG ${dagId} has not reported a successful run within ${expectedWindow}.\n` +
        `Last successful run: ${lastRunAt || 'never'}`;
    return notifyTechnical(subject, message);
}

/**
 * Alert the technical owner that a queue update exhausted its retries.
 */
async function notifyQueueEscalation({ type, updateId, error, retryCount }) {
    const subject = `[Sheets Sync] ${type} retry escalated: ${updateId}`;
    const message =
        `${type} update ${updateId} failed after ${retryCount} retries and has been escalated.\n\n` +
        `Error: ${truncate(error)}`;
    return notifyTechnical(subject, message);
}

/**
 * Alert the technical owner that reconciliation detected data drift.
 */
async function notifyReconciliationMismatch({ type, stats }) {
    const subject = `[Sheets Sync] Data out of sync (${type})`;
    const message =
        `Reconciliation for ${type} found drift:\n` +
        `  checked: ${stats.checked ?? 'n/a'}\n` +
        `  added:   ${stats.added ?? 0}\n` +
        `  updated: ${stats.updated ?? 0}\n` +
        `  deleted: ${stats.deleted ?? 0}`;
    return notifyTechnical(subject, message);
}

module.exports = {
    slackNotify,
    emailNotify,
    sendEmail,
    notifyDagFailure,
    notifyDagMissed,
    notifyQueueEscalation,
    notifyReconciliationMismatch,
    notifyIncidentFailure,
    flushNotifications,
};
