import json
import logging
import requests
import urllib.parse

from datetime import datetime, timedelta
from airflow import DAG
from airflow.models import Variable
from airflow.operators.python import PythonOperator
from airflow.exceptions import AirflowException

logger = logging.getLogger(__name__)

# API Base URL
SAVANNAH_API_BASE = "https://api.savannahtracking.co.ke/APIV3/APIService"


def get_config():
    """Get API credentials from Airflow Variables."""
    return {
        "api_user": Variable.get("savannah_api_user"),
        "api_password": Variable.get("savannah_api_pswd"),
        "destination_url": Variable.get("savannah_destination_url"),
        "destination_api_key": Variable.get("savannah_destination_api_key"),
    }


def build_api_url(api_action, collar_id=None, record_id=None):
    """Build Savannah API URL with JSON-encoded query params."""
    config = get_config()
    params = {
        "uid": config["api_user"],
        "pwd": config["api_password"],
        "api_action": api_action,
    }
    if collar_id is not None:
        params["collar_id"] = collar_id
    if record_id is not None:
        params["id"] = record_id

    json_params = json.dumps(params)
    encoded_params = urllib.parse.quote(json_params)
    return f"{SAVANNAH_API_BASE}?{encoded_params}"


def get_collar_list(**context):
    """Fetch list of collar IDs from Savannah API."""
    url = build_api_url(api_action="get_collar_list")
    logger.info("Fetching collar list from Savannah API")

    response = requests.get(url, timeout=60)
    response.raise_for_status()

    data = response.json()

    # Handle response format: {'success': True, 'error_msg': '', 'records': [...]}
    if isinstance(data, dict):
        if not data.get("success", True):
            raise Exception(f"API error: {data.get('error_msg', 'Unknown error')}")
        collar_list = data.get("records", data.get("collars", []))
    elif isinstance(data, list):
        collar_list = data
    else:
        collar_list = []

    # Extract collar IDs - records can be strings directly or dicts
    collar_ids = []
    for item in collar_list:
        if isinstance(item, dict):
            collar_id = item.get("collar_id") or item.get("id")
            if collar_id:
                collar_ids.append(str(collar_id))
        else:
            collar_ids.append(str(item))

    logger.info(f"Found {len(collar_ids)} collars: {collar_ids}")
    return collar_ids


def get_latest_id_variable(collar_id):
    """Get the Variable name for a collar's latest ID cursor."""
    return f"savannah_collar_{collar_id}_latest_id"


def poll_collar_data(**context):
    """Poll data for each collar with pagination support."""
    ti = context["ti"]
    collar_ids = ti.xcom_pull(task_ids="get_collar_list")

    if not collar_ids:
        logger.warning("No collars to poll")
        return []

    collar_results = []
    collars_succeeded = 0
    collars_failed = 0
    total_records = 0

    for collar_id in collar_ids:
        try:
            result = poll_single_collar(collar_id)
            collar_results.append(result)
            collars_succeeded += 1
            total_records += len(result["records"])
        except Exception as e:
            collars_failed += 1
            logger.error(f"Collar {collar_id}: failed to poll - {e}")
            # Continue with other collars

    logger.info(
        f"Polling complete: {collars_succeeded} collars succeeded, "
        f"{collars_failed} failed, {total_records} total records"
    )

    if collars_succeeded == 0 and collars_failed > 0:
        raise AirflowException("All collars failed to poll")

    # Return list of {collar_id, records, max_id_seen} for each collar
    return collar_results


def poll_single_collar(collar_id):
    """
    Poll a single page of data for a collar.

    Fetches one page only - next scheduled run continues from where this ended.
    Cursor is NOT updated here - updated only after successful posting.
    """
    variable_name = get_latest_id_variable(collar_id)

    # Get current cursor (default to "0" for first run)
    latest_id = Variable.get(variable_name, default_var="0")

    logger.info(f"Collar {collar_id}: starting from id={latest_id}")

    url = build_api_url(
        api_action="get_data",
        collar_id=collar_id,
        record_id=latest_id
    )

    response = requests.get(url, timeout=60)
    response.raise_for_status()

    data = response.json()

    # Handle response format: {success, has_more_records, records: [...]}
    if isinstance(data, dict):
        if not data.get("success", True):
            raise Exception(f"API error: {data.get('error_msg', 'Unknown error')}")
        records = data.get("records", data.get("data", []))
    elif isinstance(data, list):
        records = data
    else:
        records = []

    if not records:
        logger.info(f"Collar {collar_id}: no new records")
        return {"records": [], "max_id_seen": 0, "collar_id": collar_id}

    # Track max ID seen and add collar_id to each record
    max_id_seen = int(latest_id) if latest_id.isdigit() else 0
    for record in records:
        if isinstance(record, dict):
            record["collar_id"] = collar_id
            record_id = record.get("id")
            if record_id is not None:
                try:
                    record_id_int = int(record_id)
                    if record_id_int > max_id_seen:
                        max_id_seen = record_id_int
                except (ValueError, TypeError):
                    pass

    logger.info(f"Collar {collar_id}: fetched {len(records)} records, max_id={max_id_seen}")

    # Return records with max_id_seen attached for cursor update after posting
    return {"records": records, "max_id_seen": max_id_seen, "collar_id": collar_id}


