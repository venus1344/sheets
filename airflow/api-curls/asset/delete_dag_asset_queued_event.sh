#!/bin/bash
# Delete Dag Asset Queued Event
# Operation: delete_dag_asset_queued_event
# Method: DELETE
# Path: /api/v2/dags/{dag_id}/assets/{asset_id}/queuedEvents

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"
ASSET_ID="${ASSET_ID:-<asset_id>}"

# Query parameters (uncomment as needed)
# before=""  # Optional

curl -X DELETE \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/assets/${ASSET_ID}/queuedEvents" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"