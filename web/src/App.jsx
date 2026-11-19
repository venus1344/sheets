import { useEffect, useState } from 'react';
import { api } from './api.js';
import Login from './components/Login.jsx';
import Layout from './components/Layout.jsx';

export default function App() {
    const [user, setUser] = useState(undefined); // undefined = loading

    useEffect(() => {
        api.me()
            .then((data) => setUser(data.user))
            .catch(() => setUser(null));
    }, []);

    if (user === undefined) {
        return <div className="center muted">Loading…</div>;
    }

    if (!user) {
        return <Login onLogin={setUser} />;
    }

    return <Layout user={user} onLogout={() => setUser(null)} />;
}
