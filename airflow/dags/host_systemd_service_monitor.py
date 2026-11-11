from __future__ import annotations

import json
import logging
import subprocess
from datetime import datetime, timedelta, timezone

import requests
from airflow import DAG
from airflow.models import Variable
from airflow.providers.standard.operators.python import PythonOperator

from utils.slack_notifications import notify_slack_on_failure

log = logging.getLogger(__name__)


default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 3,
    "retry_delay": timedelta(minutes=2),
    "on_failure_callback": notify_slack_on_failure,
}


def check_services(**context):
    """Query systemd services on host via nsenter. Push full output to XCom."""
    cmd = [
        "nsenter", "--target", "1", "--mount", "--", "bash", "-c",
        r"""
        SERVICES=$(systemctl list-units --type=service --all --no-pager --no-legend \
          | awk '{for(i=1;i<=NF;i++) if($i ~ /\.service$/) {print $i; break}}')
        if [ -n "$SERVICES" ]; then
          echo "$SERVICES" | xargs systemctl show \
            --property=Id,ActiveState,SubState,LoadState,Description,NRestarts,UnitFileState \
            --no-pager
        fi
        """
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    context["ti"].xcom_push(key="return_value", value=result.stdout)
    return result.stdout


def _parse_variable_list(var_name):
    """Parse an Airflow Variable as a comma-separated string or JSON array.

    Returns a set of service names (lowercase, stripped). Returns empty set if
    the variable is not set or is empty.
    """
    raw = Variable.get(var_name, default_var="")
    if not raw.strip():
        return set()

    # Try JSON array first
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return {s.strip().lower() for s in parsed if s.strip()}
    except (json.JSONDecodeError, TypeError):
        pass

    # Fall back to comma-separated
    return {s.strip().lower() for s in raw.split(",") if s.strip()}


def _parse_systemctl_show(raw_output):
    """Parse 'systemctl show' output into a list of dicts.

    systemctl show outputs key=value lines, with blank lines separating units.
    """
    services = []
    current = {}

    for line in raw_output.splitlines():
        line = line.strip()
        if not line:
            if current:
                services.append(current)
                current = {}
            continue
        if "=" in line:
            key, _, value = line.partition("=")
            current[key] = value

    if current:
        services.append(current)

    return services


def filter_and_format(**context):
    """Pull raw systemctl output, apply include/ignore lists, format Slack message."""
    ti = context["ti"]
    raw_output = ti.xcom_pull(task_ids="check_services")

    if not raw_output or not raw_output.strip():
        log.warning("No output from check_services task")
        ti.xcom_push(key="slack_message", value=None)
        return

    # Parse the raw systemctl show output
    all_services = _parse_systemctl_show(raw_output)
    log.info("Parsed %d services from systemctl output", len(all_services))

    # Load include/ignore lists from Airflow Variables
    include_list = _parse_variable_list("systemd_services_include_list")
    include_substrings = _parse_variable_list("systemd_services_include_substrings")
    ignore_list = _parse_variable_list("systemd_services_ignore_list")

    log.info("Include list: %s", include_list or "(not set)")
    log.info("Include substrings: %s", include_substrings or "(not set)")
    log.info("Ignore list: %s", ignore_list or "(empty)")

    # whitelist mode active if either list is populated
    whitelist_mode = bool(include_list or include_substrings)

    # Filter services
    filtered = []
    for svc in all_services:
        svc_id = svc.get("Id", "").lower()
        svc_name = svc_id.removesuffix(".service")
        svc_desc = svc.get("Description", "").lower()

        # Always apply ignore list
        if svc_name in ignore_list or svc_id in ignore_list:
            continue

        if whitelist_mode:
            exact_match = svc_id in include_list or svc_name in include_list
            substr_match = any(sub in svc_id or sub in svc_desc for sub in include_substrings)
            if not exact_match and not substr_match:
                continue

        filtered.append(svc)

    # Identify down/failed services (not active)
    down_services = [
        svc for svc in filtered
        if svc.get("ActiveState") not in ("active", "activating")
        and svc.get("LoadState") == "loaded"
    ]

    total_checked = len(filtered)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    if not down_services:
        ti.xcom_push(key="slack_message", value=None)
        log.info("All %d checked services are healthy", total_checked)
        return

    # Build detailed blocks for down services
    service_blocks = []
    for svc in down_services:
        svc_id = svc.get("Id", "unknown")
        active_state = svc.get("ActiveState", "unknown")
        sub_state = svc.get("SubState", "unknown")
        enabled = svc.get("UnitFileState", "unknown")
        restart_count = svc.get("NRestarts", "0")
        description = svc.get("Description", "")

        service_blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f":red_circle: *{svc_id}*\n"
                        f"    Description: {description}\n"
                        f"    Status: {active_state} ({sub_state})\n"
                        f"    Enabled: {enabled}\n"
                        f"    Restart Count: {restart_count}"
                    ),
                },
            }
        )

    message = {
        "attachments": [
            {
                "color": "#FF0000",
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": "Host Service Status Report",
                        },
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*{now}*\n\n:warning: *{len(down_services)} service(s) down* out of {total_checked} checked",
                        },
                    },
                    *service_blocks,
                ],
            }
        ]
    }

    ti.xcom_push(key="slack_message", value=json.dumps(message))
    log.info("%d service(s) down: %s", len(down_services), [s.get("Id") for s in down_services])


def send_to_slack(**context):
    """Post the formatted message to Slack webhook."""
    ti = context["ti"]
    raw_message = ti.xcom_pull(task_ids="filter_and_format", key="slack_message")

    if not raw_message:
        log.info("No message to send (check_services returned no output)")
        return

    webhook_url = Variable.get("slack_webhook_url", default_var=None)
    if not webhook_url:
        log.warning("slack_webhook_url Airflow Variable not set - skipping notification")
        return

    message = json.loads(raw_message)

    response = requests.post(webhook_url, json=message, timeout=10)
    response.raise_for_status()
    log.info("Slack notification sent successfully")


with DAG(
    dag_id="host_systemd_service_monitor",
    default_args=default_args,
    description="Monitor systemd services on host and alert Slack when services are down",
    schedule="*/30 * * * *",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["monitoring", "systemd", "slack"],
) as dag:

    task_check = PythonOperator(
        task_id="check_services",
        python_callable=check_services,
    )

    task_filter = PythonOperator(
        task_id="filter_and_format",
        python_callable=filter_and_format,
    )

    task_notify = PythonOperator(
        task_id="send_to_slack",
        python_callable=send_to_slack,
    )

    task_check >> task_filter >> task_notify
