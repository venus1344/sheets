#!/bin/bash
# Login
# Operation: login
# Method: GET
# Path: /api/v2/auth/login

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

# Query parameters (uncomment as needed)
# next=""  # Optional

curl -X GET \
  "$AIRFLOW_URL/api/v2/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"