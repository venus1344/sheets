from __future__ import annotations

import logging

import requests
from airflow.models import Variable

log = logging.getLogger(__name__)

HEARTBEAT_PATH = "/api/dags/heartbeat"


def get_config() -> dict:
    return {
        "webhook_url": Variable.get("sheets_webhook_url", default_var="http://localhost:3500"),
        "api_key": Variable.get("sheets_api_key"),
        "client_id": Variable.get("sheets_client_id", default_var=None),
    }


def post_heartbeat(dag_id: str, run_id: str, status: str, error: str | None = None) -> None:
    """POST a started/succeeded/failed heartbeat to the sheets backend."""
    config = get_config()

    headers = {
        "Content-Type": "application/json",
        "X-API-Key": config["api_key"],
    }
    if config["client_id"]:
        headers["X-Client-Id"] = config["client_id"]

    payload = {"dagId": dag_id, "runId": run_id, "status": status}
    if error:
        payload["error"] = error

    try:
        response = requests.post(
            f"{config['webhook_url']}{HEARTBEAT_PATH}",
            json=payload,
            headers=headers,
            timeout=15,
        )
        response.raise_for_status()
        log.info("Heartbeat sent: %s %s %s", dag_id, run_id, status)
    except requests.exceptions.RequestException as exc:
        log.error("Failed to send heartbeat for %s (%s): %s", dag_id, status, exc)


def make_callbacks(dag_id: str):
    """Return (on_success, on_failure) callbacks that report terminal run status."""

    def on_success(context):
        run_id = context.get("dag_run").run_id
        post_heartbeat(dag_id, run_id, "succeeded")

    def on_failure(context):
        run_id = context.get("dag_run").run_id
        exception = context.get("exception")
        post_heartbeat(dag_id, run_id, "failed", error=str(exception) if exception else "DAG run failed")

    return on_success, on_failure


def report_started(dag_id: str):
    """Return a PythonOperator callable that reports the run as started."""

    def _report_started(**context):
        run_id = context.get("dag_run").run_id
        post_heartbeat(dag_id, run_id, "started")

    return _report_started
