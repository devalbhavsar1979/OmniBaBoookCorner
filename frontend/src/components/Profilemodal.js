import React, { useState, useEffect } from 'react';
import { Modal, Alert } from './common';
import { authApi, userApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  OWNER: 'Library Owner',
  READER: 'Reader',
  VOLUNTEER: 'Volunteer',
};

const ROLE_OPTIONS = [
  { value: 'READER',    label: 'Reader',         icon: '📖', instant: true },
  { value: 'OWNER',     label: 'Library Owner',  icon: '🏛️', instant: false },
  { value: 'VOLUNTEER', label: 'Volunteer',       icon: '🤝', instant: false },
];

function emptyForm(user) {
  return {
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    address_line: user?.address_line || '',
    city: user?.city || '',
    state: user?.state || '',
    pincode: user?.pincode || '',
  };
}

function MyRolesSection({ userRoles }) {
  const [rolesData, setRolesData] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [reqError, setReqError] = useState('');
  const [reqSuccess, setReqSuccess] = useState('');

  useEffect(() => {
    userApi.myRoles()
      .then(r => setRolesData(r.data))
      .catch(() => {});
  }, []);

  const approvedRoles = rolesData?.approved_roles || userRoles || [];
  const pendingRequests = (rolesData?.requests || []).filter(r => r.status === 'PENDING');
  const rejectedRequests = (rolesData?.requests || []).filter(r => r.status === 'REJECTED');

  const availableToRequest = ROLE_OPTIONS.filter(opt => {
    if (opt.value === 'SUPER_ADMIN') return false;
    const alreadyApproved = approvedRoles.includes(opt.value);
    const alreadyPending = pendingRequests.some(r => r.role === opt.value);
    return !alreadyApproved && !alreadyPending;
  });

  const toggleRole = (role) =>
    setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);

  const handleRequest = async () => {
    if (selectedRoles.length === 0) return;
    setReqError('');
    setReqSuccess('');
    try {
      await userApi.requestRoles(selectedRoles);
      const r = await userApi.myRoles();
      setRolesData(r.data);
      setSelectedRoles([]);
      setRequesting(false);
      setReqSuccess('Role request submitted! Await Super Admin approval.');
      setTimeout(() => setReqSuccess(''), 4000);
    } catch (e) {
      setReqError(e.response?.data?.detail || 'Failed to submit request.');
    }
  };

  return (
    <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        My Roles
      </div>

      {reqSuccess && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: '#D1FAE5', color: '#065F46', fontSize: '0.82rem', marginBottom: 10 }}>
          {reqSuccess}
        </div>
      )}
      {reqError && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FEE2E2', color: '#991B1B', fontSize: '0.82rem', marginBottom: 10 }}>
          {reqError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {approvedRoles.map(role => (
          <div key={role} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px', borderRadius: 8,
            background: '#D1FAE5', color: '#065F46',
            fontSize: '0.82rem',
          }}>
            <span>✅</span>
            <strong>{ROLE_LABELS[role] || role}</strong>
            <span style={{ color: '#047857', fontWeight: 400 }}>— Active</span>
          </div>
        ))}

        {pendingRequests.map(req => (
          <div key={req.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px', borderRadius: 8,
            background: '#FEF3C7', color: '#92400E',
            fontSize: '0.82rem',
          }}>
            <span>⏳</span>
            <strong>{ROLE_LABELS[req.role] || req.role}</strong>
            <span style={{ fontWeight: 400 }}>— Pending approval</span>
          </div>
        ))}

        {rejectedRequests.map(req => (
          <div key={req.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '7px 12px', borderRadius: 8,
            background: '#FEE2E2', color: '#991B1B',
            fontSize: '0.82rem',
          }}>
            <span>✕</span>
            <div>
              <strong>{ROLE_LABELS[req.role] || req.role}</strong>
              <span style={{ fontWeight: 400 }}> — Rejected</span>
              {req.rejection_note && (
                <div style={{ fontSize: '0.75rem', color: '#7F1D1D', marginTop: 2 }}>
                  Note: {req.rejection_note}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Request additional roles */}
      {availableToRequest.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {!requesting ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setRequesting(true)}
              style={{ fontSize: '0.8rem' }}
            >
              + Request Another Role
            </button>
          ) : (
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--charcoal)', marginBottom: 8, fontWeight: 600 }}>
                Select roles to request:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {availableToRequest.map(opt => (
                  <label key={opt.value} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                    border: `1px solid ${selectedRoles.includes(opt.value) ? 'var(--primary)' : 'var(--border)'}`,
                    background: selectedRoles.includes(opt.value) ? '#EFF6FF' : 'var(--surface)',
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(opt.value)}
                      onChange={() => toggleRole(opt.value)}
                    />
                    <span>{opt.icon}</span>
                    <span style={{ fontSize: '0.82rem' }}><strong>{opt.label}</strong></span>
                    <span style={{
                      marginLeft: 'auto', fontSize: '0.68rem', fontWeight: 700,
                      padding: '2px 6px', borderRadius: 99,
                      background: opt.instant ? '#D1FAE5' : '#FEF3C7',
                      color: opt.instant ? '#065F46' : '#92400E',
                    }}>
                      {opt.instant ? 'Instant' : 'Needs approval'}
                    </span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setRequesting(false); setSelectedRoles([]); }}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={selectedRoles.length === 0}
                  onClick={handleRequest}
                >
                  Submit Request
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfileModal({ onClose }) {
  const { user, updateUser, userRoles } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(() => emptyForm(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const startEdit = () => { setForm(emptyForm(user)); setError(''); setEditMode(true); };
  const cancelEdit = () => { setForm(emptyForm(user)); setError(''); setEditMode(false); };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.full_name.trim()) { setError('Full name cannot be blank'); return; }
    setSaving(true);
    try {
      const res = await authApi.updateMe(form);
      updateUser(res.data);
      setEditMode(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={editMode ? 'Edit Profile' : 'My Profile'} onClose={onClose}>
      <Alert type="error" message={error} />

      {!editMode ? (
        <>
          <div className="profile-detail-list">
            <div className="profile-detail-row">
              <span className="profile-detail-label">Full Name</span>
              <span className="profile-detail-value">{user?.full_name}</span>
            </div>
            <div className="profile-detail-row">
              <span className="profile-detail-label">Email</span>
              <span className="profile-detail-value">{user?.email}</span>
            </div>
            <div className="profile-detail-row">
              <span className="profile-detail-label">Phone</span>
              <span className="profile-detail-value">{user?.phone || '—'}</span>
            </div>
            <div className="profile-detail-row">
              <span className="profile-detail-label">Address</span>
              <span className="profile-detail-value">{user?.address_line || '—'}</span>
            </div>
            <div className="profile-detail-row">
              <span className="profile-detail-label">City</span>
              <span className="profile-detail-value">{user?.city || '—'}</span>
            </div>
            <div className="profile-detail-row">
              <span className="profile-detail-label">State</span>
              <span className="profile-detail-value">{user?.state || '—'}</span>
            </div>
            <div className="profile-detail-row">
              <span className="profile-detail-label">Pincode</span>
              <span className="profile-detail-value">{user?.pincode || '—'}</span>
            </div>
            <div className="profile-detail-row">
              <span className="profile-detail-label">Active Role</span>
              <span className="profile-detail-value">{ROLE_LABELS[user?.role] || user?.role}</span>
            </div>
          </div>

          {/* My Roles section (not for SUPER_ADMIN) */}
          {user?.role !== 'SUPER_ADMIN' && (
            <MyRolesSection userRoles={userRoles} />
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-primary" onClick={startEdit}>
              Edit
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Full Name</label>
            <input className="form-control" name="full_name" value={form.full_name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input className="form-control" value={user?.email || ''} disabled title="Email cannot be changed" />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input className="form-control" name="phone" value={form.phone} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Address</label>
            <input className="form-control" name="address_line" value={form.address_line} onChange={handleChange} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>City</label>
              <input className="form-control" name="city" value={form.city} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>State</label>
              <input className="form-control" name="state" value={form.state} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label>Pincode</label>
            <input className="form-control" name="pincode" value={form.pincode} onChange={handleChange} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={cancelEdit} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
