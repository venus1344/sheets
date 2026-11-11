#!/bin/bash
# Get Config
# Operation: get_config
# Method: GET
# Path: /api/v2/config

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Query parameters (uncomment as needed)
# section=""  # Optional

curl -X GET \
  "$AIRFLOW_URL/api/v2/config" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"