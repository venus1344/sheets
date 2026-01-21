#!/bin/bash
# Get Variables
# Operation: get_variables
# Method: GET
# Path: /api/v2/variables

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Query parameters (uncomment as needed)
# limit="50"  # Optional (default: 50)
# offset=""  # Optional
# order_by="['id']"  # Optional (default: ['id'])
# variable_key_pattern=""  # Optional

curl -X GET \
  "$AIRFLOW_URL/api/v2/variables" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"