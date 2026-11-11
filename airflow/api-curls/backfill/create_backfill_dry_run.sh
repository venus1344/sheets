#!/bin/bash
# Create Backfill Dry Run
# Operation: create_backfill_dry_run
# Method: POST
# Path: /api/v2/backfills/dry_run

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

curl -X POST \
  "$AIRFLOW_URL/api/v2/backfills/dry_run" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{}'

# Request body example:
# -d '{
#   "key": "value"
# }'