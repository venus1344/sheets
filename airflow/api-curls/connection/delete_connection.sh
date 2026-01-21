#!/bin/bash
# Delete Connection
# Operation: delete_connection
# Method: DELETE
# Path: /api/v2/connections/{connection_id}

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
CONNECTION_ID="${CONNECTION_ID:-<connection_id>}"

curl -X DELETE \
  "$AIRFLOW_URL/api/v2/connections/${CONNECTION_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"