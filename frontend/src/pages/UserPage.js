import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { adminApi } from '../services/api';
import { Spinner, Alert } from '../components/common';

const ROLE_COLORS = {
  OWNER:     { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
  READER:    { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  VOLUNTEER: { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
};

const ROLE_LABELS = {
  OWNER: 'Library Owner', READER: 'Reader', VOLUNTEER: 'Volunteer',
  SUPER_ADMIN: 'Super Admin',
};

function RoleBadge({ role }) {
  const s = ROLE_COLORS[role] || { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 20, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600,
    }}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function Avatar({ name, size = 38 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #1E4D8C 0%, #2E8B57 100%)',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
    }}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

const HEARD_OPTIONS = ['Search engine', 'Social media', 'Word of mouth', 'Other'];

function DetailModal({ user, onClose, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: user.full_name || '',
    phone: user.phone || '',
    address_line: user.address_line || '',
    city: user.city || '',
    state: user.state || '',
    pincode: user.pincode || '',
    heard_from: user.heard_from || '',
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  if (!user) return null;
  const hasAddress = user.address_line || user.city || user.state || user.pincode;

  const handleSave = async () => {
    setSaving(true);
    setEditError('');
    try {
      const payload = {};
      Object.entries(editForm).forEach(([k, v]) => { payload[k] = v.trim() || null; });
      await api.patch(`/users/${user.id}`, payload);
      onUpdate();
      setEditing(false);
    } catch (e) {
      setEditError(e.response?.data?.detail || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,31,61,0.5)', backdropFilter: 'blur(3px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#FFFFFF', borderRadius: 16, boxShadow: '0 24px 64px rgba(15,31,61,0.24)', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={user.full_name} size={52} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F1F3D' }}>{user.full_name}</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                {(user.roles?.length ? user.roles : [user.role]).map(r => <RoleBadge key={r} role={r} />)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <button
              onClick={() => { setEditing(e => !e); setEditError(''); }}
              style={{ background: editing ? '#EBF0F9' : '#1E4D8C', border: 'none', padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', color: editing ? '#6B7FA8' : '#fff', fontWeight: 600 }}
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
            <button onClick={onClose} style={{ background: '#EBF0F9', border: 'none', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: '0.85rem', color: '#6B7FA8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
          </div>
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {editError && <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem' }}>{editError}</div>}
            {[
              { label: 'Full Name', key: 'full_name' },
              { label: 'Phone', key: 'phone' },
              { label: 'Address Line', key: 'address_line' },
              { label: 'City', key: 'city' },
              { label: 'State', key: 'state' },
              { label: 'Pincode', key: 'pincode' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label style={{ fontSize: '0.78rem', color: '#6B7FA8', display: 'block', marginBottom: 4 }}>{label}</label>
                <input
                  className="form-control"
                  value={editForm[key]}
                  onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ fontSize: '0.875rem' }}
                />
              </div>
            ))}
            <div>
              <label style={{ fontSize: '0.78rem', color: '#6B7FA8', display: 'block', marginBottom: 6 }}>Source (How they heard about us)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {HEARD_OPTIONS.map(opt => (
                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', border: `1.5px solid ${editForm.heard_from === opt ? '#1E4D8C' : '#D5E0F0'}`, background: editForm.heard_from === opt ? 'rgba(30,77,140,0.06)' : '#F8FAFC', fontSize: '0.85rem' }}>
                    <input type="radio" name="edit_heard_from" value={opt} checked={editForm.heard_from === opt} onChange={() => setEditForm(f => ({ ...f, heard_from: opt }))} style={{ accentColor: '#1E4D8C' }} />
                    {opt}
                  </label>
                ))}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', border: `1.5px solid ${editForm.heard_from && !HEARD_OPTIONS.includes(editForm.heard_from) ? '#1E4D8C' : '#D5E0F0'}`, background: editForm.heard_from && !HEARD_OPTIONS.includes(editForm.heard_from) ? 'rgba(30,77,140,0.06)' : '#F8FAFC', fontSize: '0.85rem' }}>
                  <input type="radio" name="edit_heard_from" value="custom" checked={editForm.heard_from !== '' && !HEARD_OPTIONS.includes(editForm.heard_from)} onChange={() => setEditForm(f => ({ ...f, heard_from: ' ' }))} style={{ accentColor: '#1E4D8C' }} />
                  Custom:
                  <input
                    className="form-control"
                    value={HEARD_OPTIONS.includes(editForm.heard_from) ? '' : editForm.heard_from}
                    onChange={e => setEditForm(f => ({ ...f, heard_from: e.target.value }))}
                    placeholder="Type here…"
                    style={{ fontSize: '0.82rem', flex: 1 }}
                  />
                </label>
                <button onClick={() => setEditForm(f => ({ ...f, heard_from: '' }))} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', fontSize: '0.75rem', color: '#6B7FA8', cursor: 'pointer', padding: 0 }}>Clear</button>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ background: '#1E4D8C', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', marginTop: 4 }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Section title="Contact">
              <Row label="Email" value={user.email} />
              <Row label="Phone" value={user.phone || '—'} />
            </Section>
            <Section title="Address">
              {hasAddress ? (
                <>
                  <Row label="Address" value={user.address_line || '—'} />
                  <Row label="City" value={user.city || '—'} />
                  <Row label="State" value={user.state || '—'} />
                  <Row label="Pincode" value={user.pincode || '—'} />
                </>
              ) : <div style={{ fontSize: '0.82rem', color: '#6B7FA8', padding: '4px 0' }}>No address on file</div>}
            </Section>
            <Section title="Account">
              <Row label="Status" value={user.is_active ? <span style={{ color: '#15803D', fontWeight: 600 }}>Active</span> : <span style={{ color: '#DC2626', fontWeight: 600 }}>Inactive</span>} />
              <Row label="Approved" value={user.is_approved ? <span style={{ color: '#15803D', fontWeight: 600 }}>Yes</span> : <span style={{ color: '#D97706', fontWeight: 600 }}>Pending</span>} />
              <Row label="Member Since" value={new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
              <Row label="Source" value={user.heard_from || '—'} />
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6B7FA8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
      <div style={{ background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2EAF4', overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid #E2EAF4', gap: 12 }}>
      <span style={{ fontSize: '0.8rem', color: '#6B7FA8', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.85rem', color: '#0F1F3D', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ── Role Requests Tab ─────────────────────────────────────────────────────────

function RoleRequestCard({ req, onAction }) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [busy, setBusy] = useState(false);

  const handleApprove = async () => {
    setBusy(true);
    try {
      await adminApi.approveRoleRequest(req.id);
      onAction();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to approve');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    setBusy(true);
    try {
      await adminApi.rejectRoleRequest(req.id, rejectNote || null);
      onAction();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to reject');
    } finally {
      setBusy(false);
      setRejecting(false);
    }
  };

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #D5E0F0', borderRadius: 10,
      padding: '14px 18px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Avatar name={req.user_name} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F1F3D' }}>{req.user_name}</div>
          <div style={{ fontSize: '0.78rem', color: '#6B7FA8' }}>{req.user_email}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', color: '#6B7FA8' }}>Requesting</span>
          <RoleBadge role={req.role} />
        </div>
        <div style={{ fontSize: '0.72rem', color: '#6B7FA8' }}>
          {new Date(req.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>

        {!rejecting && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-sm"
              disabled={busy}
              onClick={handleApprove}
              style={{ background: '#10B981', color: '#fff', border: 'none', padding: '5px 14px', fontSize: '0.8rem' }}
            >
              {busy ? '…' : 'Approve'}
            </button>
            <button
              className="btn btn-sm btn-secondary"
              disabled={busy}
              onClick={() => setRejecting(true)}
              style={{ padding: '5px 14px', fontSize: '0.8rem' }}
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {rejecting && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #E2EAF4' }}>
          <input
            className="form-control"
            placeholder="Rejection note (optional)"
            value={rejectNote}
            onChange={e => setRejectNote(e.target.value)}
            style={{ marginBottom: 8, fontSize: '0.85rem' }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setRejecting(false)}>Cancel</button>
            <button
              className="btn btn-sm"
              disabled={busy}
              onClick={handleReject}
              style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '5px 14px', fontSize: '0.8rem' }}
            >
              {busy ? '…' : 'Confirm Reject'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleRequestsTab() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.pendingRoleRequests();
      setRequests(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>;

  if (requests.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 64, color: '#6B7FA8' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
        <p style={{ fontWeight: 600 }}>No pending role requests</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 12 }}>
        {requests.length} pending request{requests.length !== 1 ? 's' : ''}
      </div>
      {requests.map(req => (
        <RoleRequestCard key={req.id} req={req} onAction={load} />
      ))}
    </div>
  );
}

// ── All Users Tab ─────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const [usersRes, roleReqRes] = await Promise.all([
        api.get('/users/all', { params }),
        adminApi.pendingRoleRequests(),
      ]);
      setUsers(usersRes.data);
      setPendingCount(roleReqRes.data.length);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const roleCount = (role) => users.filter(u =>
    u.roles?.length ? u.roles.includes(role) : u.role === role
  ).length;

  return (
    <div className="page-root">
      <div className="page-header">
        <div>
          <h2>All Users</h2>
          <p>
            {users.length} user{users.length !== 1 ? 's' : ''} —&nbsp;
            {roleCount('OWNER')} owners, {roleCount('READER')} readers, {roleCount('VOLUNTEER')} volunteers
          </p>
        </div>
      </div>

      <div className="page-content">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
          {[
            { key: 'users', label: 'All Users' },
            { key: 'role_requests', label: `Role Requests${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: -2,
                color: tab === t.key ? 'var(--primary)' : 'var(--muted)',
                fontWeight: tab === t.key ? 700 : 400,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'role_requests' ? (
          <RoleRequestsTab />
        ) : (
          <>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, background: '#FFFFFF', border: '1px solid #D5E0F0', borderRadius: 10, padding: '12px 16px', boxShadow: '0 2px 8px rgba(30,77,140,0.08)' }}>
              <input
                className="form-control"
                placeholder="🔍 Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: 180 }}
              />
              <select className="form-control" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ maxWidth: 170 }}>
                <option value="">All Roles</option>
                <option value="OWNER">Library Owner</option>
                <option value="READER">Reader</option>
                <option value="VOLUNTEER">Volunteer</option>
              </select>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
            ) : users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 64, color: '#6B7FA8' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>👥</div>
                <p style={{ fontWeight: 600 }}>No users found</p>
                <p style={{ fontSize: '0.875rem' }}>Try adjusting your search or filter.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {users.map(user => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    style={{ background: '#FFFFFF', border: '1px solid #D5E0F0', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(30,77,140,0.12)'; e.currentTarget.style.borderColor = '#1E4D8C'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#D5E0F0'; }}
                  >
                    <Avatar name={user.full_name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F1F3D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.full_name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#6B7FA8', marginTop: 2 }}>
                        {user.email}{user.city ? ` · ${user.city}` : ''}
                      </div>
                      {user.heard_from && (
                        <div style={{ fontSize: '0.72rem', color: '#3D5280', marginTop: 2 }}>
                          Source: {user.heard_from}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {(user.roles?.length ? user.roles : [user.role]).map(r => <RoleBadge key={r} role={r} />)}
                      <span style={{ fontSize: '0.72rem', color: '#6B7FA8' }}>
                        {new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span style={{ color: '#6B7FA8', fontSize: '0.8rem' }}>›</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {selectedUser && (
        <DetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={async () => {
            await load();
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}
