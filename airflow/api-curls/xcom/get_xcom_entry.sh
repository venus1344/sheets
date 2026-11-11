#!/bin/bash
# Get Xcom Entry
# Operation: get_xcom_entry
# Method: GET
# Path: /api/v2/dags/{dag_id}/dagRuns/{dag_run_id}/taskInstances/{task_id}/xcomEntries/{xcom_key}

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"
TASK_ID="${TASK_ID:-<task_id>}"
DAG_RUN_ID="${DAG_RUN_ID:-<dag_run_id>}"
XCOM_KEY="${XCOM_KEY:-<xcom_key>}"

# Query parameters (uncomment as needed)
# map_index="-1"  # Optional (default: -1)
# deserialize=""  # Optional
# stringify=""  # Optional

curl -X GET \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/dagRuns/${DAG_RUN_ID}/taskInstances/${TASK_ID}/xcomEntries/${XCOM_KEY}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"