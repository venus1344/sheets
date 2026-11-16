const STATUS_MAP = {
    succeeded: { label: 'Succeeded', className: 'green' },
    completed: { label: 'Completed', className: 'green' },
    failed: { label: 'Failed', className: 'red' },
    started: { label: 'Running', className: 'amber' },
    processing: { label: 'Processing', className: 'amber' },
    pending: { label: 'Pending', className: 'gray' },
};

export default function StatusBadge({ status }) {
    const m = STATUS_MAP[status] || { label: status, className: 'gray' };
    return <span className={`badge ${m.className}`}>{m.label}</span>;
}
