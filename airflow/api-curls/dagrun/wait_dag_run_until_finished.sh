#!/bin/bash
# Experimental: Wait for a dag run to complete, and return task results if requested.
# Operation: wait_dag_run_until_finished
# Method: GET
# Path: /api/v2/dags/{dag_id}/dagRuns/{dag_run_id}/wait

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
DAG_ID="${DAG_ID:-<dag_id>}"
DAG_RUN_ID="${DAG_RUN_ID:-<dag_run_id>}"

# Query parameters (uncomment as needed)
# interval=""  # Required
# result=""  # Optional

curl -X GET \
  "$AIRFLOW_URL/api/v2/dags/${DAG_ID}/dagRuns/${DAG_RUN_ID}/wait" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"