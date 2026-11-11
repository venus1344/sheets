#!/bin/bash
# Get Asset Alias
# Operation: get_asset_alias
# Method: GET
# Path: /api/v2/assets/aliases/{asset_alias_id}

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
ASSET_ALIAS_ID="${ASSET_ALIAS_ID:-<asset_alias_id>}"

curl -X GET \
  "$AIRFLOW_URL/api/v2/assets/aliases/${ASSET_ALIAS_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"