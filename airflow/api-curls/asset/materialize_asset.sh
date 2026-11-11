#!/bin/bash
# Materialize Asset
# Operation: materialize_asset
# Method: POST
# Path: /api/v2/assets/{asset_id}/materialize

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
ASSET_ID="${ASSET_ID:-<asset_id>}"

curl -X POST \
  "$AIRFLOW_URL/api/v2/assets/${ASSET_ID}/materialize" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"