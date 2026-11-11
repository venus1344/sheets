#!/bin/bash
# Get Dag Tags
# Operation: get_dag_tags
# Method: GET
# Path: /api/v2/dagTags

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Query parameters (uncomment as needed)
# limit="50"  # Optional (default: 50)
# offset=""  # Optional
# order_by="['name']"  # Optional (default: ['name'])
# tag_name_pattern=""  # Optional

curl -X GET \
  "$AIRFLOW_URL/api/v2/dagTags" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"