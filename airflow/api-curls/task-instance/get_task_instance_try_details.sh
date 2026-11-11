#!/bin/bash
# Get Task Instance Try Details
# Operation: get_task_instance_try_details
# Method: GET
# Path: /api/v2/dags/{dag_id}/dagRuns/{dag_run_id}/taskInstances/{task_id}/tries/{task_try_number}

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"
DAG_RUN_ID="${DAG_RUN_ID:-<dag_run_id>}"
TASK_ID="${TASK_ID:-<task_id>}"
TASK_TRY_NUMBER="${TASK_TRY_NUMBER:-<task_try_number>}"

# Query parameters (uncomment as needed)
# map_index="-1"  # Optional (default: -1)

curl -X GET \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/dagRuns/${DAG_RUN_ID}/taskInstances/${TASK_ID}/tries/${TASK_TRY_NUMBER}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"