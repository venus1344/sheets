import { useEffect, useState } from 'react';
import { api } from '../api.js';
import StatusBadge from './StatusBadge.jsx';
import { friendlyType, formatDateTime } from '../format.js';

export default function Reconciliations() {
    const [rows, setRows] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        api.reconciliations().then((d) => setRows(d.reconciliations || [])).catch((e) => setError(e.message));
    }, []);

    return (
        <div>
            <h2>Reconciliations</h2>
            {error && <div className="error">{error}</div>}
            <table className="table">
                <thead>
                    <tr><th>Type</th><th>Status</th><th>Checked</th><th>Added</th><th>Updated</th><th>Deleted</th><th>When</th></tr>
                </thead>
                <tbody>
                    {rows.map((r) => {
                        const s = r.stats_json ? JSON.parse(r.stats_json) : null;
                        return (
                            <tr key={r.id}>
                                <td>{friendlyType(r.type)}</td>
                                <td><StatusBadge status={r.status} /></td>
                                <td className="small">{s ? s.checked : '—'}</td>
                                <td className="small">{s ? s.added : '—'}</td>
                                <td className="small">{s ? s.updated : '—'}</td>
                                <td className="small">{s ? s.deleted : '—'}</td>
                                <td className="small muted">{formatDateTime(r.created_at)}</td>
                            </tr>
                        );
                    })}
                    {rows.length === 0 && <tr><td colSpan={7} className="muted">No runs yet.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}
