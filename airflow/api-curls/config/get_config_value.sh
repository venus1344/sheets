#!/bin/bash
# Get Config Value
# Operation: get_config_value
# Method: GET
# Path: /api/v2/config/section/{section}/option/{option}

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
SECTION="${SECTION:-<section>}"
OPTION="${OPTION:-<option>}"

curl -X GET \
  "$AIRFLOW_URL/api/v2/config/section/${SECTION}/option/${OPTION}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"