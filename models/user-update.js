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

    // Mark a job as failed. Manual admin retries are tracked separately in
    // retry_count, so Bull's internal attempts must not inflate it.
    setFailed(id, errorMessage) {
        const stmt = db.prepare(`
            UPDATE user_updates
            SET status = 'failed',
                error_message = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        return stmt.run(errorMessage, id);
    },

    getRetryable() {
        const stmt = db.prepare(`
            SELECT * FROM user_updates
            WHERE status = 'failed' AND escalated = 0 AND retry_count < max_retries
        `);
        return stmt.all().map(row => ({
            ...row,
            payload: JSON.parse(row.payload)
        }));
    },

    find(id) {
        const row = db.prepare('SELECT * FROM user_updates WHERE id = ?').get(id);
        return row ? { ...row, payload: JSON.parse(row.payload) } : null;
    },

    markPending(id) {
        return db.prepare(`
            UPDATE user_updates
            SET status = 'pending', error_message = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(id);
    },

    incrementRetry(id) {
        db.prepare(`
            UPDATE user_updates
            SET retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(id);
        return db.prepare('SELECT retry_count, max_retries FROM user_updates WHERE id = ?').get(id);
    },

    markEscalated(id) {
        return db.prepare(`
            UPDATE user_updates
            SET escalated = 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(id);
    },

    list({ status = null, limit = 50, offset = 0 } = {}) {
        const where = status ? 'WHERE status = ?' : '';
        const params = status ? [status] : [];
        const rows = db.prepare(
            `SELECT * FROM user_updates ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
        ).all(...params, limit, offset);
        return rows.map(row => ({ ...row, payload: JSON.parse(row.payload) }));
    },

    stats() {
        return db.prepare(`
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed,
                COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
                COALESCE(SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END), 0) AS processing,
                COALESCE(SUM(CASE WHEN status = 'failed' AND escalated = 1 THEN 1 ELSE 0 END), 0) AS escalated,
                COALESCE(SUM(CASE WHEN status = 'completed' AND datetime(created_at) >= datetime('now', '-1 day') THEN 1 ELSE 0 END), 0) AS completed_24h,
                COALESCE(SUM(CASE WHEN status = 'failed' AND datetime(created_at) >= datetime('now', '-1 day') THEN 1 ELSE 0 END), 0) AS failed_24h,
                COALESCE(SUM(CASE WHEN status = 'completed' AND datetime(created_at) >= datetime('now', '-7 day') THEN 1 ELSE 0 END), 0) AS completed_7d,
                COALESCE(SUM(CASE WHEN status = 'failed' AND datetime(created_at) >= datetime('now', '-7 day') THEN 1 ELSE 0 END), 0) AS failed_7d
            FROM user_updates
        `).get();
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
