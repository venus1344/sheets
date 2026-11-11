#!/bin/bash
# Patch Dag
# Operation: patch_dag
# Method: PATCH
# Path: /api/v2/dags/{dag_id}

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"

# Query parameters (uncomment as needed)
# update_mask=""  # Optional

curl -X PATCH \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{}'

# Request body example:
# -d '{
#   "key": "value"
# }'