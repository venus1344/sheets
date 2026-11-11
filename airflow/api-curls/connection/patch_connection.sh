#!/bin/bash
# Patch Connection
# Operation: patch_connection
# Method: PATCH
# Path: /api/v2/connections/{connection_id}

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
CONNECTION_ID="${CONNECTION_ID:-<connection_id>}"

# Query parameters (uncomment as needed)
# update_mask=""  # Optional

curl -X PATCH \
  "$AIRFLOW_URL/api/v2/connections/${CONNECTION_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{}'

# Request body example:
# -d '{
#   "key": "value"
# }'