#!/bin/bash
# Bulk Variables
# Operation: bulk_variables
# Method: PATCH
# Path: /api/v2/variables

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

curl -X PATCH \
  "$AIRFLOW_URL/api/v2/variables" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{}'

# Request body example:
# -d '{
#   "key": "value"
# }'