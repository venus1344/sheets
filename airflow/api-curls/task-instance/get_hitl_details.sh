#!/bin/bash
# Get Hitl Details
# Operation: get_hitl_details
# Method: GET
# Path: /api/v2/dags/{dag_id}/dagRuns/{dag_run_id}/hitlDetails

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"
DAG_RUN_ID="${DAG_RUN_ID:-<dag_run_id>}"

# Query parameters (uncomment as needed)
# limit="50"  # Optional (default: 50)
# offset=""  # Optional
# order_by="['ti_id']"  # Optional (default: ['ti_id'])
# dag_id_pattern=""  # Optional
# task_id=""  # Optional
# task_id_pattern=""  # Optional
# map_index=""  # Optional
# state=""  # Optional
# response_received=""  # Optional
# responded_by_user_id=""  # Optional
# responded_by_user_name=""  # Optional
# subject_search=""  # Optional
# body_search=""  # Optional
# created_at_gte=""  # Optional
# created_at_gt=""  # Optional
# created_at_lte=""  # Optional
# created_at_lt=""  # Optional

curl -X GET \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/dagRuns/${DAG_RUN_ID}/hitlDetails" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"