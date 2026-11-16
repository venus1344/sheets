const test = require('node:test');
const assert = require('node:assert');

const { computeUsersDiff, computeIncidentsDiff } = require('../utils/reconcile-diff');

test('computeUsersDiff detects deletions, updates and additions', () => {
    const rows = [
        ['Alice', 'Antipoaching', '5', '2026-11-01', 'alice@x.com'],   // deleted in TAI
        ['Bob', 'Antipoaching', '3', '2026-11-02', 'bob@x.com'],       // value changed
        ['Carol', 'Antipoaching', '7', '2026-11-03', 'carol@x.com'],   // unchanged
    ];

    const users = [
        { name: 'Bob', value: 4, date: '2026-11-02', email: 'bob@x.com' },
        { name: 'Carol', value: 7, date: '2026-11-03', email: 'carol@x.com' },
        { name: 'Dave', value: 1, date: '2026-11-04', email: 'dave@x.com' }, // added
    ];

    const diff = computeUsersDiff(rows, users);

    assert.deepStrictEqual(diff.stats, { checked: 6, added: 1, updated: 1, deleted: 1 });
    assert.deepStrictEqual(diff.rowsToDelete, [0]);
    assert.strictEqual(diff.updates.length, 1);
    assert.strictEqual(diff.updates[0].index, 1);
    assert.strictEqual(diff.toAppend.length, 1);
    assert.strictEqual(diff.toAppend[0][4], 'dave@x.com');
});

test('computeIncidentsDiff ignores legacy rows without an incidentId', () => {
    const rows = [
        ['2026-11-01', 'Sighting', 'ranger1', 'old notes', ''],         // legacy, no id
        ['2026-11-02', 'Incident', 'ranger2', 'notes', '42'],           // deleted in TAI
        ['2026-11-03', 'Sighting', 'ranger3', 'notes', '7'],            // unchanged
    ];

    const incidents = [
        { incidentId: '7', reportDate: '2026-11-03', type: 'Sighting', reportedBy: 'ranger3', notes: 'notes' },
        { incidentId: '8', reportDate: '2026-11-04', type: 'Sighting', reportedBy: 'ranger4', notes: '' }, // added
    ];

    const diff = computeIncidentsDiff(rows, incidents);

    // Legacy row (no id) is neither deleted nor matched; '42' is deleted; '8' is added.
    assert.deepStrictEqual(diff.stats, { checked: 4, added: 1, updated: 0, deleted: 1 });
    assert.deepStrictEqual(diff.rowsToDelete, [1]);
    assert.strictEqual(diff.toAppend.length, 1);
    assert.strictEqual(diff.toAppend[0][4], '8');
});

test('computeIncidentsDiff updates a changed row', () => {
    const rows = [['2026-11-03', 'Sighting', 'ranger3', 'old', '7']];
    const incidents = [{ incidentId: '7', reportDate: '2026-11-03', type: 'Incident', reportedBy: 'ranger3', notes: 'new' }];

    const diff = computeIncidentsDiff(rows, incidents);

    assert.strictEqual(diff.stats.updated, 1);
    assert.strictEqual(diff.updates.length, 1);
    assert.deepStrictEqual(diff.updates[0].values, ['2026-11-03', 'Incident', 'ranger3', 'new', '7']);
});
