import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/common';
import logoImg from '../logo.png';

function PWAInstallModal({ onClose }) {
  const [tab, setTab] = useState('android');

  return (
    <div className="pwa-overlay" onClick={onClose}>
      <div className="pwa-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="pwa-modal-header">
          <div className="pwa-modal-logo">
            <img src={logoImg} alt="Ba Book Corner" />
            <div>
              <div className="pwa-modal-title">Install the Ba Boook Corner App</div>
              <div className="pwa-modal-sub">Read more, live better.</div>
            </div>
          </div>
          <button className="pwa-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Benefits */}
        <div className="pwa-benefits">
          <span>✅ Faster access</span>
          <span>✅ Full-screen experience</span>
          <span>✅ Easy book requests</span>
          <span>✅ Free doorstep delivery</span>
        </div>

        {/* Tab switcher */}
        <div className="pwa-tabs">
          <button
            className={`pwa-tab${tab === 'android' ? ' active' : ''}`}
            onClick={() => setTab('android')}
          >
            🤖 Android
          </button>
          <button
            className={`pwa-tab${tab === 'ios' ? ' active' : ''}`}
            onClick={() => setTab('ios')}
          >
            🍎 iPhone / iPad
          </button>
        </div>

        {/* Steps */}
        <div className="pwa-steps">
          {tab === 'android' ? (
            <>
              <div className="pwa-platform-title">Android (Chrome)</div>
              <ol className="pwa-step-list">
                <li>
                  <div className="pwa-step-icon">1</div>
                  <div>
                    <strong>Open Chrome</strong> and navigate to{' '}
                    <span className="pwa-url">app.boookcorner.in</span>
                  </div>
                </li>
                <li>
                  <div className="pwa-step-icon">2</div>
                  <div>
                    Tap the <strong>⋮</strong> (three dots) menu in the top-right corner
                    <div className="pwa-step-visual">
                      <div className="pwa-mockup-bar">
                        <span className="pwa-mockup-url">app.boookcorner.in</span>
                        <span className="pwa-mockup-dots">⋮</span>
                      </div>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="pwa-step-icon">3</div>
                  <div>
                    Select <strong>"Add to Home screen"</strong> or{' '}
                    <strong>"Install app"</strong>
                    <div className="pwa-step-visual pwa-menu-preview">
                      <div className="pwa-menu-item">New tab</div>
                      <div className="pwa-menu-item">New incognito tab</div>
                      <div className="pwa-menu-item pwa-menu-highlight">📲 Add to Home screen</div>
                      <div className="pwa-menu-item">Share…</div>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="pwa-step-icon">4</div>
                  <div>Tap <strong>Install</strong> or <strong>Add</strong> in the confirmation dialog.</div>
                </li>
                <li>
                  <div className="pwa-step-icon">5</div>
                  <div>The <strong>Ba Boook Corner</strong> icon will appear on your Home Screen! 🎉</div>
                </li>
              </ol>
            </>
          ) : (
            <>
              <div className="pwa-platform-title">iPhone / iPad (Safari)</div>
              <ol className="pwa-step-list">
                <li>
                  <div className="pwa-step-icon">1</div>
                  <div>
                    Open <strong>Safari</strong> (not Chrome) and go to{' '}
                    <span className="pwa-url">app.boookcorner.in</span>
                  </div>
                </li>
                <li>
                  <div className="pwa-step-icon">2</div>
                  <div>
                    Tap the <strong>Share button</strong> at the bottom of the screen
                    <div className="pwa-step-visual">
                      <div className="pwa-safari-bar">
                        <span className="pwa-safari-back">‹</span>
                        <span className="pwa-mockup-url">app.boookcorner.in</span>
                        <span className="pwa-safari-share">□↑</span>
                      </div>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="pwa-step-icon">3</div>
                  <div>
                    Scroll down in the Share sheet and tap{' '}
                    <strong>"Add to Home Screen"</strong>
                    <div className="pwa-step-visual pwa-share-sheet">
                      <div className="pwa-share-item">📋 Copy</div>
                      <div className="pwa-share-item">🔖 Add Bookmark</div>
                      <div className="pwa-share-item pwa-menu-highlight">➕ Add to Home Screen</div>
                      <div className="pwa-share-item">📤 AirDrop</div>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="pwa-step-icon">4</div>
                  <div>Tap <strong>Add</strong> in the top-right corner to confirm.</div>
                </li>
                <li>
                  <div className="pwa-step-icon">5</div>
                  <div>The <strong>Ba Boook Corner</strong> icon will appear on your Home Screen! 🎉</div>
                </li>
              </ol>
            </>
          )}
        </div>

        {/* Footer CTA */}
        <div className="pwa-modal-footer">
          <div className="pwa-footer-icon">📱</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Open the App</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
              After installation, launch Ba Boook Corner directly from your Home Screen
              for a faster, app-like experience.
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem', marginTop: 8 }}>
          Read more, live better. 📚
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPWA, setShowPWA] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const userData = await login(form.email, form.password);
      navigate(userData.role === 'READER' ? '/books' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="auth-page">
      {showPWA && <PWAInstallModal onClose={() => setShowPWA(false)} />}

      <div className="auth-card">
        <div className="auth-logo">
          <img src={logoImg} alt="Ba Book Corner" />
          <h1>Ba Book Corner</h1>
          <p>Ba Foundation · Library Network</p>
        </div>

        <Alert type="error" message={error} />

        <form onSubmit={handleSubmit}>
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
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ margin: 0 }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.78rem', color: '#1E4D8C', fontWeight: 500 }}>
                Forgot password?
              </Link>
            </div>
            <input
              className="form-control"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Your password"
              required
              autoComplete="current-password"
            />
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: 8, padding: '11px 18px', fontSize: '0.95rem' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <button
          className="pwa-install-btn"
          onClick={() => setShowPWA(true)}
        >
          📲 Install Web App
        </button>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.875rem', color: 'var(--muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ fontWeight: 600 }}>Register here</Link>
        </p>

        <p style={{ textAlign: 'center', marginTop: 8, fontSize: '0.875rem' }}>
          <Link to="/catalogue" style={{ color: 'var(--green)', fontWeight: 500 }}>
            📚 Browse books without logging in →
          </Link>
        </p>
      </div>
    </div>
  );
}