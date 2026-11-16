# TAI ↔ Google Sheets Sync Monitoring & Reconciliation Admin

> Status: Approved plan (2026-11-16)
> Owner: Daniel E.B

## Context

- **Source of truth**: TAI (`chemchem-fe`) MySQL database `gpswox_web` — tables
  `users`, `incident_reports`, `incident_types`.
- **Pipeline**: Airflow DAGs → sheets Express webhooks → Bull queues → Google Sheets.

| Component | DAG | Webhook | Queue | Google Sheets |
|-----------|-----|---------|-------|---------------|
| Users | `user_summary_to_sheets` (daily 06:00, full batch) | `/webhook/users` | `sheets-processing` | upsert "Data Import" by email |
| Incidents | `incident_log_to_sheets` (daily 06:00, cursor on `incident_reports.id`) | `/webhook/incidents` | `incidents-processing` | append-only "Incident Import" (no incident ID) |

- **Persistence**: SQLite `updates.db` (`user_updates`, `incident_updates`, `api_keys`);
  Redis/Bull; Google service account `config/svc.json`.
- **Alerts today**: Slack only (Node `utils/notifications.js` + Airflow
  `dags/utils/slack_notifications.py`). Brevo email is a TODO stub.

## Goals

1. Monitor success/failure of both sync DAGs and both queue processors.
2. Keep Google Sheets in sync with TAI (source of truth); detect and alert on drift
   (e.g. a record deleted in TAI but still present in Sheets).
3. Let non-technical office admins retry failed queue jobs (idempotently).
4. Escalate unresolved failures to the technical owner via Brevo email + Slack webhook.

## Locked decisions

1. DAG status via **self-report heartbeat** endpoints (DAGs POST start/success/fail).
2. Monitor **only the two sheets-sync DAGs** (`incident_log_to_sheets`, `user_summary_to_sheets`).
3. Out-of-sync detection via **reconciliation DAG by stable ID**.
4. Auth: **email + password with roles** (`office_admin`, `technical`).
5. Escalation target: **Daniel only** via **Brevo email + Slack webhook**.
6. UI: **Vite/React static SPA** served by Express.
7. **DAG failures → technical only** (email + Slack). **Queue failures → retryable by
   office admins** before escalation.
8. UI/UX: **minimalist design** — clean, uncluttered layout; whitespace over chrome;
   restrained color palette with clear status semantics (green/amber/red); plain,
   legible typography; no heavy component libraries or decorative flourish.

## Scope

**In scope**

- Monitor the 2 sync DAGs + 2 Bull queues.
- Reconcile users and incidents.
- Idempotent retries.
- Escalation email (Brevo) + Slack.
- Office-admin SPA dashboard.

**Out of scope**

- Collar/systemd DAGs.
- TAI V2 (`/api/v1/faru/*`) live-sync path.
- Live delete webhook from `chemchem-fe`.
- Google OAuth SSO.
- Bull Board changes.

## Architecture

```
TAI MySQL (source of truth)
        │
        ├── Airflow DAGs (user_summary_to_sheets, incident_log_to_sheets)
        │       ├─ POST /webhook/users ─────┐
        │       ├─ POST /webhook/incidents ─┤
        │       └─ POST /api/dags/heartbeat ┤   (started / succeeded / failed)
        │                                   ▼
        │                          sheets Express app
        │                          ├─ Bull queues ──► Google Sheets
        │                          ├─ SQLite (updates, dag_runs, reconciliations, users, alerts)
        │                          ├─ Brevo email + Slack (escalation)
        │                          └─ SPA (Vite/React) served statically
        │
        └── reconcile_sheets DAG (daily 07:00)
                ├─ POST /api/reconcile/users
                └─ POST /api/reconcile/incidents
```

## Phases

### Phase 1 — Backend foundation (blocks all later phases)

1. Extend `config/database.js`:
   - `users` (`id`, `email UNIQUE`, `password_hash`, `role`, `created_at`).
   - `dag_runs` (`id`, `dag_id`, `run_id`, `status` started/succeeded/failed,
     `started_at`, `finished_at`, `error_message`, `created_at`).
   - `reconciliations` (`id`, `run_id`, `type` users/incidents, `status`,
     `stats_json`, `created_at`).
   - `alerts` (`id`, `alert_type`, `channel`, `recipient`, `subject`, `status`,
     `error`, `created_at`).
   - Add `escalated INTEGER DEFAULT 0` to `user_updates` and `incident_updates`.
