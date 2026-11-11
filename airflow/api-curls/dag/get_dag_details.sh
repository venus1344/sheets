#!/bin/bash
# Get Dag Details
# Operation: get_dag_details
# Method: GET
# Path: /api/v2/dags/{dag_id}/details

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"

curl -X GET \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/details" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"