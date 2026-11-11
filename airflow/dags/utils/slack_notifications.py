from __future__ import annotations

import logging

import requests
from airflow.models import Variable

log = logging.getLogger(__name__)


def notify_slack_on_failure(context: dict) -> None:
    """
    Airflow on_failure_callback that posts a DAG/task failure alert to Slack.

    Set the Airflow Variable 'slack_webhook_url' to your Slack Incoming Webhook URL.
    If the variable is not set, the callback is a no-op (DAG still runs normally).

    Usage in default_args:
        from utils.slack_notifications import notify_slack_on_failure

        default_args = {
            ...
            "on_failure_callback": notify_slack_on_failure,
        }
    """
    webhook_url = Variable.get("slack_webhook_url", default_var=None)
    if not webhook_url:
        log.warning("slack_webhook_url Airflow Variable not set — skipping Slack notification")
        return

    dag_id = context.get("dag").dag_id
    task_id = context.get("task_instance").task_id
    execution_date = context.get("execution_date")
    log_url = context.get("task_instance").log_url
    exception = context.get("exception")

    exception_text = f"\n*Exception:* `{exception}`" if exception else ""

    payload = {
        "attachments": [
            {
                "color": "#FF0000",
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": ":red_circle: DAG Failure Alert",
                        },
                    },
                    {
                        "type": "section",
                        "fields": [
                            {"type": "mrkdwn", "text": f"*DAG:*\n{dag_id}"},
                            {"type": "mrkdwn", "text": f"*Task:*\n{task_id}"},
                            {"type": "mrkdwn", "text": f"*Execution Date:*\n{execution_date}"},
                        ],
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"<{log_url}|View task log>{exception_text}",
                        },
                    },
                ],
            }
        ]
    }

    try:
        response = requests.post(webhook_url, json=payload, timeout=10)
        response.raise_for_status()
        log.info("Slack failure notification sent for %s.%s", dag_id, task_id)
    except requests.exceptions.RequestException as e:
        # Never let the notification failure mask the original task failure
        log.error("Failed to send Slack notification: %s", e)
