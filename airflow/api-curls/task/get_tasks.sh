#!/bin/bash
# Get Tasks
# Operation: get_tasks
# Method: GET
# Path: /api/v2/dags/{dag_id}/tasks

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"

# Query parameters (uncomment as needed)
# order_by="task_id"  # Optional (default: task_id)

curl -X GET \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"