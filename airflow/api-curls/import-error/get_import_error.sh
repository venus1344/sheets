#!/bin/bash
# Get Import Error
# Operation: get_import_error
# Method: GET
# Path: /api/v2/importErrors/{import_error_id}

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
IMPORT_ERROR_ID="${IMPORT_ERROR_ID:-<import_error_id>}"

curl -X GET \
  "$AIRFLOW_URL/api/v2/importErrors/${IMPORT_ERROR_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"