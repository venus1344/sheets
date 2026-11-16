const test = require('node:test');
const assert = require('node:assert');

const { requireAuth, SqliteSessionStore } = require('../middleware/session-auth');

function makeReq(session) {
    return { session };
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
    return res;
}

test('requireAuth returns 401 without a session user', () => {
    const req = makeReq({});
    const res = makeRes();
    let called = false;

    requireAuth(req, res, () => { called = true; });

    assert.strictEqual(called, false);
    assert.strictEqual(res.statusCode, 401);
});

test('requireAuth allows a session with a user', () => {
    const req = makeReq({ user: { email: 'a@b.c', role: 'technical' } });
    const res = makeRes();
    let called = false;

    requireAuth(req, res, () => { called = true; });

    assert.strictEqual(called, true);
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
        await destroySession(store, sid).catch(() => {});
    });

    await setSession(store, sid, { cookie: {}, user: { email: 'x@y.z' } });
    await destroySession(store, sid);

    assert.strictEqual(await getSession(store, sid), null);
});
