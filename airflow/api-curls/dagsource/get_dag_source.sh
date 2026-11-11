#!/bin/bash
# Get Dag Source
# Operation: get_dag_source
# Method: GET
# Path: /api/v2/dagSources/{dag_id}

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"

# Query parameters (uncomment as needed)
# version_number=""  # Optional

curl -X GET \
  "$AIRFLOW_URL/api/v2/dagSources/${DAG_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"