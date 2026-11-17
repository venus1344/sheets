import { useEffect, useState } from 'react';
import { api } from '../api.js';
import PasswordInput from './PasswordInput.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { TrashIcon, RestoreIcon } from './icons.jsx';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('office_admin');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [me, setMe] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);

    const load = async () => {
        try {
            const [usersData, meData] = await Promise.all([api.users(), api.me()]);
            setUsers(usersData.users || []);
            setMe(meData.user || null);
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

    const toggleDeleted = async (user) => {
        setError('');
        setMessage('');
        setBusyId(user.id);
        try {
            await api.setUserDeleted(user.id, !user.deleted_at);
            setMessage(user.deleted_at ? `${user.email} restored.` : `${user.email} deleted — access revoked.`);
            setPendingDelete(null);
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyId(null);
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
                <p className="hint" style={{ margin: '0 0 12px' }}>Password must be at least 8 characters. Role decides what this person can do: office admins retry failures, technical users also manage accounts. Deleting keeps the account and its history but revokes access immediately — you can restore it later.</p>
                {error && <div className="error" role="alert">{error}</div>}
                {message && <div className="ok" role="status">{message}</div>}
                <button className="btn" type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add user'}</button>
            </form>

            <table className="table">
                <thead>
                    <tr><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th /></tr>
                </thead>
                <tbody>
                    {users.map((u) => {
                        const isSelf = me && u.id === me.id;
                        const isDeleted = Boolean(u.deleted_at);
                        const isBusy = busyId === u.id;

                        return (
                            <tr key={u.id} className={isDeleted ? 'row-inactive' : ''}>
                                <td>{u.email}</td>
                                <td>{u.role === 'technical' ? <span className="badge amber">technical</span> : <span className="badge gray">office admin</span>}</td>
                                <td>
                                    {isDeleted
                                        ? <span className="badge gray" title={`Deleted ${u.deleted_at}`}>Deleted</span>
                                        : <span className="badge green">Active</span>}
                                </td>
                                <td className="small muted">{u.created_at}</td>
                                <td className="actions">
                                    {isSelf ? (
                                        <span className="small muted">This is you</span>
                                    ) : (
                                        <div className="row-actions">
                                            {isDeleted ? (
                                                <button
                                                    className="icon-btn"
                                                    onClick={() => toggleDeleted(u)}
                                                    disabled={isBusy}
                                                    aria-label={`Restore ${u.email}`}
                                                    title={`Restore ${u.email}`}
                                                >
                                                    <RestoreIcon />
                                                </button>
                                            ) : (
                                                <button
                                                    className="icon-btn danger"
                                                    onClick={() => setPendingDelete(u)}
                                                    disabled={isBusy}
                                                    aria-label={`Delete ${u.email}`}
                                                    title={`Delete ${u.email}`}
                                                >
                                                    <TrashIcon />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {users.length === 0 && <tr><td colSpan={5} className="muted">No users yet.</td></tr>}
                </tbody>
            </table>

            {pendingDelete && (
                <ConfirmDialog
                    title="Delete this account?"
                    message={`${pendingDelete.email} loses access to this dashboard immediately. The account and its history are kept, so you can restore it later.`}
                    confirmLabel="Delete account"
                    danger
                    busy={busyId === pendingDelete.id}
                    onCancel={() => setPendingDelete(null)}
                    onConfirm={() => toggleDeleted(pendingDelete)}
                />
            )}
        </div>
    );
}
