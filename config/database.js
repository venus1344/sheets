const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'updates.db'));

// User updates table (Raw_Export sheet)
db.exec(`
    CREATE TABLE IF NOT EXISTS user_updates (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Incident updates table (Incident_Log sheet)
db.exec(`
    CREATE TABLE IF NOT EXISTS incident_updates (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Admin users for the dashboard (roles: 'office_admin' | 'technical').
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'office_admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// DAG heartbeat runs reported by the Airflow DAGs.
db.exec(`
    CREATE TABLE IF NOT EXISTS dag_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dag_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at DATETIME,
        finished_at DATETIME,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(dag_id, run_id)
    )
`);

// Reconciliation run results (type: 'users' | 'incidents').
db.exec(`
    CREATE TABLE IF NOT EXISTS reconciliations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        stats_json TEXT,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Outbound alert/notification log (channel: 'email' | 'slack').
db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_type TEXT NOT NULL,
        channel TEXT,
        recipient TEXT,
        subject TEXT,
        status TEXT,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Add columns that may be missing on databases created before this migration.
function ensureColumn(table, column, definition) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!columns.some((col) => col.name === column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
}

ensureColumn('user_updates', 'escalated', 'INTEGER DEFAULT 0');
ensureColumn('incident_updates', 'escalated', 'INTEGER DEFAULT 0');

module.exports = db;
