#!/bin/bash
# Bulk Connections
# Operation: bulk_connections
# Method: PATCH
# Path: /api/v2/connections

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

curl -X PATCH \
  "$AIRFLOW_URL/api/v2/connections" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{}'

# Request body example:
# -d '{
#   "key": "value"
# }'