def build_osmand_params(record):
    """
    Convert a Savannah collar record to OsmAnd protocol parameters.

    Savannah record format:
    {
        "id": 47165898,          # record ID (not used for device)
        "gps_time": "2023-11-11 08:14:36",
        "battery": 4.13,
        "longitude": 39.87722,
        "latitude": -3.606882,
        "hdop": 0.0,
        "speed": 0.0,
        "collar_id": "IRI2023-6191"  # added by poll_single_collar
    }

    OsmAnd format: ?id=DEVICE_ID&lat=LAT&lon=LON&timestamp=TIMESTAMP&speed=SPEED&batt=BATTERY
    """
    params = {}

    # Device ID (required) - use collar_id (added by our code)
    device_id = record.get("collar_id")
    if not device_id:
        return params
    params["id"] = device_id

    # Location
    lat = record.get("latitude")
    lon = record.get("longitude")
    if lat is not None:
        params["lat"] = lat
    if lon is not None:
        params["lon"] = lon

    # Timestamp - convert gps_time to Unix epoch
    gps_time = record.get("gps_time")
    if gps_time is not None:
        try:
            dt = datetime.strptime(gps_time, "%Y-%m-%d %H:%M:%S")
            params["timestamp"] = int(dt.timestamp())
        except ValueError:
            # If parsing fails, pass as-is
            params["timestamp"] = gps_time

    # Speed (convert to knots if needed - Traccar default)
    speed = record.get("speed")
    if speed is not None and speed > 0:
        params["speed"] = speed

    # Battery - convert voltage to percentage (approximate: 3.0V=0%, 4.2V=100%)
    battery = record.get("battery")
    if battery is not None:
        try:
            battery_pct = max(0, min(100, (float(battery) - 3.0) / 1.2 * 100))
            params["batt"] = round(battery_pct)
        except (ValueError, TypeError):
            pass

    # HDOP - only include if > 0
    hdop = record.get("hdop")
    if hdop is not None and hdop > 0:
        params["hdop"] = hdop

    return params


def post_to_destination(**context):
    """
    POST each record to Traccar using OsmAnd protocol.

    Cursor is only updated for a collar if ALL its records post successfully.
    Task fails if any collar has posting failures.
    """
    ti = context["ti"]
    collar_results = ti.xcom_pull(task_ids="poll_collar_data")

    if not collar_results:
        logger.info("No records to post")
        return {"success": 0, "failed": 0, "collars_updated": 0}

    config = get_config()
    destination_url = config["destination_url"]  # e.g., http://traccar-server:5055

    total_success = 0
    total_failed = 0
    collars_updated = 0
    collars_with_failures = []

    for collar_result in collar_results:
        collar_id = collar_result["collar_id"]
        records = collar_result["records"]
        max_id_seen = collar_result["max_id_seen"]

        if not records:
            logger.info(f"Collar {collar_id}: no records to post")
            continue

        collar_success = 0
        collar_failed = 0

        for record in records:
            try:
                params = build_osmand_params(record)

                if not params.get("id"):
                    logger.warning(f"Collar {collar_id}: skipping record - no device ID")
                    collar_failed += 1
                    continue

                if not params.get("lat") or not params.get("lon"):
                    logger.warning(f"Collar {collar_id}: skipping record - no location data")
                    collar_failed += 1
                    continue

                # OsmAnd protocol uses GET request with query parameters
                logger.debug(f"Collar {collar_id}: sending params {params}")
                response = requests.get(
                    destination_url,
                    params=params,
                    timeout=30
                )

                if response.status_code != 200:
                    logger.error(
                        f"Collar {collar_id}: HTTP {response.status_code} - "
                        f"URL: {response.url} - Response: {response.text}"
                    )
                    response.raise_for_status()

                collar_success += 1

            except requests.exceptions.HTTPError as e:
                collar_failed += 1
                logger.error(
                    f"Collar {collar_id}: HTTP error - {e} - "
                    f"Response body: {e.response.text if e.response else 'N/A'}"
                )
            except Exception as e:
                collar_failed += 1
                logger.error(f"Collar {collar_id}: failed to post record - {type(e).__name__}: {e}")

        total_success += collar_success
        total_failed += collar_failed

        # Only update cursor if ALL records for this collar succeeded
        if collar_failed == 0 and collar_success > 0:
            variable_name = get_latest_id_variable(collar_id)
            Variable.set(variable_name, str(max_id_seen))
            collars_updated += 1
            logger.info(f"Collar {collar_id}: posted {collar_success} records, cursor updated to {max_id_seen}")
        elif collar_failed > 0:
            collars_with_failures.append(collar_id)
            logger.error(
                f"Collar {collar_id}: {collar_failed} failures, {collar_success} success - cursor NOT updated"
            )

    logger.info(
        f"POST complete: {total_success} succeeded, {total_failed} failed, "
        f"{collars_updated} collars updated"
    )

    # Fail the task if any collar had failures
    if collars_with_failures:
        raise AirflowException(
            f"Posting failed for collars: {collars_with_failures}. Cursors not updated for these collars."
        )

    return {"success": total_success, "failed": total_failed, "collars_updated": collars_updated}


# DAG Definition
default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 3,
    "retry_delay": timedelta(minutes=2),
}

with DAG(
    dag_id="savannah_collar_polling",
    default_args=default_args,
    description="Poll Savannah Tracking API for collar data and forward to destination",
    schedule="30 * * * *",
    start_date=datetime(2026, 2, 17),
    catchup=False,
    tags=["savannah", "collars", "polling"],
) as dag:

    task_get_collar_list = PythonOperator(
        task_id="get_collar_list",
        python_callable=get_collar_list,
    )

    task_poll_collar_data = PythonOperator(
        task_id="poll_collar_data",
        python_callable=poll_collar_data,
    )

    task_post_to_destination = PythonOperator(
        task_id="post_to_destination",
        python_callable=post_to_destination,
    )

    # Define task dependencies
    task_get_collar_list >> task_poll_collar_data >> task_post_to_destination
