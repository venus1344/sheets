const test = require('node:test');
const assert = require('node:assert');

const User = require('../models/user');

const uniqueEmail = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

const makeUser = (overrides = {}) => User.create({
    email: overrides.email || uniqueEmail('user'),
    passwordHash: 'x',
    role: overrides.role || 'office_admin',
});

test('new users are not deleted and expose their status publicly', (t) => {
    const user = makeUser();
    t.after(() => User.remove(user.id));

    assert.strictEqual(user.deleted_at, null);
    assert.ok(user.password_hash === undefined, 'list/create must not leak the password hash');
    assert.ok(User.list().some((u) => u.id === user.id));
});

test('soft delete stamps deleted_at and keeps the row', (t) => {
    const user = makeUser();
    t.after(() => User.remove(user.id));

    const deleted = User.setDeleted(user.id, true);
    assert.ok(deleted.deleted_at, 'deleted_at should hold the deletion time');
    assert.ok(User.findById(user.id), 'row should still exist after deletion');

    const restored = User.setDeleted(user.id, false);
    assert.strictEqual(restored.deleted_at, null);
});

test('list puts deleted accounts after the live ones', (t) => {
    const live = makeUser();
    const gone = makeUser();
    t.after(() => {
        User.remove(live.id);
        User.remove(gone.id);
    });

    User.setDeleted(gone.id, true);
    const ids = User.list().map((u) => u.id);

    assert.ok(ids.indexOf(live.id) < ids.indexOf(gone.id));
});

test('countActiveTechnical ignores soft-deleted and non-technical accounts', (t) => {
    const baseline = User.countActiveTechnical();

    const tech = makeUser({ role: 'technical' });
    const admin = makeUser({ role: 'office_admin' });
    t.after(() => {
        User.remove(tech.id);
        User.remove(admin.id);
    });

    assert.strictEqual(User.countActiveTechnical(), baseline + 1, 'office admins must not count');

    User.setDeleted(tech.id, true);
    assert.strictEqual(User.countActiveTechnical(), baseline, 'deleted technical admins must not count');
});

test('remove permanently deletes the account', () => {
    const user = makeUser();

    assert.strictEqual(User.remove(user.id), 1);
    assert.strictEqual(User.findById(user.id), undefined);
    assert.strictEqual(User.remove(user.id), 0, 'deleting twice is a no-op');
});
