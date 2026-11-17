async function request(path, options = {}) {
    const res = await fetch(path, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || res.statusText || 'Request failed');
    }
    return data;
}

export const api = {
    login: (email, password) => request('/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    }),
    logout: () => request('/api/admin/auth/logout', { method: 'POST' }),
    me: () => request('/api/admin/auth/me'),
    overview: () => request('/api/admin/overview'),
    dags: () => request('/api/admin/dags'),
    updates: (type, status) => request(`/api/admin/updates?type=${type}${status ? `&status=${status}` : ''}`),
    reconciliations: () => request('/api/admin/reconciliations'),
    retry: (type, updateId) => request('/api/admin/retry', {
        method: 'POST',
        body: JSON.stringify({ type, updateId }),
    }),
    users: () => request('/api/admin/users'),
    createUser: (email, password, role) => request('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
    }),
};
