# ADR — TAI ↔ Google Sheets Sync Monitoring & Reconciliation

> Status: Accepted (2026-11-16)
> Owner: Daniel E.B
> Scope: `sheets/` service (Express + Bull + SQLite) and `sheets/airflow/dags/`

This document records the architecture decisions and the operational gotchas
("keep-sakes") discovered while building the sync-monitoring admin.

---

## 1. Decisions

### 1.1 Email via Brevo SMTP relay, not the HTTP API
- `utils/notifications.js` sends mail through `nodemailer` against
  `smtp-relay.brevo.com` using the `SMTP_*` env vars (`SMTP_LOGIN` = auth user,
  `SMTP_API_KEY` = SMTP key/password, `SMTP_PORT=587`, `SMTP_ENCRYPTION=tls`).
- The **From** address must be a sender validated in Brevo. If `SMTP_FROM_EMAIL`
  is unset it falls back to `TECH_ALERT_EMAIL`.
- Verified: SMTP connection + auth succeed; a live send must still pass Brevo's
  sender validation.

### 1.2 Custom SQLite session store instead of `better-sqlite3-session-store`
- `better-sqlite3-session-store` starts a plain `setInterval` **without
  `.unref()`** and cannot be disabled (`{ clear: false }` is coerced back to
  `true` by its `|| true` fallback). This keeps the Node event loop alive and
  hangs any short-lived script that `require()`s it.
- Replaced with `middleware/session-auth.js`'s own `SqliteSessionStore` that
  extends `session.Store` (must be an EventEmitter — `express-session` calls
  `store.on('disconnect')`), backed by the shared SQLite DB, with an
  `.unref()`'d expired-session cleanup timer.

### 1.3 Manual retries are separate from Bull attempts
- `retry_count` on `user_updates` / `incident_updates` counts **manual admin
  retries only**. `setFailed()` does **not** increment it (Bull already retries
  internally via `attempts: 3`).
- `POST /api/admin/retry` increments `retry_count`, re-enqueues the **same
  `updateId` + payload**, and once `retry_count >= max_retries` (default 3) marks
  `escalated=1` and notifies the technical owner (email + Slack).
- The legacy `/webhook/{users,incidents}/retry` endpoints and `getRetryable()`
  now also require `escalated = 0`.

### 1.4 Incident identity
- The incident payload and "Incident Import" now carry `incidentId` (column E).
- `queues/incidents.processor.js` is an **upsert keyed by `incidentId`**
  (read `Incident Import!A2:E`, update matching row, else append) — retries are
  idempotent and produce no duplicate rows.
- **Legacy rows** (columns A–D, no ID) are ignored by both the processor and
  reconciliation — never matched, updated, or deleted. A one-time backfill is
  needed to tag them if they must be reconciled.

### 1.5 Reconciliation
- `POST /api/reconcile/users` and `/api/reconcile/incidents` compare TAI (source
  of truth) against the sheet by email / `incidentId`.
- **Safety guard**: an empty authoritative set is refused (never wipe the sheet
  because the source query returned nothing).
- Deletions use `spreadsheets.batchUpdate` `deleteDimension`, applied bottom-up
  so row indices do not shift; this requires the tab's `sheetId`
  (fetched via `spreadsheets.get`).
- Escalation fires only when `deleted > 0`; results are persisted to
  `reconciliations`.
- Daily DAG `reconcile_sheets` runs 07:00 (after the 06:00 sync DAGs).

### 1.6 DAG monitoring via self-report heartbeat + watchdog
- DAGs POST `started`/`succeeded`/`failed` to `/api/dags/heartbeat`
  (`dags/utils/heartbeat.py`), authenticated with the shared `sheets_api_key`.
- Airflow's old `notify_slack_on_failure` was replaced with the heartbeat
  callbacks so the backend is the single source of DAG-failure alerts
  (email + Slack) — no duplicate Slack messages.
- A staleness watchdog (hourly, 26h window for daily 06:00 DAGs) catches missed
  or crashed runs and alerts once per overdue episode (in-memory dedupe).
- DAG failures go to the technical owner only; office admins see read-only DAG
  status.

### 1.7 Route-scoped JSON body limits
- Webhooks keep a 10kb global JSON limit. `/api/reconcile` is mounted **before**
  the global parser with its own `express.json({ limit: '50mb' })` because it
  receives the full users/incidents data set.

### 1.8 Roles
- `users.role` is `office_admin` or `technical`. Retry is open to both;
  login/overview/dags/updates/reconciliations/alerts to any authenticated user.

### 1.9 Testing
- `node:test` (built-in) + `node:assert` — no extra deps. `npm test` runs
  `test/*.test.js`. Model/DB tests hit the real `updates.db` but use temporary
  rows and clean up via `t.after`.

