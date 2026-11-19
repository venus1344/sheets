const test = require('node:test');
const assert = require('node:assert');

const db = require('../config/database');
const UserUpdate = require('../models/user-update');

test('user update retry and escalation flow', (t) => {
    const id = UserUpdate.create({
        email: 'test-retry@example.com',
        name: 'Tester',
        value: 1,
        date: '2026-11-16',
    });

    t.after(() => {
        db.prepare('DELETE FROM user_updates WHERE id = ?').run(id);
    });

    UserUpdate.setFailed(id, 'boom');
    let row = UserUpdate.find(id);

    assert.strictEqual(row.status, 'failed');
    // Bull's internal attempts must not count toward the manual retry budget.
    assert.strictEqual(row.retry_count, 0);

    const counter = UserUpdate.incrementRetry(id);
    assert.strictEqual(counter.retry_count, 1);
    assert.strictEqual(counter.max_retries, 3);

    UserUpdate.markPending(id);
    row = UserUpdate.find(id);
    assert.strictEqual(row.status, 'pending');
    assert.strictEqual(row.error_message, null);

    UserUpdate.setFailed(id, 'boom again');
    UserUpdate.markEscalated(id);
    row = UserUpdate.find(id);
    assert.strictEqual(row.escalated, 1);

    const stats = UserUpdate.stats();
    assert.strictEqual(typeof stats.completed, 'number');
    assert.strictEqual(typeof stats.failed_24h, 'number');
    assert.strictEqual(typeof stats.failed_7d, 'number');
});

test('getRetryable only returns failed, non-escalated updates under the retry limit', (t) => {
    const retryable = UserUpdate.create({ email: 'retryable@example.com', value: 1 });
    const escalated = UserUpdate.create({ email: 'escalated@example.com', value: 2 });

    t.after(() => {
        db.prepare('DELETE FROM user_updates WHERE id IN (?, ?)').run(retryable, escalated);
    });

    UserUpdate.setFailed(retryable, 'x');
    UserUpdate.setFailed(escalated, 'x');
    UserUpdate.markEscalated(escalated);

    const ids = UserUpdate.getRetryable().map((row) => row.id);

    assert.ok(ids.includes(retryable), 'retryable update should be listed');
    assert.ok(!ids.includes(escalated), 'escalated update should not be listed');
});
