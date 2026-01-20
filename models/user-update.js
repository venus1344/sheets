const crypto = require('crypto');
const db = require('../config/database');

const UserUpdate = {
    create(payload) {
        const id = crypto.randomUUID();
        const stmt = db.prepare(`
            INSERT INTO user_updates (id, payload, status)
            VALUES (?, ?, 'pending')
        `);
        stmt.run(id, JSON.stringify(payload));
        return id;
    },

    setProcessing(id) {
        const stmt = db.prepare(`
            UPDATE user_updates
            SET status = 'processing', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        return stmt.run(id);
    },

    setCompleted(id) {
        const stmt = db.prepare(`
            UPDATE user_updates
            SET status = 'completed', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        return stmt.run(id);
    },

    setFailed(id, errorMessage) {
        const stmt = db.prepare(`
            UPDATE user_updates
            SET status = 'failed',
                error_message = ?,
                retry_count = retry_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        return stmt.run(errorMessage, id);
    },

    getRetryable() {
        const stmt = db.prepare(`
            SELECT * FROM user_updates
            WHERE status = 'failed' AND retry_count < max_retries
        `);
        return stmt.all().map(row => ({
            ...row,
            payload: JSON.parse(row.payload)
        }));
    },

    getAll() {
        const stmt = db.prepare('SELECT * FROM user_updates ORDER BY created_at DESC');
        return stmt.all().map(row => ({
            ...row,
            payload: JSON.parse(row.payload)
        }));
    }
};

module.exports = UserUpdate;
