#!/bin/bash
# Get Assets
# Operation: get_assets
# Method: GET
# Path: /api/v2/assets

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Query parameters (uncomment as needed)
# limit="50"  # Optional (default: 50)
# offset=""  # Optional
# name_pattern=""  # Optional
# uri_pattern=""  # Optional
# dag_ids=""  # Optional
# only_active="True"  # Optional (default: True)
# order_by="['id']"  # Optional (default: ['id'])

curl -X GET \
  "$AIRFLOW_URL/api/v2/assets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"