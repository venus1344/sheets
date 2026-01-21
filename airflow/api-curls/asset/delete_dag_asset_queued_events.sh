#!/bin/bash
# Delete Dag Asset Queued Events
# Operation: delete_dag_asset_queued_events
# Method: DELETE
# Path: /api/v2/dags/{dag_id}/assets/queuedEvents

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"

# Query parameters (uncomment as needed)
# before=""  # Optional

curl -X DELETE \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/assets/queuedEvents" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"