import { useEffect, useState } from 'react';
import { api } from '../api.js';
import StatusBadge from './StatusBadge.jsx';
import { friendlyDag, friendlyAlert, friendlyType, formatDateTime } from '../format.js';

const successRate = (completed, failed) => {
    const total = completed + failed;
    return total === 0 ? null : Math.round((completed / total) * 100);
};

export default function Overview() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loadedAt, setLoadedAt] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        setRefreshing(true);
        setError('');
        try {
            setData(await api.overview());
            setLoadedAt(new Date());
        } catch (e) {
            setError(e.message);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []);

    if (error && !data) return <div className="error" role="alert">{error}</div>;
    if (!data) return <div className="muted">Loading…</div>;

    const latestByDag = {};
    for (const run of data.dags || []) {
        if (!latestByDag[run.dag_id]) latestByDag[run.dag_id] = run;
    }

    return (
        <div>
            <div className="row-between" style={{ marginBottom: 4 }}>
                <h2>Overview</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="muted small">
                        {loadedAt ? `Updated ${loadedAt.toLocaleTimeString()}` : ''}
                    </span>
                    <button className="btn secondary" onClick={load} disabled={refreshing}>
                        {refreshing ? 'Refreshing…' : 'Refresh'}
                    </button>
                </div>
            </div>
            {error && <div className="error" role="alert">{error}</div>}

            <h3>DAGs</h3>
            <div className="grid">
                {Object.keys(latestByDag).length === 0 && <span className="muted">No DAG runs yet.</span>}
                {Object.entries(latestByDag).map(([dagId, run]) => (
                    <div className="card" key={dagId}>
                        <div className="card-title">{friendlyDag(dagId)}</div>
                        <div className="row-between">
                            <StatusBadge status={run.status} />
                            <span className="muted small">
                                {run.finished_at ? formatDateTime(run.finished_at) : '—'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <h3>Queue success · last 24h</h3>
            <div className="grid">
                {[{ key: 'users', label: 'Users' }, { key: 'incidents', label: 'Incidents' }].map((q) => {
                    const s = data.queues[q.key] || {};
                    const rate = successRate(s.completed_24h || 0, s.failed_24h || 0);
                    return (
                        <div className="card" key={q.key}>
                            <div className="card-title">{q.label}</div>
                            <div className="big">{rate === null ? '—' : `${rate}%`}</div>
                            <div className="muted small">
                                {s.completed_24h || 0} ok · {s.failed_24h || 0} failed · {s.escalated || 0} escalated
                            </div>
                        </div>
                    );
                })}
            </div>

            <h3>Data sync</h3>
            <div className="grid">
                {['users', 'incidents'].map((type) => {
                    const r = data.reconciliation[type];
                    return (
                        <div className="card" key={type}>
                            <div className="card-title">Reconciliation · {friendlyType(type)}</div>
                            {r ? (
                                <>
                                    <span className={`badge ${r.inSync ? 'green' : 'red'}`}>
                                        {r.inSync ? 'In sync' : 'Out of sync'}
                                    </span>
                                    {r.stats && (
                                        <div className="muted small">
                                            +{r.stats.added} added · ~{r.stats.updated} updated · −{r.stats.deleted} deleted
                                        </div>
                                    )}
                                </>
                            ) : (
                                <span className="muted">Not run yet</span>
                            )}
                        </div>
                    );
                })}
            </div>

            <h3>Recent alerts</h3>
            {(data.alerts || []).length === 0 ? (
                <span className="muted">No alerts.</span>
            ) : (
                <ul className="list">
                    {data.alerts.map((a) => (
                        <li key={a.id}>
                            <span className="badge gray">{friendlyAlert(a.alert_type)}</span>
                            <span>{a.subject}</span>
                            <span className="muted small">{formatDateTime(a.created_at)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
