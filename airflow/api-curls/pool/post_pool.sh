#!/bin/bash
# Post Pool
# Operation: post_pool
# Method: POST
# Path: /api/v2/pools

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

curl -X POST \
  "$AIRFLOW_URL/api/v2/pools" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{}'

# Request body example:
# -d '{
#   "key": "value"
# }'