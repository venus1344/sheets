const db = require('../config/database');

const User = {
    findByEmail(email) {
        return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim().toLowerCase());
    },

    findById(id) {
        return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    },
};

module.exports = User;
