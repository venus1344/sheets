#!/bin/bash
# Pause Backfill
# Operation: pause_backfill
# Method: PUT
# Path: /api/v2/backfills/{backfill_id}/pause

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
BACKFILL_ID="${BACKFILL_ID:-<backfill_id>}"

curl -X PUT \
  "$AIRFLOW_URL/api/v2/backfills/${BACKFILL_ID}/pause" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"