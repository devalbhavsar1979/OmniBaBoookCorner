import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Spinner, Alert } from '../components/common';

const ROLE_COLORS = {
  OWNER:     { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
  READER:    { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  VOLUNTEER: { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
};

const ROLE_LABELS = { OWNER: 'Library Owner', READER: 'Reader', VOLUNTEER: 'Volunteer' };

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

function DetailModal({ user, onClose }) {
  if (!user) return null;

  const hasAddress = user.address_line || user.city || user.state || user.pincode;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,31,61,0.5)',
        backdropFilter: 'blur(3px)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF', borderRadius: 16, boxShadow: '0 24px 64px rgba(15,31,61,0.24)',
          width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
          padding: 28,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={user.full_name} size={52} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F1F3D' }}>
                {user.full_name}
              </div>
              <RoleBadge role={user.role} />
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#EBF0F9', border: 'none', width: 30, height: 30,
              borderRadius: '50%', cursor: 'pointer', fontSize: '0.85rem', color: '#6B7FA8',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >✕</button>
        </div>

        {/* Details */}
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
            ) : (
              <div style={{ fontSize: '0.82rem', color: '#6B7FA8', padding: '4px 0' }}>
                No address on file
              </div>
            )}
          </Section>

          <Section title="Account">
            <Row label="Status" value={
              user.is_active
                ? <span style={{ color: '#15803D', fontWeight: 600 }}>Active</span>
                : <span style={{ color: '#DC2626', fontWeight: 600 }}>Inactive</span>
            } />
            <Row label="Approved" value={
              user.is_approved
                ? <span style={{ color: '#15803D', fontWeight: 600 }}>Yes</span>
                : <span style={{ color: '#D97706', fontWeight: 600 }}>Pending</span>
            } />
            <Row label="Member Since" value={
              new Date(user.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
              })
            } />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: '0.7rem', fontWeight: 700, color: '#6B7FA8',
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
      }}>
        {title}
      </div>
      <div style={{
        background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2EAF4', overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '9px 14px', borderBottom: '1px solid #E2EAF4', gap: 12,
    }}>
      <span style={{ fontSize: '0.8rem', color: '#6B7FA8', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.85rem', color: '#0F1F3D', fontWeight: 500, textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res = await api.get('/users/all', { params });
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const roleCount = (role) => users.filter(u => u.role === role).length;

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

        {/* Filters */}
        <div style={{
          display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20,
          background: '#FFFFFF', border: '1px solid #D5E0F0', borderRadius: 10,
          padding: '12px 16px', boxShadow: '0 2px 8px rgba(30,77,140,0.08)',
        }}>
          <input
            className="form-control"
            placeholder="🔍 Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 180 }}
          />
          <select
            className="form-control"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            style={{ maxWidth: 170 }}
          >
            <option value="">All Roles</option>
            <option value="OWNER">Library Owner</option>
            <option value="READER">Reader</option>
            <option value="VOLUNTEER">Volunteer</option>
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Spinner />
          </div>
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
                style={{
                  background: '#FFFFFF', border: '1px solid #D5E0F0',
                  borderRadius: 10, padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(30,77,140,0.12)';
                  e.currentTarget.style.borderColor = '#1E4D8C';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#D5E0F0';
                }}
              >
                <Avatar name={user.full_name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700, fontSize: '0.9rem', color: '#0F1F3D',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {user.full_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#6B7FA8', marginTop: 2 }}>
                    {user.email}
                    {user.city ? ` · ${user.city}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <RoleBadge role={user.role} />
                  <span style={{
                    fontSize: '0.72rem', color: '#6B7FA8',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {new Date(user.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                  <span style={{ color: '#6B7FA8', fontSize: '0.8rem' }}>›</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedUser && (
        <DetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}