import { useEffect, useState } from 'react';
import { api } from '../api.js';
import PasswordInput from './PasswordInput.jsx';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('office_admin');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    const load = async () => {
        try {
            const data = await api.users();
            setUsers(data.users || []);
        } catch (e) {
            setError(e.message);
        }
    };

    useEffect(() => { load(); }, []);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setBusy(true);
        try {
            await api.createUser(email.trim(), password, role);
            setMessage(`Added ${email.trim()}`);
            setEmail('');
            setPassword('');
            setRole('office_admin');
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <h2>Users</h2>

            <form className="card" onSubmit={submit} style={{ marginBottom: 16 }}>
                <div className="grid">
                    <label>Email
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
                    </label>
                    <PasswordInput
                        id="new-user-password"
                        label="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                        minLength={8}
                    />
                    <label>Role
                        <select value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="office_admin">Office admin</option>
                            <option value="technical">Technical</option>
                        </select>
                    </label>
                </div>
                <p className="hint" style={{ margin: '0 0 12px' }}>Password must be at least 8 characters. Role decides what this person can do: office admins retry failures, technical users also manage accounts.</p>
                {error && <div className="error" role="alert">{error}</div>}
                {message && <div className="ok" role="status">{message}</div>}
                <button className="btn" type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add user'}</button>
            </form>

            <table className="table">
                <thead>
                    <tr><th>Email</th><th>Role</th><th>Created</th></tr>
                </thead>
                <tbody>
                    {users.map((u) => (
                        <tr key={u.id}>
                            <td>{u.email}</td>
                            <td>{u.role === 'technical' ? <span className="badge amber">technical</span> : <span className="badge gray">office admin</span>}</td>
                            <td className="small muted">{u.created_at}</td>
                        </tr>
                    ))}
                    {users.length === 0 && <tr><td colSpan={3} className="muted">No users yet.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}
