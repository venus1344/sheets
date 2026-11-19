const test = require('node:test');
const assert = require('node:assert');

const db = require('../config/database');

test('Phase 1 tables exist', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all()
        .map((row) => row.name);

    for (const table of ['users', 'dag_runs', 'reconciliations', 'alerts', 'user_updates', 'incident_updates']) {
        assert.ok(tables.includes(table), `missing table ${table}`);
    }
});

test('update tables have the escalated column', () => {
    const columnsOf = (table) => db.prepare(`PRAGMA table_info(${table})`)
        .all()
        .map((col) => col.name);

    assert.ok(columnsOf('user_updates').includes('escalated'), 'user_updates.escalated missing');
    assert.ok(columnsOf('incident_updates').includes('escalated'), 'incident_updates.escalated missing');
});
