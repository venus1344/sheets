#!/bin/bash
# Patch Pool
# Operation: patch_pool
# Method: PATCH
# Path: /api/v2/pools/{pool_name}

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
POOL_NAME="${POOL_NAME:-<pool_name>}"

# Query parameters (uncomment as needed)
# update_mask=""  # Optional

curl -X PATCH \
  "$AIRFLOW_URL/api/v2/pools/${POOL_NAME}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{}'

# Request body example:
# -d '{
#   "key": "value"
# }'