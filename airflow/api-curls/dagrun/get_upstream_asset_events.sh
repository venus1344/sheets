#!/bin/bash
# Get Upstream Asset Events
# Operation: get_upstream_asset_events
# Method: GET
# Path: /api/v2/dags/{dag_id}/dagRuns/{dag_run_id}/upstreamAssetEvents

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"
DAG_RUN_ID="${DAG_RUN_ID:-<dag_run_id>}"

curl -X GET \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/dagRuns/${DAG_RUN_ID}/upstreamAssetEvents" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"