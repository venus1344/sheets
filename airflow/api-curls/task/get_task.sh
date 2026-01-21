#!/bin/bash
# Get Task
# Operation: get_task
# Method: GET
# Path: /api/v2/dags/{dag_id}/tasks/{task_id}

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"
TASK_ID="${TASK_ID:-<task_id>}"

curl -X GET \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/tasks/${TASK_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"