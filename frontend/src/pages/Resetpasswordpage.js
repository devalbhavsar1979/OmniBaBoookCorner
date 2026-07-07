import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../services/api';
import { Alert } from '../components/common';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setError('Invalid or missing reset token. Please request a new reset link.');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(token, form.password);
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
          <h2 style={{ marginBottom: 8, color: '#0F1F3D' }}>Password updated!</h2>
          <p style={{ color: '#6B7FA8', lineHeight: 1.65, marginBottom: 24, fontSize: '0.9rem' }}>
            Your password has been changed successfully. Redirecting you to sign in…
          </p>
          <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block' }}>
            Sign In Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>Ba Boook Corner</h1>
          <p>Choose a new password</p>
        </div>
        <Alert type="error" message={error} />
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New Password</label>
            <input
              className="form-control"
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="At least 6 characters"
              required
              autoFocus
              disabled={!token}
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              className="form-control"
              type="password"
              value={form.confirm}
              onChange={e => setForm({ ...form, confirm: e.target.value })}
              placeholder="Repeat your new password"
              required
              disabled={!token}
            />
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading || !token}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? 'Updating…' : 'Reset Password'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: '#6B7FA8' }}>
          <Link to="/forgot-password">Request a new reset link</Link>
        </p>
      </div>
    </div>
  );
}