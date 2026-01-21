#!/bin/bash
# Get Dag Stats
# Operation: get_dag_stats
# Method: GET
# Path: /api/v2/dagStats

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Query parameters (uncomment as needed)
# dag_ids=""  # Optional

curl -X GET \
  "$AIRFLOW_URL/api/v2/dagStats" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"