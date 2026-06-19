import React, { useState, useEffect, useCallback } from 'react';
import { Spinner, Alert } from '../components/common';
import api from '../services/api';

export default function PendingApprovalsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/users/pending');
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load pending users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleApprove = async (user) => {
    try {
      await api.post(`/users/${user.id}/approve`);
      setActionMsg(`✅ ${user.full_name} approved successfully.`);
      fetchPending();
    } catch (err) {
      setError(err.response?.data?.detail || 'Approval failed.');
    }
  };

  const handleReject = async (user) => {
    if (!window.confirm(`Reject and delete registration for ${user.full_name}? This cannot be undone.`)) return;
    try {
      await api.post(`/users/${user.id}/reject`);
      setActionMsg(`🗑️ ${user.full_name}'s registration rejected and removed.`);
      fetchPending();
    } catch (err) {
      setError(err.response?.data?.detail || 'Rejection failed.');
    }
  };

  const roleBadgeColor = (role) => {
    const map = { OWNER: '#7DD3FC', READER: '#86EFAC', VOLUNTEER: '#FCA5A5' };
    return map[role] || '#E5E7EB';
  };

  return (
    <div className="page-root">
      <div className="page-header">
        <div>
          <h2>Pending Approvals</h2>
          <p>{users.length} registration{users.length !== 1 ? 's' : ''} awaiting approval</p>
        </div>
      </div>

      <div className="page-content">
        {actionMsg && (
          <Alert type="success" message={actionMsg} onClose={() => setActionMsg('')} />
        )}
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Spinner />
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64, color: 'var(--muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <p style={{ fontWeight: 600 }}>No pending approvals</p>
            <p style={{ fontSize: '0.875rem' }}>All registrations have been reviewed.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {users.map((user) => (
              <div
                key={user.id}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  flexShrink: 0,
                }}>
                  {user.full_name.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{user.full_name}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{user.email}</div>
                  {user.phone && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>📞 {user.phone}</div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: roleBadgeColor(user.role),
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#1E293B',
                  }}>
                    {user.role}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    {new Date(user.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleApprove(user)}
                  >
                    ✓ Approve
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleReject(user)}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}