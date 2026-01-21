#!/bin/bash
# Get Dags
# Operation: get_dags
# Method: GET
# Path: /api/v2/dags

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Query parameters (uncomment as needed)
# limit="50"  # Optional (default: 50)
# offset=""  # Optional
# tags=""  # Optional
# tags_match_mode=""  # Optional
# owners=""  # Optional
# dag_id_pattern=""  # Optional
# dag_display_name_pattern=""  # Optional
# exclude_stale="True"  # Optional (default: True)
# paused=""  # Optional
# has_import_errors=""  # Optional
# last_dag_run_state=""  # Optional
# bundle_name=""  # Optional
# bundle_version=""  # Optional
# has_asset_schedule=""  # Optional
# asset_dependency=""  # Optional
# dag_run_start_date_gte=""  # Optional
# dag_run_start_date_gt=""  # Optional
# dag_run_start_date_lte=""  # Optional
# dag_run_start_date_lt=""  # Optional
# dag_run_end_date_gte=""  # Optional
# dag_run_end_date_gt=""  # Optional
# dag_run_end_date_lte=""  # Optional
# dag_run_end_date_lt=""  # Optional
# dag_run_state=""  # Optional
# order_by="['dag_id']"  # Optional (default: ['dag_id'])
# is_favorite=""  # Optional

curl -X GET \
  "$AIRFLOW_URL/api/v2/dags" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"