const test = require('node:test');
const assert = require('node:assert');

const { requireRole } = require('../middleware/admin-auth');

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

test('requireRole returns 401 when unauthenticated', () => {
    const middleware = requireRole('technical');
    const req = makeReq({});
    const res = makeRes();
    let called = false;

    middleware(req, res, () => { called = true; });

    assert.strictEqual(called, false);
    assert.strictEqual(res.statusCode, 401);
});

test('requireRole returns 403 for a non-matching role', () => {
    const middleware = requireRole('technical');
    const req = makeReq({ user: { role: 'office_admin' } });
    const res = makeRes();
    let called = false;

    middleware(req, res, () => { called = true; });

    assert.strictEqual(called, false);
    assert.strictEqual(res.statusCode, 403);
});

test('requireRole allows a matching role through', () => {
    const middleware = requireRole('technical');
    const req = makeReq({ user: { role: 'technical' } });
    const res = makeRes();
    let called = false;

    middleware(req, res, () => { called = true; });

    assert.strictEqual(called, true);
});

test('requireRole with no roles allows any authenticated user', () => {
    const middleware = requireRole();
    const req = makeReq({ user: { role: 'office_admin' } });
    const res = makeRes();
    let called = false;

    middleware(req, res, () => { called = true; });

    assert.strictEqual(called, true);
});
