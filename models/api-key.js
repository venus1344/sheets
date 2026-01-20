const crypto = require('crypto');
const db = require('../config/database');

function hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

const ApiKey = {
    generate(name) {
        const key = crypto.randomBytes(32).toString('hex');
        const keyHash = hashKey(key);
        const stmt = db.prepare(`
            INSERT INTO api_keys (key, name)
            VALUES (?, ?)
        `);
        stmt.run(keyHash, name);
        return key; // Return plain key only once
    },

    validate(key) {
        const keyHash = hashKey(key);
        const stmt = db.prepare(`
            SELECT * FROM api_keys WHERE key = ? AND active = 1
        `);
        return stmt.get(keyHash);
    },

    revokeById(id) {
        const stmt = db.prepare(`
            UPDATE api_keys SET active = 0 WHERE id = ?
        `);
        return stmt.run(id);
    },

    list() {
        const stmt = db.prepare(`
            SELECT id, name, active, created_at FROM api_keys
        `);
        return stmt.all();
    }
};

module.exports = ApiKey;