2. Add dependencies: `express-session`, `bcrypt`, `better-sqlite3-session-store`;
   Brevo via raw `fetch` (no heavy SDK).
3. Extend `utils/notifications.js`:
   - `sendEmail({ subject, html })` → Brevo v3 `POST /v3/smtp/email`
     (env `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`),
     recipient `TECH_ALERT_EMAIL`.
   - Helpers: `notifyDagFailure`, `notifyDagMissed`, `notifyQueueEscalation`,
     `notifyReconciliationMismatch`; reuse `slackNotify`.
4. Add `middleware/session-auth.js` + `middleware/admin-auth.js` (role guards).
5. Add `scripts/seed-users.js` (one `technical` = Daniel, one `office_admin`).
6. Env vars in `.env` / `.env.example`: `SESSION_SECRET`, `BREVO_API_KEY`,
   `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `TECH_ALERT_EMAIL`.

### Phase 2 — DAG heartbeat & monitoring (depends on 1)

7. `routes/dag.routes.js`: `POST /api/dags/heartbeat` (API-key auth) body
   `{ dagId, runId, status, error?, timestamp? }` upserts `dag_runs`.
   On `failed` → `notifyDagFailure` (email + Slack to Daniel).
8. Staleness watchdog (hourly interval): each monitored DAG with no `succeeded`
   run inside its expected window (26 h for daily 06:00 DAGs) → `notifyDagMissed`.
9. New Airflow util `dags/utils/heartbeat.py`: `post_heartbeat(dag_id, run_id,
   status, error=None)` → `POST {sheets_webhook_url}/api/dags/heartbeat` with
   `X-API-Key`.
10. Update both DAGs: report `started` (start task), `succeeded`
    (`on_success_callback`), `failed` (`on_failure_callback` with exception).
    Replace `notify_slack_on_failure` with heartbeat callback to avoid duplicate
    Slack (backend owns DAG-failure alerting).

### Phase 3 — Idempotency + incident ID (depends on 1)

11. `incident_log_to_sheets.py` `send_to_webhook`: include `incidentId`
    (string of `incident_id`) in the payload.
12. Add "Incident ID" column E to "Incident Import".
13. `queues/incidents.processor.js`: convert append-only → **upsert by incidentId**
    (read `Incident Import!A:E`, map `incidentId → row`, update existing / append
    new, single `batchUpdate`). Retries become idempotent; reconciliation enabled.
    Mirror the user processor's in-batch dedupe (latest wins).
14. `middleware/validate.js` `validateIncidentPayload`: require `incidentId`.

### Phase 4 — Reconciliation (depends on 2 & 3)

15. `routes/reconcile.routes.js` (API-key auth):
    - `POST /api/reconcile/users` body `{ runId, users:[{ email, name, value, date }] }`
      → read "Data Import", delete rows whose email ∉ TAI, update changed,
      backfill missing; persist stats to `reconciliations`.
    - `POST /api/reconcile/incidents` body
      `{ runId, incidents:[{ incidentId, reportDate, type, reportedBy, notes }] }`
      → read "Incident Import!A:E", delete rows with incidentId ∉ TAI, update
      changed, backfill missing; persist stats.
    - Row deletion via `spreadsheets.batchUpdate` `deleteDimension` requests.
16. New DAG `reconcile_sheets.py` (daily ~07:00, after 06:00 syncs): fetch
    authoritative users (reuse `USER_SUMMARY_QUERY`) + incidents
    (`SELECT id, reported_datetime, incident_type_id, reported_by, description
    FROM incident_reports`, optional lookback) → POST both reconcile endpoints →
    heartbeat started/succeeded/failed.
17. `deleted > 0` (or mismatch) → `notifyReconciliationMismatch` (email + Slack
    to Daniel) + dashboard out-of-sync indicator.

### Phase 5 — Admin API (depends on 1–4)

18. `routes/admin-api.routes.js` (session auth):
    - `POST /api/admin/auth/login|logout`, `GET /api/admin/auth/me`.
    - `GET /api/admin/overview` — latest DAG runs, queue success rates
      (`completed / (completed + failed)` over 24 h / 7 d from `user_updates` /
      `incident_updates`), latest reconciliation stats + in-sync flag.
    - `GET /api/admin/dags`, `GET /api/admin/updates?type&status`,
      `GET /api/admin/reconciliations`, `GET /api/admin/alerts`.
    - `POST /api/admin/retry` `{ type, updateId }` — idempotent re-enqueue of one
      update (same `updateId` + payload), status back to `pending`,
      `retry_count++`. If `retry_count >= max_retries` → mark `escalated = 1` +
      `notifyQueueEscalation`. Guard: only when `status = failed` and not escalated.
19. Wire session middleware + admin API into `app.js`; serve built SPA.

### Phase 6 — Frontend SPA (depends on 5)

20. New `sheets/web/` (Vite + React, minimalist design):
    - Login.
    - Overview: DAG status cards, queue success-rate cards, reconciliation
      in-sync indicator.
    - DAG Runs: read-only table.
    - Failures: tabs users/incidents; Retry button (when not escalated);
      "Escalated" badge.
    - Reconciliations: history table.
21. Session cookie (`credentials: 'include'`). Role-based UI: Retry visible to
    `office_admin` + `technical`; escalation details read-only for all.
22. Express serves `web/dist` static + SPA fallback (non-API GET → `index.html`).

### Phase 7 — Verification & hardening

See Verification below; seed users; docs.

## Relevant files

| File | Change |
|------|--------|
| `sheets/config/database.js` | add tables/columns |
| `sheets/package.json` | add deps/scripts |
| `sheets/app.js` | session, watchdog, new routes, SPA static |
| `sheets/utils/notifications.js` | Brevo email + escalation helpers |
| `sheets/middleware/` | `session-auth.js`, `admin-auth.js` (reuse `auth.js`) |
| `sheets/routes/dag.routes.js` | new — heartbeat |
| `sheets/routes/reconcile.routes.js` | new — reconciliation |
| `sheets/routes/admin-api.routes.js` | new — admin API |
| `sheets/queues/incidents.processor.js` | upsert by incidentId |
| `sheets/controllers/user.controller.js`, `incident.controller.js` | retry-by-id |
| `sheets/middleware/validate.js` | require incidentId |
| `sheets/airflow/dags/incident_log_to_sheets.py`, `user_summary_to_sheets.py` | payload incidentId + heartbeat callbacks |
| `sheets/airflow/dags/reconcile_sheets.py`, `dags/utils/heartbeat.py` | new |
| `sheets/web/**` | new Vite/React SPA |
| `sheets/scripts/seed-users.js` | new |
| `sheets/.env` / `.env.example` | Brevo, session, recipient vars |

## Verification

1. `npm run lint` clean; `node scripts/seed-users.js` creates accounts; `npm run dev` boots.
2. Curl heartbeat `failed` → verify `dag_runs` row + email/Slack to Daniel; then
   `status:"succeeded"` clears the overdue flag.
3. Run `incident_log_to_sheets`: verify `incidentId` in the sheet; retrying the same
   incident updates the row (no duplicate).
4. Run `reconcile_sheets`: add a sheet row absent from TAI → verify it's deleted;
   delete an incident in TAI → verify the sheet row is removed + mismatch alert +
   dashboard out-of-sync flag.
5. Force a queue failure → UI shows failed item → office admin clicks Retry →
   success; after `max_retries` → `escalated` + email/Slack to Daniel.
6. Login as both roles; verify role-based UI; session persists across restart.
7. `npm run build` in `web/`; Express serves SPA; deep-link reload works.

## Decisions

- Reconciliation **deletes** stale sheet rows (TAI = source of truth) and logs counts.
- UI/UX: minimalist — minimal chrome, generous whitespace, restrained palette,
  status conveyed by color + a short label (e.g. "In sync" / "Out of sync"),
  one primary action per view.
- Escalation threshold = existing `max_retries` (3) per update record.
- Incident ID column E visible by default (can be hidden via sheet formatting later).
- Heartbeat reuses the existing `sheets_api_key` Airflow Variable.
- Brevo via raw `fetch` to `/v3/smtp/email`; sender + recipient via env.

## Further considerations (defaults chosen)

1. Incident reconciliation defaults to full ID scan; add a lookback window
   (e.g. 90 days) if `incident_reports` is large.
2. Office admins see DAG status read-only; only technical receives DAG-failure alerts.
3. Brevo key / recipient / sender values must be supplied before Phase 1 step 3 is testable.
