#!/bin/bash
# Reparse Dag File
# Operation: reparse_dag_file
# Method: PUT
# Path: /api/v2/parseDagFile/{file_token}

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Path parameters
FILE_TOKEN="${FILE_TOKEN:-<file_token>}"

curl -X PUT \
  "$AIRFLOW_URL/api/v2/parseDagFile/${FILE_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"