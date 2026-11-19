from __future__ import annotations

import requests
from datetime import datetime, timedelta

from airflow import DAG
from airflow.exceptions import AirflowException
from airflow.models import Variable
from airflow.operators.python import PythonOperator
from airflow.providers.mysql.hooks.mysql import MySqlHook

from utils.heartbeat import make_callbacks, report_started

MYSQL_CONN_ID = "mysql_conn_id"

DAG_ID = "reconcile_sheets"
on_success, on_failure = make_callbacks(DAG_ID)


def get_config():
    return {
        "webhook_url": Variable.get("sheets_webhook_url", default_var="http://localhost:3500"),
        "api_key": Variable.get("sheets_api_key"),
        "client_id": Variable.get("sheets_client_id", default_var=None),
    }


def get_headers(config):
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": config["api_key"],
    }
    if config["client_id"]:
        headers["X-Client-Id"] = config["client_id"]
    return headers


default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "on_success_callback": on_success,
    "on_failure_callback": on_failure,
}

USER_SUMMARY_QUERY = """
SELECT
    username,
    COUNT(distinct incident_reports.id) AS incidents_total,
    users.email,
    DATE_FORMAT(users.loged_at, '%Y-%m-%d') AS last_login_date
FROM `users`
    LEFT JOIN `incident_reports` on `reported_by` = `users`.`id`
WHERE
    users.mobile_id is not null
    AND users.username NOT IN('test','test2','sighter','hello')
    AND users.institution_id=7
GROUP BY username, email, loged_at
ORDER BY `users`.`username` ASC;
"""

INCIDENT_QUERY = """
SELECT
    `incident_reports`.`id` AS 'incident_id',
    DATE_FORMAT(`incident_reports`.reported_datetime, '%Y-%m-%d') AS 'report_date',
    it.name AS 'incident_type',
    u.username AS 'reported_by',
    `incident_reports`.description AS 'notes'
FROM `incident_reports`
LEFT JOIN `incident_types` as it on it.id = `incident_reports`.`incident_type_id`
LEFT JOIN `users` as u on u.id = `incident_reports`.reported_by
WHERE u.institution_id = 7
ORDER BY `incident_reports`.`id` ASC;
"""


def fetch_users(**context):
    hook = MySqlHook(mysql_conn_id=MYSQL_CONN_ID, schema="gpswox_web")
    records = hook.get_records(USER_SUMMARY_QUERY)
    columns = ["username", "incidents_total", "email", "last_login_date"]

    users = []
    for record in records:
        user = dict(zip(columns, record))
        users.append({
            "name": user["username"],
            "value": user["incidents_total"],
            "date": user["last_login_date"] or datetime.now().strftime("%Y-%m-%d"),
            "email": user["email"],
        })

    print(f"Fetched {len(users)} user(s) for reconciliation")
    context["ti"].xcom_push(key="users", value=users)
    return users


def fetch_incidents(**context):
    hook = MySqlHook(mysql_conn_id=MYSQL_CONN_ID, schema="gpswox_web")
    records = hook.get_records(INCIDENT_QUERY)
    columns = ["incident_id", "report_date", "incident_type", "reported_by", "notes"]

    incidents = []
    for record in records:
        incident = dict(zip(columns, record))
        incidents.append({
            "incidentId": str(incident["incident_id"]),
            "reportDate": incident["report_date"],
            "type": incident["incident_type"],
            "reportedBy": incident["reported_by"],
            "notes": incident["notes"],
        })

    print(f"Fetched {len(incidents)} incident(s) for reconciliation")
    context["ti"].xcom_push(key="incidents", value=incidents)
    return incidents


def send_to_reconcile(endpoint, key, **context):
    config = get_config()
    run_id = context.get("dag_run").run_id
    items = context["ti"].xcom_pull(key=key, task_ids=f"fetch_{key}")

    if not items:
        # The backend also refuses empty sets; failing here makes the DAG (and its
        # heartbeat) report a failure so the technical owner is alerted.
        raise AirflowException(f"Refusing to reconcile: {key} data set is empty")

    response = requests.post(
        f"{config['webhook_url']}/api/reconcile/{endpoint}",
        json={"runId": run_id, key: items},
        headers=get_headers(config),
        timeout=120,
    )
    response.raise_for_status()
    print(f"Reconciliation {endpoint}: {response.json()}")


with DAG(
    dag_id=DAG_ID,
    default_args=default_args,
    description="Reconcile Google Sheets against TAI (source of truth)",
    schedule="0 7 * * *",  # Daily at 7 AM (after the 6 AM sync DAGs)
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["sheets", "mysql", "reconcile"],
) as dag:

    report_started_task = PythonOperator(
        task_id="report_started",
        python_callable=report_started(DAG_ID),
    )

    fetch_users_task = PythonOperator(task_id="fetch_users", python_callable=fetch_users)
    fetch_incidents_task = PythonOperator(task_id="fetch_incidents", python_callable=fetch_incidents)

    send_users_task = PythonOperator(
        task_id="send_users",
        python_callable=send_to_reconcile,
        op_kwargs={"endpoint": "users", "key": "users"},
    )
    send_incidents_task = PythonOperator(
        task_id="send_incidents",
        python_callable=send_to_reconcile,
        op_kwargs={"endpoint": "incidents", "key": "incidents"},
    )

    report_started_task >> [fetch_users_task, fetch_incidents_task]
    fetch_users_task >> send_users_task
    fetch_incidents_task >> send_incidents_task
