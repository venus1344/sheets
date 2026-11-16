import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Overview from './Overview.jsx';
import DagRuns from './DagRuns.jsx';
import Failures from './Failures.jsx';
import Reconciliations from './Reconciliations.jsx';

const VIEWS = {
    overview: { label: 'Overview', component: Overview },
    dags: { label: 'DAG Runs', component: DagRuns },
    failures: { label: 'Failures', component: Failures },
    reconciliations: { label: 'Reconciliations', component: Reconciliations },
};

function currentView() {
    const hash = window.location.hash.replace(/^#\/?/, '');
    return VIEWS[hash] ? hash : 'overview';
}

export default function Layout({ user, onLogout }) {
    const [view, setView] = useState(currentView());

    useEffect(() => {
        const onHash = () => setView(currentView());
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    const Active = VIEWS[view].component;

    const logout = async () => {
        await api.logout().catch(() => {});
        onLogout();
    };

    return (
        <div className="shell">
            <aside className="sidebar">
                <div className="brand">Sheets Sync</div>
                <nav>
                    {Object.entries(VIEWS).map(([key, v]) => (
                        <a key={key} href={`#/${key}`} className={key === view ? 'active' : ''}>
                            {v.label}
                        </a>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <div className="muted small">{user.email}</div>
                    <button className="link" onClick={logout}>Sign out</button>
                </div>
            </aside>
            <main className="content">
                <Active />
            </main>
        </div>
    );
}
