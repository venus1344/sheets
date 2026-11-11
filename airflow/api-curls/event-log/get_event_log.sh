#!/bin/bash
# Get Event Log
# Operation: get_event_log
# Method: GET
# Path: /api/v2/eventLogs/{event_log_id}

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
EVENT_LOG_ID="${EVENT_LOG_ID:-<event_log_id>}"

curl -X GET \
  "$AIRFLOW_URL/api/v2/eventLogs/${EVENT_LOG_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"