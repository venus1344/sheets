#!/bin/bash
# Get Plugins
# Operation: get_plugins
# Method: GET
# Path: /api/v2/plugins

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Query parameters (uncomment as needed)
# limit="50"  # Optional (default: 50)
# offset=""  # Optional

curl -X GET \
  "$AIRFLOW_URL/api/v2/plugins" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"