const test = require('node:test');
const assert = require('node:assert');

const { validateIncidentPayload } = require('../middleware/validate');

function runValidation(body) {
    const req = { body: { ...body } };
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.body = data;
        return res;
    };

    let called = false;
    validateIncidentPayload(req, res, () => { called = true; });

    return { req, res, called };
}

test('validateIncidentPayload rejects a payload missing incidentId', () => {
    const { res, called } = runValidation({
        reportDate: '2026-11-16',
        type: 'Sighting',
        reportedBy: 'ranger1',
        notes: 'note',
    });

    assert.strictEqual(called, false);
    assert.strictEqual(res.statusCode, 400);
});

test('validateIncidentPayload accepts and normalizes a numeric incidentId', () => {
    const { req, called } = runValidation({
        reportDate: '2026-11-16',
        type: 'Sighting',
        reportedBy: 'ranger1',
        notes: 'note',
        incidentId: 42,
    });

    assert.strictEqual(called, true);
    assert.strictEqual(req.body.incidentId, '42');
});

test('validateIncidentPayload sanitizes formula injection', () => {
    const { req, called } = runValidation({
        reportDate: '2026-11-16',
        type: 'Sighting',
        reportedBy: '=HYPERLINK("http://evil")',
        notes: 'note',
        incidentId: '7',
    });

    assert.strictEqual(called, true);
    assert.strictEqual(req.body.reportedBy, "'=HYPERLINK(\"http://evil\")");
});
