# Deployment Guide — Sync Monitoring & Reconciliation Admin

> Applies to the `sheets/` service (`feat/sync-monitoring-admin`) and its Airflow DAGs.
> See also: [`adr-sync-monitoring.md`](./adr-sync-monitoring.md) and
> [`sync-monitoring-admin-plan.md`](./sync-monitoring-admin-plan.md).

This feature spans four places: the **sheets Node service**, the **SPA build**,
**Airflow**, and a **one-time Google Sheet change**.

---

## 1. Prerequisites

- **Redis** running and reachable (`REDIS_URL`, default `redis://localhost:6379`).
  The Bull queues and the admin "Retry" action require it.
- **Google service account** `config/svc.json` present on the server (gitignored).
- **Brevo SMTP** reachable, and the **From address validated** in the Brevo account.
- **Node.js 20+/22** (native `better-sqlite3` build; prebuilt binary or build toolchain).
- **HTTPS termination** at the reverse proxy (nginx/Apache) — required for secure session cookies in production (see §7).
- At least one **seeded dashboard user** (§3.6).

---

## 2. Server `.env` (not committed — set manually)

| Variable | Notes |
|----------|-------|
| `PORT` | Server port (dev uses `3001`) |
| `USERS_SPREADSHEET_ID` | Target Google Sheet ID |
| `REDIS_URL` | Redis connection string |
| `SESSION_SECRET` | Long random string — **required**; otherwise an insecure dev default is used |
| `NODE_ENV` | Set `production` to enable secure cookies |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_ENCRYPTION` / `SMTP_LOGIN` / `SMTP_API_KEY` | Brevo SMTP relay |
| `SMTP_SENDER_NAME` / `SMTP_FROM_EMAIL` | From display name / validated sender |
| `TECH_ALERT_EMAIL` | Technical escalation recipient |
| `SLACK_WEBHOOK_URL` | Slack escalation channel (optional) |
| `SLACK_FAILURE_DIGEST_MS` | Incident-failure Slack batching window (optional) |
| `INTERNAL_CLIENT_ID` | Rate-limit bypass secret for Airflow (optional) |

Reference: [`.env.example`](../.env.example).

---

## 3. Backend deployment (do this **before** Airflow)

1. **Fetch the code**
   ```bash
   git fetch && git checkout <branch> && git pull   # or merge the PR and deploy master
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
   Adds `express-session`, `bcryptjs`, `nodemailer`; `better-sqlite3-session-store` was removed.
3. **Back up the database** (the migration alters `updates.db` in place):
   ```bash
   cp updates.db updates.db.bak-$(date +%Y%m%d)
   ```
4. **Migrate** — automatic on process start (`CREATE TABLE IF NOT EXISTS`; a guarded
   `ALTER TABLE … ADD COLUMN escalated`; the `sessions` table is created on first use).
   No manual migration step.
5. **Build the SPA** (`web/dist` is gitignored, so build on the server or in CI):
   ```bash
   npm --prefix web install
   npm --prefix web run build
   ```
   If `web/dist/index.html` is missing, Express logs
   `Admin SPA not built` and `/` serves nothing (the API still works).
6. **Seed dashboard users** (prompts for the password — hidden):
   ```bash
   node scripts/seed-users.js you@example.com technical
   node scripts/seed-users.js officeadmin@example.com office_admin
   ```
   Additional users can be added later from the **Users** tab by a technical admin.
7. **Restart the service** (pm2 / systemd / however it runs today).
8. **Smoke test**:
   ```bash
   curl -s http://localhost:$PORT/health   # -> OK
   ```

---

## 4. Airflow deployment

1. Copy these files into the Airflow `dags/` folder:
   - `airflow/dags/incident_log_to_sheets.py`
   - `airflow/dags/user_summary_to_sheets.py`
   - `airflow/dags/reconcile_sheets.py`
   - `airflow/dags/utils/heartbeat.py`
