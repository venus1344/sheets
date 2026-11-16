const db = require('../config/database');

const DagRun = {
    /**
     * Insert or update a heartbeat record for a (dag_id, run_id) pair.
     * @param {{dagId: string, runId: string, status: 'started'|'succeeded'|'failed', error?: string|null, timestamp?: string}} params
     */
    upsert({ dagId, runId, status, error = null, timestamp = null }) {
        const now = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

        db.prepare(`
            INSERT INTO dag_runs (dag_id, run_id, status, started_at, finished_at, error_message, created_at)
            VALUES (@dagId, @runId, @status, @startedAt, @finishedAt, @error, @now)
            ON CONFLICT(dag_id, run_id) DO UPDATE SET
                status = @status,
                started_at = COALESCE(dag_runs.started_at, @startedAt),
                finished_at = @finishedAt,
                error_message = @error
        `).run({
            dagId,
            runId,
            status,
            now,
            startedAt: status === 'started' ? now : null,
            finishedAt: status === 'started' ? null : now,
            error: error || null,
        });

        return DagRun.find(dagId, runId);
    },

    find(dagId, runId) {
        return db.prepare('SELECT * FROM dag_runs WHERE dag_id = ? AND run_id = ?').get(dagId, runId);
    },

    latest(dagId) {
        return db.prepare('SELECT * FROM dag_runs WHERE dag_id = ? ORDER BY created_at DESC LIMIT 1').get(dagId);
    },

    lastSucceeded(dagId) {
        return db.prepare(
            "SELECT * FROM dag_runs WHERE dag_id = ? AND status = 'succeeded' ORDER BY finished_at DESC LIMIT 1"
        ).get(dagId);
    },

    recent(limit = 20) {
        return db.prepare('SELECT * FROM dag_runs ORDER BY created_at DESC LIMIT ?').all(limit);
    },
};

module.exports = DagRun;
