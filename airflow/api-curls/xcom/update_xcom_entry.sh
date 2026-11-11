#!/bin/bash
# Update Xcom Entry
# Operation: update_xcom_entry
# Method: PATCH
# Path: /api/v2/dags/{dag_id}/dagRuns/{dag_run_id}/taskInstances/{task_id}/xcomEntries/{xcom_key}

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"
TASK_ID="${TASK_ID:-<task_id>}"
DAG_RUN_ID="${DAG_RUN_ID:-<dag_run_id>}"
XCOM_KEY="${XCOM_KEY:-<xcom_key>}"

curl -X PATCH \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/dagRuns/${DAG_RUN_ID}/taskInstances/${TASK_ID}/xcomEntries/${XCOM_KEY}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{}'

# Request body example:
# -d '{
#   "key": "value"
# }'