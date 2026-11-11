#!/bin/bash
# List Dag Warnings
# Operation: list_dag_warnings
# Method: GET
# Path: /api/v2/dagWarnings

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Query parameters (uncomment as needed)
# dag_id=""  # Optional
# warning_type=""  # Optional
# limit="50"  # Optional (default: 50)
# offset=""  # Optional
# order_by="['dag_id']"  # Optional (default: ['dag_id'])

curl -X GET \
  "$AIRFLOW_URL/api/v2/dagWarnings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"