import { useEffect, useState } from 'react';
import { api } from '../api.js';
import StatusBadge from './StatusBadge.jsx';
import { friendlyDag, formatDateTime } from '../format.js';

export default function DagRuns() {
    const [dags, setDags] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        api.dags().then((d) => setDags(d.dags)).catch((e) => setError(e.message));
    }, []);

    return (
        <div>
            <h2>DAG Runs</h2>
            {error && <div className="error">{error}</div>}
            <table className="table">
                <thead>
                    <tr><th>DAG</th><th>Run</th><th>Status</th><th>Finished</th><th>Error</th></tr>
                </thead>
                <tbody>
                    {dags.map((r) => (
                        <tr key={r.id}>
                            <td>{friendlyDag(r.dag_id)}</td>
                            <td className="small mono">{r.run_id}</td>
                            <td><StatusBadge status={r.status} /></td>
                            <td className="small">{formatDateTime(r.finished_at)}</td>
                            <td className="small muted">{r.error_message || '—'}</td>
                        </tr>
                    ))}
                    {dags.length === 0 && <tr><td colSpan={5} className="muted">No runs yet.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}
