#!/bin/bash
# List Backfills
# Operation: list_backfills
# Method: GET
# Path: /api/v2/backfills

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Query parameters (uncomment as needed)
# dag_id=""  # Required
# limit="50"  # Optional (default: 50)
# offset=""  # Optional
# order_by="['id']"  # Optional (default: ['id'])

curl -X GET \
  "$AIRFLOW_URL/api/v2/backfills" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"