#!/bin/bash
# Get Xcom Entries
# Operation: get_xcom_entries
# Method: GET
# Path: /api/v2/dags/{dag_id}/dagRuns/{dag_run_id}/taskInstances/{task_id}/xcomEntries

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"
DAG_RUN_ID="${DAG_RUN_ID:-<dag_run_id>}"
TASK_ID="${TASK_ID:-<task_id>}"

# Query parameters (uncomment as needed)
# xcom_key=""  # Optional
# map_index=""  # Optional
# limit="50"  # Optional (default: 50)
# offset=""  # Optional
# xcom_key_pattern=""  # Optional
# dag_display_name_pattern=""  # Optional
# run_id_pattern=""  # Optional
# task_id_pattern=""  # Optional
# map_index_filter=""  # Optional
# logical_date_gte=""  # Optional
# logical_date_gt=""  # Optional
# logical_date_lte=""  # Optional
# logical_date_lt=""  # Optional
# run_after_gte=""  # Optional
# run_after_gt=""  # Optional
# run_after_lte=""  # Optional
# run_after_lt=""  # Optional

curl -X GET \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/dagRuns/${DAG_RUN_ID}/taskInstances/${TASK_ID}/xcomEntries" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"