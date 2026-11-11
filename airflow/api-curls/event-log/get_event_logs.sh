#!/bin/bash
# Get Event Logs
# Operation: get_event_logs
# Method: GET
# Path: /api/v2/eventLogs

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Query parameters (uncomment as needed)
# limit="50"  # Optional (default: 50)
# offset=""  # Optional
# order_by="['id']"  # Optional (default: ['id'])
# dag_id=""  # Optional
# task_id=""  # Optional
# run_id=""  # Optional
# map_index=""  # Optional
# try_number=""  # Optional
# owner=""  # Optional
# event=""  # Optional
# excluded_events=""  # Optional
# included_events=""  # Optional
# before=""  # Optional
# after=""  # Optional
# dag_id_pattern=""  # Optional
# task_id_pattern=""  # Optional
# run_id_pattern=""  # Optional
# owner_pattern=""  # Optional
# event_pattern=""  # Optional

curl -X GET \
  "$AIRFLOW_URL/api/v2/eventLogs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"