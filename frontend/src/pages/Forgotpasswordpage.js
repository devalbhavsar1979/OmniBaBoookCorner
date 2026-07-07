import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../services/api';
import { Alert } from '../components/common';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📬</div>
          <h2 style={{ marginBottom: 8, color: '#0F1F3D' }}>Check your inbox</h2>
          <p style={{ color: '#6B7FA8', lineHeight: 1.65, marginBottom: 24, fontSize: '0.9rem' }}>
            If <strong>{email}</strong> is registered with Ba Book Corner, you'll receive
            a password reset link shortly. Check your spam folder if you don't see it.
          </p>
          <p style={{ fontSize: '0.8rem', color: '#6B7FA8', marginBottom: 24 }}>
            The link expires in <strong>1 hour</strong>.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block' }}>
            Back to Sign In
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
          <p>Reset your password</p>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#6B7FA8', marginBottom: 20, textAlign: 'center' }}>
          Enter your registered email address and we'll send you a link to reset your password.
        </p>
        <Alert type="error" message={error} />
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              className="form-control"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: '#6B7FA8' }}>
          Remember your password?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}