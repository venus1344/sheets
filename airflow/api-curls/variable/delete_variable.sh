#!/bin/bash
# Delete Variable
# Operation: delete_variable
# Method: DELETE
# Path: /api/v2/variables/{variable_key}

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
VARIABLE_KEY="${VARIABLE_KEY:-<variable_key>}"

curl -X DELETE \
  "$AIRFLOW_URL/api/v2/variables/${VARIABLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"