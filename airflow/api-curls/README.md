# Airflow API Curl Commands

Curl command files for the Airflow REST API v2, organized by feature.

## Setup

Set environment variables before running:

```bash
export AIRFLOW_URL="http://localhost:8080"
export AIRFLOW_AUTH_TOKEN="your-token-here"
```

## Directory Structure

```
api-curls/
├── asset/           # Asset management (13 endpoints)
├── backfill/        # Backfill operations (7 endpoints)
├── config/          # Configuration (2 endpoints)
├── connection/      # Connections (8 endpoints)
├── dag/             # DAG management (9 endpoints)
├── dag-parsing/     # DAG parsing (1 endpoint)
├── dagrun/          # DAG runs (9 endpoints)
├── dagsource/       # DAG source code (1 endpoint)
├── dagstats/        # DAG statistics (1 endpoint)
├── dagversion/      # DAG versions (2 endpoints)
├── dagwarning/      # DAG warnings (1 endpoint)
├── event-log/       # Event logs (2 endpoints)
├── extra-links/     # Extra links (1 endpoint)
├── import-error/    # Import errors (2 endpoints)
├── job/             # Jobs (1 endpoint)
├── login/           # Authentication (2 endpoints)
├── monitor/         # Health monitoring (1 endpoint)
├── plugin/          # Plugins (2 endpoints)
├── pool/            # Pools (6 endpoints)
├── provider/        # Providers (1 endpoint)
├── task/            # Tasks (2 endpoints)
├── task-instance/   # Task instances (23 endpoints)
├── variable/        # Variables (6 endpoints)
├── version/         # API version (1 endpoint)
└── xcom/            # XCom (4 endpoints)
```

## Usage

```bash
# Make executable (already done)
chmod +x dag/*.sh

# Run a command
./dag/get-dags.sh

# With parameters
DAG_ID="my_dag" ./dagrun/get-dag-runs.sh
```
