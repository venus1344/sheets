#!/bin/bash
# Delete Asset Queued Events
# Operation: delete_asset_queued_events
# Method: DELETE
# Path: /api/v2/assets/{asset_id}/queuedEvents

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
ASSET_ID="${ASSET_ID:-<asset_id>}"

# Query parameters (uncomment as needed)
# before=""  # Optional

curl -X DELETE \
  "$AIRFLOW_URL/api/v2/assets/${ASSET_ID}/queuedEvents" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"