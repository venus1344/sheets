#!/bin/bash
# Get Task Instance Dependencies
# Operation: get_task_instance_dependencies_by_map_index
# Method: GET
# Path: /api/v2/dags/{dag_id}/dagRuns/{dag_run_id}/taskInstances/{task_id}/{map_index}/dependencies

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"
DAG_RUN_ID="${DAG_RUN_ID:-<dag_run_id>}"
TASK_ID="${TASK_ID:-<task_id>}"
MAP_INDEX="${MAP_INDEX:-<map_index>}"

curl -X GET \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/dagRuns/${DAG_RUN_ID}/taskInstances/${TASK_ID}/${MAP_INDEX}/dependencies" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"