---

## 2. Operational gotchas (keep-sakes)

1. **Redis is a hard dependency.** Requiring the Bull queues (e.g.
   `controllers/admin.controller.js` or `app.js`) opens Redis connections; with
   Redis down, ioredis retries forever, spamming `Redis connection error:` and
   keeping the process alive. Tests avoid requiring the queues.
2. **`dotenv` loads once per process.** `process.env` changes after `require`
   do not affect modules that captured env at load time (`notifications.js`).
3. **Bull job names don't matter.** The processors use `queue.process('*')`, so
   `user-retry` / `incident-retry` jobs flow through the same handler as
   `user-update` / `incident-log` (they read `job.data.updateId` + `payload`).
4. **Incident rate limit.** The incidents queue is limited to 30 jobs/min; each
   job now does one read + one write (within Google's 60 read + 60 write/min).
5. **Deleting rows needs `sheetId`.** `deleteDimension` cannot use the A1 range
   or tab name; it needs the numeric `sheetId` from `spreadsheets.get`.
6. **Sheet layouts are positional, not header-driven:**
   - `Data Import` (users): header **row 3**, data from **row 4**;
     columns `B…F` = Name, Department, Value, Date, **Email (F)**.
   - `Incident Import`: header **row 1**, data from **row 2**;
     columns `A…E` = Report Date, Type, Reported By, Notes, **Incident ID (E)**.
7. **Formula-injection sanitization** is applied to user-entered strings before
   writing to Sheets (`middleware/validate.js`).
8. **Session cookie**: `sheets.sid`, httpOnly, `sameSite=lax`, `secure` in
   production, 8h TTL; stored in the `sessions` SQLite table (survives restarts).
9. **Watchdog/digest timers are `.unref()`'d** so they never block process exit
   in scripts or graceful shutdown.
10. **ESLint config** now uses `globals.node` and ignores `node_modules/`,
    `airflow/**` (the Airflow Python venv ships JS assets), `dist/`, `web/**`
    (the SPA has its own toolchain), and `coverage/`. Pre-existing lint debt
    remains only in `config/logger.js` (unused `level`) and
    `scripts/api-key.js` (`no-case-declarations`).
11. **`bcryptjs`** is used instead of native `bcrypt` (no node-gyp build step).
12. **Google auth** (`config/google.js`) reads `config/svc.json` via the
    `GoogleAuth` keyfile path; the `GoogleSheet` export had a missing `const`
    (global leak) that is now fixed.
13. **Escalation channels are fire-and-forget** (`Promise.catch(() => {})`) so a
    notification failure can never mask the original job/DAG failure.
14. **Admin SPA** lives in `web/` (Vite + React, no component library). Build with
    `npm --prefix web run build`; Express serves `web/dist` statically with an
    SPA fallback (any non-`/api`, non-`/webhook`, non-`/admin/queues` GET returns
    `index.html`). Dev mode (`npm --prefix web run dev`) proxies `/api` to
    `http://localhost:3001`. Sessions use the `sheets.sid` cookie
    (`credentials: 'include'` on every fetch).

---

## 3. Environment variables

| Variable | Purpose |
|----------|---------|
| `SESSION_SECRET` | Signs the session cookie |
| `SMTP_HOST/PORT/ENCRYPTION/LOGIN/API_KEY` | Brevo SMTP relay |
| `SMTP_SENDER_NAME` / `SMTP_FROM_EMAIL` | From display name / validated sender |
| `TECH_ALERT_EMAIL` | Technical escalation recipient (Daniel) |
| `SLACK_WEBHOOK_URL` | Slack escalation channel |
| `SLACK_FAILURE_DIGEST_MS` | Batch window for incident-failure Slack alerts |
| `DAG_WATCHDOG_INTERVAL_MS` | Optional watchdog interval override (default 1h) |
| `INTERNAL_CLIENT_ID` | Rate-limit bypass secret for Airflow |
| `USERS_SPREADSHEET_ID` | Google Sheet being synced |

Airflow Variables: `sheets_webhook_url`, `sheets_api_key`, `sheets_client_id`
(shared by the sync, heartbeat, and reconciliation DAGs).

---

## 4. Escalation flow summary

| Event | Channel | Audience | Recorded in |
|-------|---------|----------|-------------|
| DAG run failed | email + Slack | technical | `alerts` (`dag_failure`) |
| DAG missed (watchdog) | email + Slack | technical | `alerts` (`dag_missed`) |
| Reconciliation deleted rows | email + Slack | technical | `alerts` (`reconciliation_mismatch`) |
| Queue retry exhausted | email + Slack | technical | `alerts` (`queue_escalation`) |
| Queue job failed | dashboard (retryable) | office admins | `user_updates` / `incident_updates` |
