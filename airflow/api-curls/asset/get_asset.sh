#!/bin/bash
# Get Asset
# Operation: get_asset
# Method: GET
# Path: /api/v2/assets/{asset_id}

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
ASSET_ID="${ASSET_ID:-<asset_id>}"

curl -X GET \
  "$AIRFLOW_URL/api/v2/assets/${ASSET_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"