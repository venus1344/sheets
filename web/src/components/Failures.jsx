import { useEffect, useState } from 'react';
import { api } from '../api.js';

const PAGE_SIZE = 50;

export default function Failures() {
    const [type, setType] = useState('users');
    const [page, setPage] = useState(0);
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [busyId, setBusyId] = useState(null);

    const load = async (t, p) => {
        setError('');
        try {
            const data = await api.updates(t, 'failed', PAGE_SIZE, p * PAGE_SIZE);
            setRows(data.updates || []);
            setTotal(data.total || 0);
        } catch (e) {
            setError(e.message);
        }
    };

    useEffect(() => { load(type, page); }, [type, page]);

    const switchType = (t) => {
        setMessage('');
        setPage(0);
        setType(t);
    };

    const retry = async (updateId) => {
        setError('');
        setMessage('');
        setBusyId(updateId);
        try {
            const res = await api.retry(type, updateId);
            setMessage(res.escalated ? 'Escalated to support.' : 'Retry queued.');

            // A retried row leaves the "failed" set; step back if the page empties.
            const remaining = Math.max(0, total - 1);
            const lastPage = Math.max(0, Math.ceil(remaining / PAGE_SIZE) - 1);
            if (page > lastPage) {
                setPage(lastPage);
            } else {
                await load(type, page);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setBusyId(null);
        }
    };

    const recordLabel = (row) => (type === 'users'
        ? (row.payload.email || row.id)
        : (row.payload.incidentId || row.id));

    const recordDate = (row) => (type === 'users'
        ? (row.payload.date || '—')
        : (row.payload.reportDate || '—'));

    const start = total === 0 ? 0 : page * PAGE_SIZE + 1;
    const end = Math.min((page + 1) * PAGE_SIZE, total);
    const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

    return (
        <div>
            <h2>Failures</h2>
            <div className="tabs">
                <button className={`tab ${type === 'users' ? 'active' : ''}`} onClick={() => switchType('users')}>Users</button>
                <button className={`tab ${type === 'incidents' ? 'active' : ''}`} onClick={() => switchType('incidents')}>Incidents</button>
            </div>
            {error && <div className="error" role="alert">{error}</div>}
            {message && <div className="ok" role="status">{message}</div>}
            <table className="table">
                <thead>
                    <tr><th>Date</th><th>Record</th><th>Error</th><th>Retries</th><th>State</th><th>Failed</th><th></th></tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.id}>
                            <td className="small">{recordDate(r)}</td>
                            <td className="small">{recordLabel(r)}</td>
                            <td className="small muted">{r.error_message}</td>
                            <td className="small">{r.retry_count}/{r.max_retries}</td>
                            <td>
                                {r.escalated
                                    ? <span className="badge red">Escalated</span>
                                    : <span className="badge amber">Failed</span>}
                            </td>
                            <td className="small muted">{r.created_at}</td>
                            <td>
                                {!r.escalated && (
                                    <button className="btn secondary" onClick={() => retry(r.id)} disabled={busyId === r.id}>
                                        {busyId === r.id ? 'Retrying…' : 'Retry'}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={7} className="muted">No failed updates.</td></tr>}
                </tbody>
            </table>
            <div className="pager">
                <button className="btn secondary" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Previous</button>
                <span className="muted small">{total === 0 ? 'Nothing to show' : `Showing ${start}–${end} of ${total}`}</span>
                <button className="btn secondary" onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={page >= lastPage}>Next</button>
            </div>
        </div>
    );
}

