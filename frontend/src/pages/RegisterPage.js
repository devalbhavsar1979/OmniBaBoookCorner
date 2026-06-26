import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/common';

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'READER',
    address_line: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.');
    }
  };

  if (submitted) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>⏳</div>
          <h2 style={{ marginBottom: 8 }}>Registration Submitted!</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
            Your account request has been received and is <strong>pending approval</strong> by the Super Admin.
            You will be able to log in once your account is approved.
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 24 }}>
            Registered as: <strong>{form.full_name}</strong> ({form.role})
          </p>
          <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block' }}>
            Back to Login
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
          <p>Create your account</p>
        </div>
        <Alert type="error" message={error} />
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              className="form-control"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Your full name"
              required
            />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input
              className="form-control"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Phone (optional)</label>
            <input
              className="form-control"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+91 98765 43210"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              className="form-control"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              required
            />
          </div>
          <div className="form-group">
            <label>I am a…</label>
            <select className="form-control" name="role" value={form.role} onChange={handleChange}>
              <option value="READER">Reader — I want to borrow books</option>
              <option value="OWNER">Library Owner — I run a library</option>
              <option value="VOLUNTEER">Volunteer — I help with deliveries</option>
            </select>
          </div>

          <div style={{ margin: '18px 0 10px', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 12 }}>
              📍 <strong>Delivery Address</strong> <span style={{ fontWeight: 400 }}>(optional — needed for book delivery)</span>
            </p>
            <div className="form-group">
              <label>Address Line</label>
              <input
                className="form-control"
                name="address_line"
                value={form.address_line}
                onChange={handleChange}
                placeholder="House / Flat / Street"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label>City</label>
                <input
                  className="form-control"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Surat"
                />
              </div>
              <div className="form-group">
                <label>Pincode</label>
                <input
                  className="form-control"
                  name="pincode"
                  value={form.pincode}
                  onChange={handleChange}
                  placeholder="395001"
                  maxLength={6}
                />
              </div>
            </div>
            <div className="form-group">
              <label>State</label>
              <input
                className="form-control"
                name="state"
                value={form.state}
                onChange={handleChange}
                placeholder="Gujarat"
              />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Submitting…' : 'Register'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--muted)' }}>
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}