// apps/dashboard/components/auth/UserManager.tsx
// ADMIN-only component for managing users and client access
'use client';

import { useState, useEffect } from 'react';
import type { Role } from '@prisma/client';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/auth-helpers';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  allowedClientIds: string[];
  active: boolean;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  slug: string;
}

interface UserManagerProps {
  clients: Client[];
}

const T = {
  bg: '#080810', surface: '#0F0F1A', card: '#13131F',
  border: '#1E1E2E', text: '#E2E8F0', muted: '#64748B',
  amber: '#F59E0B', amberDim: '#78490A',
  teal: '#2DD4BF', red: '#F87171',
};

const RoleBadge = ({ role }: { role: Role }) => {
  const { bg, text } = ROLE_COLORS[role];
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: bg, color: text }}>
      {ROLE_LABELS[role]}
    </span>
  );
};

export default function UserManager({ clients }: UserManagerProps) {
  const [users, setUsers]       = useState<User[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState('');

  const [form, setForm] = useState({
    email: '', name: '', password: '',
    role: 'CLIENT_VIEW' as Role,
    allowedClientIds: [] as string[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Valid email required';
    if (!form.name) errs.name = 'Name required';
    if (!form.password || form.password.length < 8) errs.password = 'Min 8 characters';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const createUser = async () => {
    if (!validate()) return;
    setSaving(true);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);

    if (res.ok) {
      setToast('User created');
      setShowForm(false);
      setForm({ email: '', name: '', password: '', role: 'CLIENT_VIEW', allowedClientIds: [] });
      fetchUsers();
    } else {
      const err = await res.json();
      setToast(`Error: ${err.error}`);
    }
    setTimeout(() => setToast(''), 3000);
  };

  const updateRole = async (userId: string, role: Role, allowedClientIds?: string[]) => {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role, allowedClientIds }),
    });
    fetchUsers();
  };

  const deactivate = async (userId: string, name: string | null) => {
    if (!confirm(`Deactivate ${name ?? userId}?`)) return;
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, active: false }),
    });
    fetchUsers();
  };

  const toggleClientAccess = (clientId: string) => {
    const current = form.allowedClientIds;
    setF('allowedClientIds', current.includes(clientId)
      ? current.filter(id => id !== clientId)
      : [...current, clientId]);
  };

  return (
    <div data-testid="user-manager" style={{ fontFamily: "'DM Sans', sans-serif", color: T.text }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 2 }}>User management</div>
          <div style={{ fontSize: 12, color: T.muted }}>{users.length} users · {clients.length} clients</div>
        </div>
        <button data-testid="btn-create-user" onClick={() => setShowForm(true)}
          style={{ background: T.amber, color: T.bg, border: 'none', borderRadius: 6, padding: '9px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          + Add user
        </button>
      </div>

      {/* Create user form */}
      {showForm && (
        <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>New user</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {(['email', 'name', 'password'] as const).map(field => (
              <div key={field}>
                <label style={{ display: 'block', fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
                  {field}
                </label>
                <input
                  data-testid={`field-new-${field}`}
                  type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                  value={(form as Record<string, string>)[field]}
                  onChange={e => setF(field, e.target.value)}
                  style={{ width: '100%', background: T.surface, border: `0.5px solid ${formErrors[field] ? T.red : T.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: T.text, outline: 'none', boxSizing: 'border-box' }}
                />
                {formErrors[field] && <div style={{ fontSize: 10, color: T.red, marginTop: 2 }}>{formErrors[field]}</div>}
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Role</label>
              <select value={form.role} onChange={e => setF('role', e.target.value as Role)}
                style={{ width: '100%', background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: T.text, outline: 'none' }}>
                {Object.entries(ROLE_LABELS).map(([r, l]) => <option key={r} value={r}>{l}</option>)}
              </select>
            </div>
          </div>

          {form.role === 'CLIENT_VIEW' && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Client access</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {clients.map(c => (
                  <label key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                    background: form.allowedClientIds.includes(c.id) ? T.amberDim : T.surface,
                    border: `0.5px solid ${form.allowedClientIds.includes(c.id) ? T.amber : T.border}`,
                    borderRadius: 6, padding: '6px 10px', fontSize: 12,
                  }}>
                    <input type="checkbox" checked={form.allowedClientIds.includes(c.id)} onChange={() => toggleClientAccess(c.id)} style={{ accentColor: T.amber }} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={createUser} disabled={saving}
              style={{ background: saving ? T.amberDim : T.amber, color: T.bg, border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 12, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? 'Creating…' : 'Create user'}
            </button>
            <button onClick={() => setShowForm(false)}
              style={{ background: 'transparent', border: `0.5px solid ${T.border}`, borderRadius: 6, padding: '8px 16px', fontSize: 12, color: T.muted, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* User table */}
      <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: T.surface }}>
                {['User', 'Role', 'Client access', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 500, fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `0.5px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} data-testid={`user-row-${u.id}`} style={{ borderBottom: `0.5px solid ${T.border}`, background: i % 2 === 0 ? T.card : T.surface + '40' }}>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ fontWeight: 500, color: T.text }}>{u.name ?? '—'}</div>
                    <div style={{ fontSize: 10, color: T.muted, fontFamily: 'monospace' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '11px 16px' }}><RoleBadge role={u.role} /></td>
                  <td style={{ padding: '11px 16px', color: T.muted, fontSize: 11 }}>
                    {u.role !== 'CLIENT_VIEW' ? 'All clients' :
                     u.allowedClientIds.length === 0 ? 'None assigned' :
                     clients.filter(c => u.allowedClientIds.includes(c.id)).map(c => c.name).join(', ')}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: u.active ? '#D1FAE5' : '#FEE2E2', color: u.active ? '#059669' : '#DC2626' }}>
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select
                        value={u.role}
                        onChange={e => updateRole(u.id, e.target.value as Role)}
                        style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 5, padding: '4px 8px', fontSize: 10, color: T.muted, outline: 'none', cursor: 'pointer' }}>
                        {Object.entries(ROLE_LABELS).map(([r, l]) => <option key={r} value={r}>{l}</option>)}
                      </select>
                      {u.active && (
                        <button onClick={() => deactivate(u.id, u.name)}
                          style={{ background: 'transparent', border: `0.5px solid #F87171`, borderRadius: 5, padding: '4px 8px', fontSize: 10, color: T.red, cursor: 'pointer' }}>
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: toast.startsWith('Error') ? '#5A1F1F' : '#0D4A44', border: `0.5px solid ${toast.startsWith('Error') ? T.red : T.teal}`, borderRadius: 8, padding: '10px 18px', fontSize: 12, color: toast.startsWith('Error') ? T.red : T.teal, zIndex: 100 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
