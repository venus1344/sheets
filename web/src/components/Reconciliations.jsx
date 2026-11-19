import { useEffect, useState } from 'react';
import { api } from '../api.js';
import StatusBadge from './StatusBadge.jsx';
import Modal from './Modal.jsx';
import { EyeIcon } from './icons.jsx';
import { friendlyType, formatDateTime } from '../format.js';

const FIELD_LABELS = {
    name: 'Name',
    department: 'Department',
    value: 'Value',
    date: 'Date',
    reportDate: 'Report date',
    type: 'Type',
    reportedBy: 'Reported by',
    notes: 'Notes',
    incidentId: 'Incident ID',
    email: 'Email',
};

const label = (key) => FIELD_LABELS[key] || key;

/** Values of a deleted row, minus the id column that is shown separately. */
const summarise = (record) => Object.entries(record || {})
    .filter(([key]) => key !== 'email' && key !== 'incidentId')
    .map(([key, value]) => `${label(key)}: ${value === '' ? '—' : value}`)
    .join(' · ');

function Section({ title, total, shown, children, empty }) {
    return (
        <section className="detail-section">
            <h4 className="detail-heading">
                {title} <span className="muted small">({total} {total === 1 ? 'record' : 'records'})</span>
            </h4>
            {children || <p className="muted small">{empty}</p>}
            {shown != null && total > shown && (
                <p className="muted small">Showing the first {shown} of {total} records.</p>
            )}
        </section>
    );
}

function RunDetails({ row }) {
    const stats = row.stats || {};
    const details = row.details;
    const updated = details?.updated || [];
    const deleted = details?.deleted || [];

    return (
        <div>
            <div className="stat-row">
                <span className="badge gray">Checked {stats.checked ?? '—'}</span>
                <span className="badge gray">Added {stats.added ?? '—'}</span>
                <span className="badge amber">Updated {stats.updated ?? '—'}</span>
                <span className="badge red">Deleted {stats.deleted ?? '—'}</span>
            </div>

            {!details ? (
                <p className="muted small">
                    This run was recorded before change details were captured, so only the
                    totals above are available.
                </p>
            ) : (
                <>
                    <Section
                        title="Updated"
                        total={details.updatedTotal ?? updated.length}
                        shown={updated.length}
                        empty="Nothing needed updating."
                    >
                        {updated.length > 0 && (
                            <table className="table detail-table">
                                <thead>
                                    <tr><th>Record</th><th>Field</th><th>Was</th><th>Now</th></tr>
                                </thead>
                                <tbody>
                                    {updated.flatMap((entry) => entry.changes.map((change, i) => (
                                        <tr key={`${entry.key}-${change.field}-${i}`}>
                                            <td className="small mono">{entry.key}</td>
                                            <td className="small">{change.field}</td>
                                            <td className="small muted">{change.from === '' ? '—' : change.from}</td>
                                            <td className="small">{change.to === '' ? '—' : change.to}</td>
                                        </tr>
                                    )))}
                                </tbody>
                            </table>
                        )}
                    </Section>

                    <Section
                        title="Deleted"
                        total={details.deletedTotal ?? deleted.length}
                        shown={deleted.length}
                        empty="Nothing was deleted."
                    >
                        {deleted.length > 0 && (
                            <table className="table detail-table">
                                <thead>
                                    <tr><th>Record</th><th>Last known values</th></tr>
                                </thead>
                                <tbody>
                                    {deleted.map((entry) => (
                                        <tr key={entry.key}>
                                            <td className="small mono">{entry.key}</td>
                                            <td className="small">{summarise(entry.record) || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Section>
                </>
            )}
        </div>
    );
}

export default function Reconciliations() {
    const [rows, setRows] = useState([]);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        api.reconciliations().then((d) => setRows(d.reconciliations || [])).catch((e) => setError(e.message));
    }, []);

    return (
        <div>
            <h2>Reconciliations</h2>
            {error && <div className="error" role="alert">{error}</div>}
            <p className="muted small">Select a run to see which records were updated or deleted.</p>

            <table className="table">
                <thead>
                    <tr><th>Type</th><th>Status</th><th>Checked</th><th>Added</th><th>Updated</th><th>Deleted</th><th>When</th><th /></tr>
                </thead>
                <tbody>
                    {rows.map((r) => {
                        const s = r.stats || null;
                        return (
                            <tr key={r.id} className="clickable-row" onClick={() => setSelected(r)}>
                                <td>{friendlyType(r.type)}</td>
                                <td><StatusBadge status={r.status} /></td>
                                <td className="small">{s ? s.checked : '—'}</td>
                                <td className="small muted">{s ? s.added : '—'}</td>
                                <td className="small">
                                    {s && s.updated > 0 ? <span className="badge amber">{s.updated}</span> : (s ? 0 : '—')}
                                </td>
                                <td className="small">
                                    {s && s.deleted > 0 ? <span className="badge red">{s.deleted}</span> : (s ? 0 : '—')}
                                </td>
                                <td className="small muted">{formatDateTime(r.created_at)}</td>
                                <td className="actions">
                                    <button
                                        type="button"
                                        className="icon-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelected(r);
                                        }}
                                        aria-label={`View details for ${friendlyType(r.type)} run on ${formatDateTime(r.created_at)}`}
                                        title="View details"
                                    >
                                        <EyeIcon />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    {rows.length === 0 && <tr><td colSpan={8} className="muted">No runs yet.</td></tr>}
                </tbody>
            </table>

            {selected && (
                <Modal
                    wide
                    title={`Reconciliation · ${friendlyType(selected.type)}`}
                    subtitle={formatDateTime(selected.created_at)}
                    onClose={() => setSelected(null)}
                    footer={<button className="btn secondary" onClick={() => setSelected(null)}>Close</button>}
                >
                    <RunDetails row={selected} />
                </Modal>
            )}
        </div>
    );
}
