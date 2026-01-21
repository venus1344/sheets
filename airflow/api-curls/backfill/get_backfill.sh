#!/bin/bash
# Get Backfill
# Operation: get_backfill
# Method: GET
# Path: /api/v2/backfills/{backfill_id}

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
BACKFILL_ID="${BACKFILL_ID:-<backfill_id>}"

curl -X GET \
  "$AIRFLOW_URL/api/v2/backfills/${BACKFILL_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"