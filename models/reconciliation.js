const db = require('../config/database');

const Reconciliation = {
    create({ runId, type, status, stats = null, error = null }) {
        const info = db.prepare(`
            INSERT INTO reconciliations (run_id, type, status, stats_json, error_message)
            VALUES (?, ?, ?, ?, ?)
        `).run(runId, type, status, stats ? JSON.stringify(stats) : null, error);

        return info.lastInsertRowid;
    },

    latest(type) {
        return db.prepare('SELECT * FROM reconciliations WHERE type = ? ORDER BY created_at DESC LIMIT 1').get(type);
    },

    recent(limit = 20) {
        return db.prepare('SELECT * FROM reconciliations ORDER BY created_at DESC LIMIT ?').all(limit);
    },
};

module.exports = Reconciliation;
