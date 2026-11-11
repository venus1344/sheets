from __future__ import annotations

import requests
from datetime import datetime, timedelta

from airflow import DAG
from airflow.exceptions import AirflowException
from airflow.models import Variable
from airflow.operators.python import PythonOperator
from airflow.providers.mysql.hooks.mysql import MySqlHook

from utils.slack_notifications import notify_slack_on_failure

MYSQL_CONN_ID = "mysql_conn_id"  # Airflow Connection ID
print(f"mysql conneciton on: {MYSQL_CONN_ID}")

def get_config():
    """Load configuration from Airflow Variables."""
    return {
        "webhook_url": Variable.get("sheets_webhook_url", default_var="http://localhost:3500"),
        "api_key": Variable.get("sheets_api_key"),
        # Sent as X-Client-Id so the API rate limiter lets this DAG through.
        "client_id": Variable.get("sheets_client_id", default_var=None),
    }

default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "on_failure_callback": notify_slack_on_failure,
}

# Airflow Variable holding the highest incident_reports.id already sent.
INCIDENT_CURSOR_VARIABLE = "incident_log_latest_id"

# Only used to seed the cursor on the very first run. Once the cursor exists the
# sync is driven purely by ids and this date is ignored.
INITIAL_SYNC_FROM = "2026-07-03"

INCIDENT_DATA = """
SELECT 
    `incident_reports`.`id` AS 'incident_id',
    reported_datetime AS 'reported_date',
    it.name as 'incident_type',
    u.username AS 'reported_by',
    description AS 'notes'
FROM 
    `incident_reports` 
LEFT JOIN `incident_types` as it on it.id = `incident_reports`.`incident_type_id`
LEFT JOIN `users` as u on u.id=reported_by
WHERE 
    `incident_reports`.`id` > %s
ORDER BY 
    `incident_reports`.`id` ASC;
"""

# First-run seed: treat everything reported at or before INITIAL_SYNC_FROM as
# already synced so the first run does not replay historical incidents.
CURSOR_SEED_SQL = """
SELECT COALESCE(MAX(`id`), 0)
FROM `incident_reports`
WHERE reported_datetime <= %s
"""


def set_last_synced_id(incident_id):
    """Persist the id cursor. Only ever called for ids the webhook accepted."""
    Variable.set(INCIDENT_CURSOR_VARIABLE, str(incident_id))


def get_last_synced_id(hook):
    """Return the highest incident id already delivered, seeding it on first run."""
    cursor = Variable.get(INCIDENT_CURSOR_VARIABLE, default_var=None)
    if cursor is not None:
        return int(cursor)

    row = hook.get_first(CURSOR_SEED_SQL, parameters=(INITIAL_SYNC_FROM,))
    seed = int(row[0]) if row and row[0] is not None else 0
    print(
        f"[{INCIDENT_CURSOR_VARIABLE}] not set - seeding to id {seed} "
        f"(incidents reported on/before {INITIAL_SYNC_FROM} are skipped)"
    )
    set_last_synced_id(seed)
    return seed


def fetch_incident_data(**context):
    hook = MySqlHook(mysql_conn_id=MYSQL_CONN_ID, schema="gpswox_web")

    last_synced_id = get_last_synced_id(hook)
    print(f"Fetching incidents with id > {last_synced_id}")

    records = hook.get_records(INCIDENT_DATA, parameters=(last_synced_id,))

    # Get column names
    columns = ["incident_id", "reported_date", "incident_type", "reported_by", "notes"]

    incidents = []
    for record in records:
        incident = dict(zip(columns, record))

        # MySQL returns datetime objects, which are not JSON serializable.
        # Normalize to the YYYY-MM-DD string the webhook expects.
        reported_date = incident["reported_date"]
        if isinstance(reported_date, datetime):
            incident["reported_date"] = reported_date.strftime("%Y-%m-%d")
        elif reported_date is not None:
            incident["reported_date"] = str(reported_date)[:10]

        incidents.append(incident)

    print(f"Fetched {len(incidents)} incident(s) with id > {last_synced_id}")

    context["ti"].xcom_push(key="incidents", value=incidents)

    return incidents


def send_to_webhook(**context):
    """Send incident records to the webhook endpoint, lowest id first.

    The id cursor only ever moves up to the last incident the webhook accepted.
    On failure we stop, checkpoint the cursor and re-raise, so a retry resumes at
    the incident that failed instead of replaying the whole batch.
    """
    config = get_config()
    incidents = context["ti"].xcom_pull(key="incidents", task_ids="fetch_incident_data")

    if not incidents:
        print("No incidents to process")
        return

    # A retry re-runs this task with the batch fetched by the earlier attempt, so
    # drop anything that attempt already delivered.
    last_synced_id = int(Variable.get(INCIDENT_CURSOR_VARIABLE, default_var="0") or 0)

    if any("incident_id" not in incident for incident in incidents):
        raise AirflowException(
            "The XCom batch from task 'fetch_incident_data' has no incident_id, so it "
            "was produced by an older version of this DAG. Clear the whole DAG run "
            "(not just this task) so fetch_incident_data re-runs, then retry."
        )

    incidents = [incident for incident in incidents if incident["incident_id"] > last_synced_id]

    if not incidents:
        print(f"No incidents to process (everything up to id {last_synced_id} was already sent)")
        return

    headers = {
        "Content-Type": "application/json",
        "X-API-Key": config["api_key"]
    }
    if config["client_id"]:
        headers["X-Client-Id"] = config["client_id"]

    success_count = 0
    last_sent_id = last_synced_id
    print(f"Sending {len(incidents)} incidents to webhook at {config['webhook_url']}/webhook/incidents")

    for incident in incidents:
        payload = {
            "reportDate": incident["reported_date"],
            "type": incident["incident_type"],
            "reportedBy": incident["reported_by"],
            "notes": incident["notes"]
        }

        try:
            response = requests.post(config["webhook_url"]+"/webhook/incidents", json=payload, headers=headers, timeout=30)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"Failed to send incident id={incident['incident_id']}: {e}")
            # Checkpoint the ids that did land, so the retry picks up from here.
            if last_sent_id > last_synced_id:
                set_last_synced_id(last_sent_id)
                print(f"Cursor advanced to id {last_sent_id}")
            raise AirflowException(
                f"Stopped at incident id={incident['incident_id']} after "
                f"{success_count} successful send(s): {e}"
            ) from e

        last_sent_id = incident["incident_id"]
        success_count += 1
        try:
            body = response.json()
        except ValueError:
            # A 2xx with a non-JSON body still means the incident was accepted;
            # do not let logging turn it into a retry (and a duplicate row).
            body = response.text[:200]
        print(f"Sent id={last_sent_id}: {incident['incident_type']} - {body}")

    set_last_synced_id(last_sent_id)
    print(f"Completed: {success_count} sent, cursor advanced to id {last_sent_id}")


with DAG(
    dag_id="incident_log_to_sheets",
    default_args=default_args,
    description="Sync incident log from MySQL to Google Sheets",
    schedule="0 6 * * *",  # Daily at 6 AM
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["sheets", "mysql", "incidents"],
) as dag:

    fetch_task = PythonOperator(
        task_id="fetch_incident_data",
        python_callable=fetch_incident_data,
    )

    send_task = PythonOperator(
        task_id="send_to_webhook",
        python_callable=send_to_webhook,
    )

    fetch_task >> send_task
