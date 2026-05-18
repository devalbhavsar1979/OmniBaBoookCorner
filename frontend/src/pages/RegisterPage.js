import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/common';
import logoImg from '../logo.png';

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name:'', email:'', phone:'', password:'', role:'READER' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await register(form);
      setSuccess('Account created! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.');
    }
  };

  const roles = [
    { value: 'READER',    label: '📖 Reader', desc: 'I want to borrow books' },
    { value: 'OWNER',     label: '🏛️ Library Owner', desc: 'I manage a library' },
    { value: 'VOLUNTEER', label: '🚴 Volunteer', desc: 'I help with deliveries' },
  ];

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src={logoImg} alt="Ba Book Corner" />
          <h1>Create Account</h1>
          <p>Join the Ba Book Corner network</p>
        </div>

        <Alert type="error" message={error} />
        <Alert type="success" message={success} />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input className="form-control" name="full_name" value={form.full_name}
              onChange={handleChange} placeholder="Your full name" required />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input className="form-control" type="email" name="email" value={form.email}
              onChange={handleChange} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label>Phone (optional)</label>
            <input className="form-control" name="phone" value={form.phone}
              onChange={handleChange} placeholder="+91 98765 43210" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="form-control" type="password" name="password" value={form.password}
              onChange={handleChange} placeholder="At least 6 characters" required />
          </div>

          <div className="form-group">
            <label>I am a…</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {roles.map(r => (
                <label key={r.value} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  border: `1.5px solid ${form.role === r.value ? 'var(--navy)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  background: form.role === r.value ? 'var(--surface-2)' : 'var(--white)',
                  transition: 'all 0.15s',
                }}>
                  <input type="radio" name="role" value={r.value}
                    checked={form.role === r.value}
                    onChange={handleChange}
                    style={{ accentColor: 'var(--navy)' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>{r.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', marginTop: 12, padding: '11px 18px', fontSize: '0.95rem' }}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
