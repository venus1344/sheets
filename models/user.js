const crypto = require('crypto');
const db = require('../config/database');

const PUBLIC_FIELDS = 'id, email, role, deleted_at, created_at';

const User = {
    findByEmail(email) {
        return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim().toLowerCase());
    },

    findById(id) {
        return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    },

    /** Deleted accounts stay in the list, after the live ones, so they can be restored. */
    list() {
        return db.prepare(
            `SELECT ${PUBLIC_FIELDS} FROM users ORDER BY (deleted_at IS NOT NULL), created_at`
        ).all();
    },

    create({ email, passwordHash, role }) {
        const id = crypto.randomUUID();
        db.prepare('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)')
            .run(id, email, passwordHash, role);
        return db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`).get(id);
    },

    /**
     * Soft delete: stamps `deleted_at` (access is revoked, row is kept) or
     * clears it to restore the account.
     */
    setDeleted(id, deleted) {
        db.prepare(
            deleted
                ? "UPDATE users SET deleted_at = datetime('now') WHERE id = ?"
                : 'UPDATE users SET deleted_at = NULL WHERE id = ?'
        ).run(id);
        return db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`).get(id);
    },

    /** Hard delete, for scripts and test cleanup. Prefer setDeleted in the app. */
    remove(id) {
        return db.prepare('DELETE FROM users WHERE id = ?').run(id).changes;
    },

    /** Guards against deleting the last way into the dashboard. */
    countActiveTechnical() {
        const row = db.prepare(
            "SELECT COUNT(*) AS n FROM users WHERE role = 'technical' AND deleted_at IS NULL"
        ).get();
        return row.n;
    },
};

module.exports = User;
