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
