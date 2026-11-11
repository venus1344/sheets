#!/bin/bash
# Import Errors
# Operation: import_errors
# Method: GET
# Path: /api/v2/plugins/importErrors

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

curl -X GET \
  "$AIRFLOW_URL/api/v2/plugins/importErrors" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"