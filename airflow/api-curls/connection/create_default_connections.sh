#!/bin/bash
# Create Default Connections
# Operation: create_default_connections
# Method: POST
# Path: /api/v2/connections/defaults

# Configuration
AIRFLOW_URL="${AIRFLOW_URL:-http://localhost:8080}"
AUTH_TOKEN="${AIRFLOW_AUTH_TOKEN:-}"

curl -X POST \
  "$AIRFLOW_URL/api/v2/connections/defaults" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"