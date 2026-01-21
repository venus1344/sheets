#!/bin/bash
# Get Dag Runs
# Operation: get_dag_runs
# Method: GET
# Path: /api/v2/dags/{dag_id}/dagRuns

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"

# Query parameters (uncomment as needed)
# limit="50"  # Optional (default: 50)
# offset=""  # Optional
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
# run_type=""  # Optional
# state=""  # Optional
# dag_version=""  # Optional
# order_by="['id']"  # Optional (default: ['id'])
# run_id_pattern=""  # Optional
# triggering_user_name_pattern=""  # Optional

curl -X GET \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/dagRuns" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"