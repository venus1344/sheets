import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Failures() {
    const [type, setType] = useState('users');
    const [rows, setRows] = useState([]);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const load = async (t) => {
        setError('');
        setMessage('');
        try {
            const data = await api.updates(t, 'failed');
            setRows(data.updates || []);
        } catch (e) {
            setError(e.message);
        }
    };

    useEffect(() => { load(type); }, [type]);

    const retry = async (updateId) => {
        setError('');
        setMessage('');
        try {
            const res = await api.retry(type, updateId);
            setMessage(res.escalated ? 'Escalated to support.' : 'Retry queued.');
            await load(type);
        } catch (e) {
            setError(e.message);
        }
    };

    const recordLabel = (row) => (type === 'users'
        ? (row.payload.email || row.id)
        : (row.payload.incidentId || row.id));

    return (
        <div>
            <h2>Failures</h2>
            <div className="tabs">
                <button className={`tab ${type === 'users' ? 'active' : ''}`} onClick={() => setType('users')}>Users</button>
                <button className={`tab ${type === 'incidents' ? 'active' : ''}`} onClick={() => setType('incidents')}>Incidents</button>
            </div>
            {error && <div className="error">{error}</div>}
            {message && <div className="ok">{message}</div>}
            <table className="table">
                <thead>
                    <tr><th>Record</th><th>Error</th><th>Retries</th><th>State</th><th></th></tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.id}>
                            <td className="small">{recordLabel(r)}</td>
                            <td className="small muted">{r.error_message}</td>
                            <td className="small">{r.retry_count}/{r.max_retries}</td>
                            <td>
                                {r.escalated
                                    ? <span className="badge red">Escalated</span>
                                    : <span className="badge amber">Failed</span>}
                            </td>
                            <td>
                                {!r.escalated && (
                                    <button className="btn" onClick={() => retry(r.id)}>Retry</button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={5} className="muted">No failed updates.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}
