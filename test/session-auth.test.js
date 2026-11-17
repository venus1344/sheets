const test = require('node:test');
const assert = require('node:assert');

const User = require('../models/user');
const { requireAuth, SqliteSessionStore } = require('../middleware/session-auth');
function makeReq(session) {
    const req = { session, destroyed: false };
    req.session.destroy = (cb) => {
        req.destroyed = true;
        if (cb) cb();
    };
    return req;
}

function makeRes() {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (body) => {
        res.body = body;
        return res;
    };
    res.clearCookie = () => res;
    return res;
}

function makeUser(overrides = {}) {
    const email = overrides.email || `auth-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const user = User.create({ email, passwordHash: 'x', role: overrides.role || 'technical' });
    if (overrides.deleted) User.setDeleted(user.id, true);
    return user;
}

test('requireAuth returns 401 without a session user', () => {
    const req = makeReq({});
    const res = makeRes();
    let called = false;

    requireAuth(req, res, () => { called = true; });

    assert.strictEqual(called, false);
    assert.strictEqual(res.statusCode, 401);
});

test('requireAuth allows a session with an active user', (t) => {
    const user = makeUser();
    t.after(() => User.remove(user.id));

    const req = makeReq({ user: { id: user.id, email: user.email, role: user.role } });
    const res = makeRes();
    let called = false;

    requireAuth(req, res, () => { called = true; });

    assert.strictEqual(called, true);
    assert.strictEqual(req.destroyed, false);
});

test('requireAuth revokes a session whose account was soft-deleted', (t) => {
    const user = makeUser({ deleted: true });
    t.after(() => User.remove(user.id));

    const req = makeReq({ user: { id: user.id, email: user.email, role: user.role } });
    const res = makeRes();
    let called = false;

    requireAuth(req, res, () => { called = true; });

    assert.strictEqual(called, false);
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(req.destroyed, true, 'stale session should be destroyed');
});

test('requireAuth revokes a session whose account was deleted', () => {
    const missingId = 'does-not-exist';
    const req = makeReq({ user: { id: missingId, email: 'gone@example.com', role: 'technical' } });
    const res = makeRes();
    let called = false;

    requireAuth(req, res, () => { called = true; });

    assert.strictEqual(called, false);
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(req.destroyed, true);
});

const setSession = (store, sid, sess) => new Promise((resolve, reject) => {
    store.set(sid, sess, (err) => (err ? reject(err) : resolve()));
});

const getSession = (store, sid) => new Promise((resolve, reject) => {
    store.get(sid, (err, sess) => (err ? reject(err) : resolve(sess)));
});

const destroySession = (store, sid) => new Promise((resolve, reject) => {
    store.destroy(sid, (err) => (err ? reject(err) : resolve()));
});

test('session store persists and retrieves a session', async (t) => {
    const store = new SqliteSessionStore();
    const sid = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const session = { cookie: { maxAge: 60_000 }, user: { email: 'a@b.c', role: 'technical' } };

    t.after(async () => {
        await destroySession(store, sid);
    });

    await setSession(store, sid, session);
    const loaded = await getSession(store, sid);

    assert.ok(loaded, 'session should be retrievable');
    assert.deepStrictEqual(loaded.user, session.user);
});

test('session store returns null for a missing session', async () => {
    const store = new SqliteSessionStore();
    const loaded = await getSession(store, 'does-not-exist');
    assert.strictEqual(loaded, null);
});

test('session store removes sessions on destroy', async (t) => {
    const store = new SqliteSessionStore();
    const sid = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    t.after(async () => {
        await destroySession(store, sid).catch(() => { });
    });

    await setSession(store, sid, { cookie: {}, user: { email: 'x@y.z' } });
    await destroySession(store, sid);

    assert.strictEqual(await getSession(store, sid), null);
});
