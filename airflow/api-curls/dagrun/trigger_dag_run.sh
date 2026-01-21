#!/bin/bash
# Trigger Dag Run
# Operation: trigger_dag_run
# Method: POST
# Path: /api/v2/dags/{dag_id}/dagRuns

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"

curl -X POST \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/dagRuns" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{}'

# Request body example:
# -d '{
#   "key": "value"
# }'