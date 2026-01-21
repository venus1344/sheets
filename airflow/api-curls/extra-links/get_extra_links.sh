#!/bin/bash
# Get Extra Links
# Operation: get_extra_links
# Method: GET
# Path: /api/v2/dags/{dag_id}/dagRuns/{dag_run_id}/taskInstances/{task_id}/links

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"
DAG_RUN_ID="${DAG_RUN_ID:-<dag_run_id>}"
TASK_ID="${TASK_ID:-<task_id>}"

# Query parameters (uncomment as needed)
# map_index="-1"  # Optional (default: -1)

curl -X GET \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/dagRuns/${DAG_RUN_ID}/taskInstances/${TASK_ID}/links" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"