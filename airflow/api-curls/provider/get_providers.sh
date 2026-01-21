#!/bin/bash
# Get Providers
# Operation: get_providers
# Method: GET
# Path: /api/v2/providers

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Query parameters (uncomment as needed)
# limit="50"  # Optional (default: 50)
# offset=""  # Optional

curl -X GET \
  "$AIRFLOW_URL/api/v2/providers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"