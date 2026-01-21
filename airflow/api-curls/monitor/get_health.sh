#!/bin/bash
# Get Health
# Operation: get_health
# Method: GET
# Path: /api/v2/monitor/health

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

curl -X GET \
  "$AIRFLOW_URL/api/v2/monitor/health" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"