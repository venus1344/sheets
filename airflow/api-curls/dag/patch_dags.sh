#!/bin/bash
# Patch Dags
# Operation: patch_dags
# Method: PATCH
# Path: /api/v2/dags

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Query parameters (uncomment as needed)
# update_mask=""  # Optional
# limit="50"  # Optional (default: 50)
# offset=""  # Optional
# tags=""  # Optional
# tags_match_mode=""  # Optional
# owners=""  # Optional
# dag_id_pattern=""  # Optional
# exclude_stale="True"  # Optional (default: True)
# paused=""  # Optional

curl -X PATCH \
  "$AIRFLOW_URL/api/v2/dags" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{}'

# Request body example:
# -d '{
#   "key": "value"
# }'