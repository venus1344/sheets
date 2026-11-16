const db = require('../config/database');

const Alert = {
    create({ alertType, channel = null, recipient = null, subject = null, status = 'sent', error = null }) {
        const info = db.prepare(`
            INSERT INTO alerts (alert_type, channel, recipient, subject, status, error)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(alertType, channel, recipient, subject, status, error);
        return info.lastInsertRowid;
    },

    recent(limit = 50) {
        return db.prepare('SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?').all(limit);
    },
};

module.exports = Alert;
