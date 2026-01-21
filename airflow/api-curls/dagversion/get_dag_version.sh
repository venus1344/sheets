#!/bin/bash
# Get Dag Version
# Operation: get_dag_version
# Method: GET
# Path: /api/v2/dags/{dag_id}/dagVersions/{version_number}

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"
VERSION_NUMBER="${VERSION_NUMBER:-<version_number>}"

curl -X GET \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/dagVersions/${VERSION_NUMBER}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"