import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/common';

const ROLE_OPTIONS = [
  {
    value: 'READER',
    label: 'Reader',
    description: 'Borrow books from any Book Corner',
    icon: '📖',
    instant: true,
  },
  {
    value: 'OWNER',
    label: 'Library Owner',
    description: 'Manage your own Book Corner',
    icon: '🏛️',
    instant: false,
  },
  {
    value: 'VOLUNTEER',
    label: 'Volunteer',
    description: 'Help manage the platform',
    icon: '🤝',
    instant: false,
  },
];

const EMPTY_FORM = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  address_line: '',
  city: '',
  state: '',
  pincode: '',
};

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedRoles, setSelectedRoles] = useState(['READER']);
  const [heardFrom, setHeardFrom] = useState('');
  const [heardFromOther, setHeardFromOther] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const toggleRole = (role) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleStep1 = (e) => {
    e.preventDefault();
    setError('');
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Name, email, and password are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (selectedRoles.length === 0) {
      setError('Please select at least one role.');
      return;
    }
    try {
      const heard_from = heardFrom === 'Other'
        ? (heardFromOther.trim() || 'Other')
        : heardFrom || undefined;
      const result = await register({ ...form, roles: selectedRoles, heard_from });
      setSubmittedResult(result);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.');
    }
  };

  if (submitted) {
    const immediateRoles = selectedRoles.filter(r => r === 'READER');
    const pendingRoles = selectedRoles.filter(r => r !== 'READER');
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>
            {immediateRoles.length > 0 ? '🎉' : '⏳'}
          </div>
          <h2 style={{ marginBottom: 8 }}>Registration Submitted!</h2>
          <div style={{ textAlign: 'left', margin: '16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {immediateRoles.map(r => (
              <div key={r} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 8,
                background: '#D1FAE5', color: '#065F46',
                fontSize: '0.875rem',
              }}>
                <span>✅</span>
                <div>
                  <strong>{ROLE_OPTIONS.find(o => o.value === r)?.label}</strong>
                  <span style={{ marginLeft: 6 }}>— Active immediately</span>
                </div>
              </div>
            ))}
            {pendingRoles.map(r => (
              <div key={r} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 8,
                background: '#FEF3C7', color: '#92400E',
                fontSize: '0.875rem',
              }}>
                <span>⏳</span>
                <div>
                  <strong>{ROLE_OPTIONS.find(o => o.value === r)?.label}</strong>
                  <span style={{ marginLeft: 6 }}>— Pending Super Admin approval</span>
                </div>
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24, lineHeight: 1.6 }}>
            Registered as: <strong>{form.full_name}</strong>
            {immediateRoles.length > 0
              ? ' — You can log in now with your Reader access.'
              : ' — You will be notified once your account is approved.'}
          </p>
          <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block' }}>
            Go to Login
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
          <p>Create your account — Step {step} of 2</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: s <= step ? 'var(--primary)' : 'var(--border)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>

        <Alert type="error" message={error} />

        {step === 1 ? (
          <form onSubmit={handleStep1}>
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

            <div style={{ margin: '18px 0 10px', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 12 }}>
                📍 <strong>Delivery Address</strong>{' '}
                <span style={{ fontWeight: 400 }}>(optional — needed for book delivery)</span>
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

            <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: 8 }}>
              Next — Choose Roles →
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: '0.875rem', color: 'var(--charcoal)', marginBottom: 14, lineHeight: 1.5 }}>
              Select all roles you need. Reader access is <strong>instant</strong>; other roles require Super Admin approval.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {ROLE_OPTIONS.map(opt => {
                const selected = selectedRoles.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                      background: selected ? 'var(--primary-light, #EFF6FF)' : 'var(--surface)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleRole(opt.value)}
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: '1.1rem' }}>{opt.icon}</span>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--charcoal)' }}>
                          {opt.label}
                        </strong>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px',
                          borderRadius: 99,
                          background: opt.instant ? '#D1FAE5' : '#FEF3C7',
                          color: opt.instant ? '#065F46' : '#92400E',
                        }}>
                          {opt.instant ? 'Instant' : 'Needs approval'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                        {opt.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* ── How did you hear about us? ── */}
            {(() => {
              const HEARD_OPTIONS = [
                { value: 'Search engine', label: 'Search engine', sub: 'Google, Bing, or Yahoo', icon: '🔍' },
                { value: 'Social media',  label: 'Social media',  sub: 'Facebook, Instagram, LinkedIn, or X (Twitter)', icon: '📱' },
                { value: 'Word of mouth', label: 'Word of mouth', sub: 'A friend, family member, or coworker', icon: '🗣️' },
                { value: 'Other',         label: 'Other',          sub: null, icon: '✏️' },
              ];
              return (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
                    How did you hear about us? <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span>
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {HEARD_OPTIONS.map(opt => {
                      const selected = heardFrom === opt.value;
                      return (
                        <label
                          key={opt.value}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                            border: `1.5px solid ${selected ? 'var(--navy)' : 'var(--border)'}`,
                            background: selected ? 'rgba(30,77,140,0.06)' : 'var(--surface)',
                            transition: 'border-color 0.15s, background 0.15s',
                          }}
                        >
                          <input
                            type="radio"
                            name="heard_from"
                            value={opt.value}
                            checked={selected}
                            onChange={() => { setHeardFrom(opt.value); setHeardFromOther(''); }}
                            style={{ flexShrink: 0, accentColor: 'var(--navy)' }}
                          />
                          <span style={{ fontSize: '1rem', lineHeight: 1 }}>{opt.icon}</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>
                              {opt.label}
                            </span>
                            {opt.sub && (
                              <span style={{ fontSize: '0.76rem', color: 'var(--muted)', marginLeft: 6 }}>
                                ({opt.sub})
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                    {heardFrom === 'Other' && (
                      <input
                        className="form-control"
                        placeholder="Please tell us more…"
                        value={heardFromOther}
                        onChange={e => setHeardFromOther(e.target.value)}
                        style={{ marginTop: 2 }}
                        autoFocus
                      />
                    )}
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setStep(1); setError(''); }}
                style={{ flex: 1 }}
              >
                ← Back
              </button>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading || selectedRoles.length === 0}
                style={{ flex: 2 }}
              >
                {loading ? 'Submitting…' : 'Create Account'}
              </button>
            </div>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--muted)' }}>
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
