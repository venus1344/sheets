#!/bin/bash
# Get Dag Versions
# Operation: get_dag_versions
# Method: GET
# Path: /api/v2/dags/{dag_id}/dagVersions

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"

# Query parameters (uncomment as needed)
# limit="50"  # Optional (default: 50)
# offset=""  # Optional
# version_number=""  # Optional
# bundle_name=""  # Optional
# bundle_version=""  # Optional
# order_by="['id']"  # Optional (default: ['id'])

curl -X GET \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/dagVersions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"