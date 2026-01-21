#!/bin/bash
# Get Asset Aliases
# Operation: get_asset_aliases
# Method: GET
# Path: /api/v2/assets/aliases

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Query parameters (uncomment as needed)
# limit="50"  # Optional (default: 50)
# offset=""  # Optional
# name_pattern=""  # Optional
# order_by="['id']"  # Optional (default: ['id'])

curl -X GET \
  "$AIRFLOW_URL/api/v2/assets/aliases" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"