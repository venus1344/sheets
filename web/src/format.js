const DAG_LABELS = {
    incident_log_to_sheets: 'Incident Log → Sheets',
    user_summary_to_sheets: 'User Summary → Sheets',
    reconcile_sheets: 'Reconciliation',
};

const ALERT_LABELS = {
    dag_failure: 'DAG failure',
    dag_missed: 'DAG missed',
    queue_escalation: 'Queue escalation',
    reconciliation_mismatch: 'Reconciliation mismatch',
};

const TYPE_LABELS = {
    users: 'Users',
    incidents: 'Incidents',
};

function fromSnake(value) {
    return String(value ?? '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
}

export function friendlyDag(id) {
    return DAG_LABELS[id] || fromSnake(id);
}

export function friendlyAlert(type) {
    return ALERT_LABELS[type] || fromSnake(type);
}

export function friendlyType(type) {
    return TYPE_LABELS[type] || fromSnake(type);
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
});

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

/**
 * Parse an API timestamp as UTC.
 *
 * The API can return either a full ISO string ("...T09:12:00.000Z") or a bare
 * SQLite timestamp ("2026-11-17 09:12:00"), which SQLite stores in UTC without
 * a zone marker — reading that with `new Date()` would treat it as local time,
 * so the "Z" is appended explicitly.
 */
export function toDate(value) {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;

    const d = /(Z|[+-]\d{2}:?\d{2})$/i.test(raw)
        ? new Date(raw)
        : new Date(`${raw.replace(' ', 'T')}Z`);

    return Number.isNaN(d.getTime()) ? null : d;
}

const formatWith = (formatter, value) => {
    const d = toDate(value);
    if (d) return formatter.format(d);
    return value ? String(value) : '—';
};

/** Local date + time, with the zone abbreviation so "UTC" vs local is obvious. */
export function formatDateTime(value) {
    return formatWith(dateTimeFormatter, value);
}

/** Local date only, for "created on" style columns. */
export function formatDate(value) {
    return formatWith(dateFormatter, value);
}
