const test = require('node:test');
const assert = require('node:assert');

// Force the no-op paths so these tests never touch the network or real credentials.
for (const key of Object.keys(process.env)) {
    if (key.startsWith('SMTP_') || key.startsWith('BREVO_') || key.startsWith('SLACK_')) {
        delete process.env[key];
    }
}
delete process.env.TECH_ALERT_EMAIL;

const notifications = require('../utils/notifications');

test('sendEmail resolves false when SMTP is not configured', async () => {
    const ok = await notifications.sendEmail({ subject: 'x' });
    assert.strictEqual(ok, false);
});

test('slackNotify resolves false when the webhook is not set', async () => {
    const ok = await notifications.slackNotify('x');
    assert.strictEqual(ok, false);
});

test('escalation helpers are no-ops when channels are disabled', async () => {
    const results = await Promise.all([
        notifications.notifyDagFailure({ dagId: 'd', runId: 'r', error: 'e' }),
        notifications.notifyDagMissed({ dagId: 'd', expectedWindow: '26h' }),
        notifications.notifyQueueEscalation({ type: 'incidents', updateId: 'u', error: 'e', retryCount: 3 }),
        notifications.notifyReconciliationMismatch({ type: 'users', stats: { deleted: 1 } }),
    ]);

    for (const result of results) {
        assert.deepStrictEqual(result, { email: false, slack: false });
    }
});