2. Ensure these Airflow **Variables** exist (reused by heartbeat + reconcile):
   - `sheets_webhook_url` → the sheets server URL (e.g. `https://sheets.example.com`)
   - `sheets_api_key` → a valid `api_keys` entry (created via `node scripts/api-key.js generate`)
   - `sheets_client_id` → optional rate-limit bypass secret
3. Confirm Airflow **workers can reach** `sheets_webhook_url`.
4. Enable the new **`reconcile_sheets`** DAG (daily at 07:00, after the 06:00 sync DAGs).
5. Both sync DAGs and the reconcile DAG are scoped to **institution_id = 7**.

---

## 5. Google Sheet (one-time)

- Add a **"Incident ID"** header to cell **E1** of the **"Incident Import"** tab.
  The code reads/writes column E by index, so it works without the header, but it is clearer.
  Optionally hide column E if office users shouldn't see raw IDs.
- Existing rows with only columns A–D (no ID) are **ignored** by reconciliation — they are never
  matched, updated, or deleted.

---

## 6. Rollout order

1. Back up `updates.db`.
2. Deploy the backend (§3): install → build SPA → restart → seed users.
3. Verify `/health`, login, and that the SPA loads.
4. Deploy the Airflow DAGs + variables (§4).
5. **Trigger `user_summary_to_sheets` and `incident_log_to_sheets` once manually** so a
   `succeeded` heartbeat is recorded (this clears the watchdog's "overdue" state).
6. Run `reconcile_sheets` once manually and review the added/updated/deleted counts.
7. Watch the dashboard **Overview** and **Alerts**.

---

## 7. Post-deploy verification checklist

- [ ] `GET /health` returns `OK`.
- [ ] Login works for a `technical` user and an `office_admin` user.
- [ ] DAG heartbeat rows appear (Overview/DAG Runs); watchdog no longer reports overdue.
- [ ] Retry an intentionally-failed queue job from the **Failures** tab (requires Redis).
- [ ] Escalation email (Brevo) + Slack reach `TECH_ALERT_EMAIL`.
- [ ] Reconciliation shows **In sync**; deleted counts are expected (not a surprise).
- [ ] Technical user sees the **Users** tab; office admin does not.

---

## 8. Risks & gotchas specific to this change

1. **Watchdog alert burst on fresh deploy** — mitigated: the watchdog now skips a DAG until it has
   reported at least one run. Still, trigger the DAGs after deploy so `succeeded` is recorded.
2. **Redis down = broken retries** — ensure the Redis service is running.
3. **Secure cookies require HTTPS** — with `NODE_ENV=production` the session cookie is `secure`, so
   login will not persist over plain HTTP. Terminate TLS at the proxy (`trust proxy` is already set),
   or do not set `NODE_ENV=production` (not recommended).
4. **First reconcile can delete unexpected rows** if non-institution-7 incident rows with an
   `incidentId` already exist (only possible in the window between the upsert change and the
   institution filter). Deploy the whole branch together to avoid this.
5. **Incident backfill is slower** — the processor now does one read + one write per incident,
   capped at 30 jobs/min by the queue limiter.
6. **Migration is additive** → **rollback is safe**: reverting to the previous code still works
   against the migrated schema (old code ignores the new tables/column).

---

## 9. Rollback

1. Redeploy the previous commit/branch and restart the service.
2. The DB migration is additive, so no down-migration is required for the app to start.
3. Optionally restore `updates.db` from the backup taken in §3.3.
4. Leave the new Airflow DAGs in place or disable `reconcile_sheets`; the previous sync DAGs
   continue to work (they no longer call the old Slack callback, but still POST to the webhooks).

---

## 10. CI/CD shape

- **Build gate**: `npm ci` (root) → `npm --prefix web ci && npm --prefix web run build` →
  `npm test` (node:test suite) → `npm run lint`.
- **Ship**: rsync / `git pull` to the server → `npm ci --omit=dev` for runtime + the prebuilt
  `web/dist` → restart the service.
- **Airflow**: sync the DAG files separately (git pull on the Airflow node or your DAG-sync mechanism).
