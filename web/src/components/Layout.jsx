import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Overview from './Overview.jsx';
import DagRuns from './DagRuns.jsx';
import Failures from './Failures.jsx';
import Reconciliations from './Reconciliations.jsx';
import Users from './Users.jsx';

function viewFromHash(views) {
    const hash = window.location.hash.replace(/^#\/?/, '');
    return views[hash] ? hash : 'overview';
}

export default function Layout({ user, onLogout }) {
    const views = {
        overview: { label: 'Overview', component: Overview },
        dags: { label: 'DAG Runs', component: DagRuns },
        failures: { label: 'Failures', component: Failures },
        reconciliations: { label: 'Reconciliations', component: Reconciliations },
        ...(user.role === 'technical' ? { users: { label: 'Users', component: Users } } : {}),
    };

    const [view, setView] = useState(() => viewFromHash(views));

    useEffect(() => {
        const onHash = () => setView(viewFromHash(views));
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
        // role is fixed for the session, so the initial `views` is stable here.
    }, []);

    const Active = (views[view] || views.overview).component;

    const logout = async () => {
        await api.logout().catch(() => { });
        onLogout();
    };

    return (
        <div className="shell">
            <aside className="sidebar">
                <div className="brand">Sheets Sync</div>
                <nav>
                    {Object.entries(views).map(([key, v]) => (
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
