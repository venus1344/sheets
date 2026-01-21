#!/bin/bash
# Get Asset Events
# Operation: get_asset_events
# Method: GET
# Path: /api/v2/assets/events

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Query parameters (uncomment as needed)
# limit="50"  # Optional (default: 50)
# offset=""  # Optional
# order_by="['timestamp']"  # Optional (default: ['timestamp'])
# asset_id=""  # Optional
# source_dag_id=""  # Optional
# source_task_id=""  # Optional
# source_run_id=""  # Optional
# source_map_index=""  # Optional
# timestamp_gte=""  # Optional
# timestamp_gt=""  # Optional
# timestamp_lte=""  # Optional
# timestamp_lt=""  # Optional

curl -X GET \
  "$AIRFLOW_URL/api/v2/assets/events" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"