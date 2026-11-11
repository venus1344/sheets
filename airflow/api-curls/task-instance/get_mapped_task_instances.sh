#!/bin/bash
# Get Mapped Task Instances
# Operation: get_mapped_task_instances
# Method: GET
# Path: /api/v2/dags/{dag_id}/dagRuns/{dag_run_id}/taskInstances/{task_id}/listMapped

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"
DAG_RUN_ID="${DAG_RUN_ID:-<dag_run_id>}"
TASK_ID="${TASK_ID:-<task_id>}"

# Query parameters (uncomment as needed)
# run_after_gte=""  # Optional
# run_after_gt=""  # Optional
# run_after_lte=""  # Optional
# run_after_lt=""  # Optional
# logical_date_gte=""  # Optional
# logical_date_gt=""  # Optional
# logical_date_lte=""  # Optional
# logical_date_lt=""  # Optional
# start_date_gte=""  # Optional
# start_date_gt=""  # Optional
# start_date_lte=""  # Optional
# start_date_lt=""  # Optional
# end_date_gte=""  # Optional
# end_date_gt=""  # Optional
# end_date_lte=""  # Optional
# end_date_lt=""  # Optional
# updated_at_gte=""  # Optional
# updated_at_gt=""  # Optional
# updated_at_lte=""  # Optional
# updated_at_lt=""  # Optional
# duration_gte=""  # Optional
# duration_gt=""  # Optional
# duration_lte=""  # Optional
# duration_lt=""  # Optional
# state=""  # Optional
# pool=""  # Optional
# queue=""  # Optional
# executor=""  # Optional
# version_number=""  # Optional
# try_number=""  # Optional
# operator=""  # Optional
# map_index=""  # Optional
# limit="50"  # Optional (default: 50)
# offset=""  # Optional
# order_by="['map_index']"  # Optional (default: ['map_index'])

curl -X GET \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/dagRuns/${DAG_RUN_ID}/taskInstances/${TASK_ID}/listMapped" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"