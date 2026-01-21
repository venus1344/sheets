from __future__ import annotations

import requests
from datetime import datetime, timedelta

from airflow import DAG
from airflow.models import Variable
from airflow.operators.python import PythonOperator
from airflow.providers.mysql.hooks.mysql import MySqlHook


MYSQL_CONN_ID = "mysql_conn_id"  # Airflow Connection ID
print(f"mysql conenciton on: {MYSQL_CONN_ID}")

def get_config():
    """Load configuration from Airflow Variables."""
    return {
        "webhook_url": Variable.get("sheets_webhook_url", default_var="http://localhost:3500"),
        "api_key": Variable.get("sheets_api_key"),
    }

default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
}

USER_SUMMARY_QUERY = """
SELECT
    username,
    COUNT(*) AS incidents_total,
    users.email,
    users.loged_at AS last_login_date
FROM
    `incident_reports`
LEFT JOIN users ON users.id = reported_by
LEFT JOIN incident_types ON incident_types.id = incident_type_id
WHERE
    incident_reports.institution_id = 7
    AND user.mobile_id is not null
    AND users.username NOT IN('test')
GROUP BY
    username
ORDER BY
    `users`.`username` ASC
"""


def fetch_user_data(**context):
    """Fetch user summary data from MySQL."""
    hook = MySqlHook(mysql_conn_id=MYSQL_CONN_ID, schema="gpswox_web")
    records = hook.get_records(USER_SUMMARY_QUERY)

    # Get column names
    columns = ["username", "incidents_total", "email", "last_login_date"]

    users = []
    for record in records:
        print("=======================")
        print(record)
        print(">=========<")
        user = dict(zip(columns, record))
        # Format date if present
        if user["last_login_date"]:
            if isinstance(user["last_login_date"], datetime):
                user["last_login_date"] = user["last_login_date"].strftime("%Y-%m-%d")
            else:
                user["last_login_date"] = str(user["last_login_date"])[:10]
        users.append(user)

    print(f"Fetched {len(users)} user records")
    context["ti"].xcom_push(key="users", value=users)
    return users


def send_to_webhook(**context):
    """Send each user record to the webhook endpoint."""
    config = get_config()
    users = context["ti"].xcom_pull(key="users", task_ids="fetch_user_data")

    if not users:
        print("No users to process")
        return

    headers = {
        "Content-Type": "application/json",
        "X-API-Key": config["api_key"]
    }

    success_count = 0
    error_count = 0

    for user in users:
        payload = {
            "name": user["username"],
            "value": user["incidents_total"],
            "date": user["last_login_date"] or datetime.now().strftime("%Y-%m-%d"),
            "email": user["email"]
        }

        try:
            response = requests.post(config["webhook_url"]+"/webhook/users", json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            success_count += 1
            print(f"Sent: {user['username']} - {response.json()}")
        except requests.exceptions.RequestException as e:
            error_count += 1
            print(f"Failed to send {user['username']}: {e}")

    print(f"Completed: {success_count} success, {error_count} errors")

    if error_count > 0 and success_count == 0:
        raise Exception(f"All {error_count} requests failed")


with DAG(
    dag_id="user_summary_to_sheets",
    default_args=default_args,
    description="Sync user incident summary from MySQL to Google Sheets",
    schedule="0 6 * * *",  # Daily at 6 AM
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["sheets", "mysql", "users"],
) as dag:

    fetch_task = PythonOperator(
        task_id="fetch_user_data",
        python_callable=fetch_user_data,
    )

    send_task = PythonOperator(
        task_id="send_to_webhook",
        python_callable=send_to_webhook,
    )

    fetch_task >> send_task
