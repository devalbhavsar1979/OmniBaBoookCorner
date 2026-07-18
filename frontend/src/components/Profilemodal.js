import React, { useState } from 'react';
import { Modal, Alert } from './common';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const roleLabels = {
  SUPER_ADMIN: 'Super Admin',
  OWNER: 'Library Owner',
  READER: 'Reader',
  VOLUNTEER: 'Volunteer',
};

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

export default function ProfileModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(() => emptyForm(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const startEdit = () => {
    setForm(emptyForm(user));
    setError('');
    setEditMode(true);
  };

  const cancelEdit = () => {
    setForm(emptyForm(user));
    setError('');
    setEditMode(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.full_name.trim()) {
      setError('Full name cannot be blank');
      return;
    }
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
              <span className="profile-detail-label">Role</span>
              <span className="profile-detail-value">{roleLabels[user?.role] || user?.role}</span>
            </div>
          </div>

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
            <input
              className="form-control"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input className="form-control" value={user?.email || ''} disabled title="Email cannot be changed" />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              className="form-control"
              name="phone"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Address</label>
            <input
              className="form-control"
              name="address_line"
              value={form.address_line}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>City</label>
              <input
                className="form-control"
                name="city"
                value={form.city}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>State</label>
              <input
                className="form-control"
                name="state"
                value={form.state}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Pincode</label>
            <input
              className="form-control"
              name="pincode"
              value={form.pincode}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={cancelEdit} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}