#!/bin/bash
# Get Task Instances Batch
# Operation: get_task_instances_batch
# Method: POST
# Path: /api/v2/dags/{dag_id}/dagRuns/{dag_run_id}/taskInstances/list

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"
DAG_RUN_ID="${DAG_RUN_ID:-<dag_run_id>}"

curl -X POST \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/dagRuns/${DAG_RUN_ID}/taskInstances/list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{}'

# Request body example:
# -d '{
#   "key": "value"
# }'