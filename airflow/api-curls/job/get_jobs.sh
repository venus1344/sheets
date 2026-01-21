#!/bin/bash
# Get Jobs
# Operation: get_jobs
# Method: GET
# Path: /api/v2/jobs

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Query parameters (uncomment as needed)
# is_alive=""  # Optional
# start_date_gte=""  # Optional
# start_date_gt=""  # Optional
# start_date_lte=""  # Optional
# start_date_lt=""  # Optional
# end_date_gte=""  # Optional
# end_date_gt=""  # Optional
# end_date_lte=""  # Optional
# end_date_lt=""  # Optional
# limit="50"  # Optional (default: 50)
# offset=""  # Optional
# order_by="['id']"  # Optional (default: ['id'])
# job_state=""  # Optional
# job_type=""  # Optional
# hostname=""  # Optional
# executor_class=""  # Optional

curl -X GET \
  "$AIRFLOW_URL/api/v2/jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"