const crypto = require('crypto');
const db = require('../config/database');

const PUBLIC_FIELDS = 'id, email, role, created_at';

const User = {
    findByEmail(email) {
        return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim().toLowerCase());
    },

    findById(id) {
        return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    },

    list() {
        return db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users ORDER BY created_at`).all();
    },

    create({ email, passwordHash, role }) {
        const id = crypto.randomUUID();
        db.prepare('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)')
            .run(id, email, passwordHash, role);
        return db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`).get(id);
    },
};

module.exports = User;
