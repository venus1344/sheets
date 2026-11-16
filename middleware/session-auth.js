const session = require('express-session');
const db = require('../config/database');

const SESSION_SECRET = process.env.SESSION_SECRET;

const SESSION_TABLE = 'sessions';

/**
 * Minimal better-sqlite3 backed session store for express-session.
 *
 * Avoids `better-sqlite3-session-store`, whose expired-session cleanup runs a
 * plain `setInterval` without `.unref()` and cannot actually be disabled
 * (`{ clear: false }` is coerced back to `true` by its `|| true` fallback),
 * which keeps Node's event loop alive and hangs short-lived scripts.
 */
class SqliteSessionStore extends session.Store {
    constructor() {
        super();
        db.exec(`
            CREATE TABLE IF NOT EXISTS ${SESSION_TABLE} (
                sid TEXT PRIMARY KEY,
                sess TEXT NOT NULL,
                expire TEXT NOT NULL
            )
        `);
    }

    getExpire(sess) {
        const maxAge = (sess.cookie && sess.cookie.maxAge) ? sess.cookie.maxAge : 86400000;
        return new Date(Date.now() + maxAge).toISOString();
    }

    get(sid, cb) {
        try {
            const row = db.prepare(
                `SELECT sess FROM ${SESSION_TABLE} WHERE sid = ? AND datetime('now') < datetime(expire)`
            ).get(sid);
            cb(null, row ? JSON.parse(row.sess) : null);
        } catch (err) {
            cb(err);
        }
    }

    set(sid, sess, cb = () => { }) {
        try {
            db.prepare(
                `INSERT OR REPLACE INTO ${SESSION_TABLE} (sid, sess, expire) VALUES (?, ?, ?)`
            ).run(sid, JSON.stringify(sess), this.getExpire(sess));
            cb(null);
        } catch (err) {
            cb(err);
        }
    }

    touch(sid, sess, cb = () => { }) {
        try {
            db.prepare(`UPDATE ${SESSION_TABLE} SET expire = ? WHERE sid = ?`)
                .run(this.getExpire(sess), sid);
            cb(null);
        } catch (err) {
            cb(err);
        }
    }

    destroy(sid, cb = () => { }) {
        try {
            db.prepare(`DELETE FROM ${SESSION_TABLE} WHERE sid = ?`).run(sid);
            cb(null);
        } catch (err) {
            cb(err);
        }
    }

    length(cb) {
        try {
            const row = db.prepare(`SELECT COUNT(*) AS n FROM ${SESSION_TABLE}`).get();
            cb(null, row.n);
        } catch (err) {
            cb(err);
        }
    }

    clear(cb = () => { }) {
        try {
            db.prepare(`DELETE FROM ${SESSION_TABLE}`).run();
            cb(null);
        } catch (err) {
            cb(err);
        }
    }
}

// Session middleware backed by the shared SQLite database so sessions survive
// restarts. Only wired into the admin API + SPA routes in app.js.
const sessionMiddleware = session({
    name: 'sheets.sid',
    store: new SqliteSessionStore(),
    secret: SESSION_SECRET || 'dev-insecure-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
    },
});

// Clean up expired session rows without holding the process open.
const cleanupTimer = setInterval(() => {
    try {
        db.prepare(`DELETE FROM ${SESSION_TABLE} WHERE datetime('now') > datetime(expire)`).run();
    } catch (err) {
        console.error('Failed to clean expired sessions:', err.message);
    }
}, 15 * 60 * 1000); // 15 minutes

if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
}

/**
 * Require an authenticated session. Rejects anonymous requests with 401.
 */
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }

    return res.status(401).json({ error: 'Not authenticated' });
}

module.exports = { sessionMiddleware, requireAuth, SqliteSessionStore };
