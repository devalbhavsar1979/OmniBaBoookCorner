import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../services/api';
import { Spinner } from '../components/common';
import { useAuth } from '../context/AuthContext';

const STAT_META = [
  { key: 'total_libraries', label: 'Libraries',  icon: '🏛️', color: '#1E4D8C' },
  { key: 'total_books',     label: 'Books',      icon: '📚', color: '#2E8B57' },
  { key: 'total_requests',  label: 'Requests',   icon: '📋', color: '#0F766E' },
  { key: 'total_users',     label: 'Members',    icon: '👥', color: '#7C3AED' },
];

function BarChart({ data, labelKey, countKey, color = '#1E4D8C' }) {
  if (!data || data.length === 0)
    return <p style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '12px 0' }}>No data yet.</p>;
  const max = Math.max(...data.map(d => d[countKey]), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 130, fontSize: '0.75rem', color: 'var(--text-2)', textAlign: 'right',
            flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontWeight: 500,
          }}>
            {item[labelKey]}
          </div>
          <div style={{
            flex: 1, background: 'var(--surface-2)',
            borderRadius: 999, height: 20, overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.max((item[countKey] / max) * 100, 2)}%`,
              background: `linear-gradient(90deg, ${color}CC, ${color})`,
              height: '100%', borderRadius: 999, minWidth: 4,
              transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
            }} />
          </div>
          <div style={{
            width: 32, fontSize: '0.75rem', color: 'var(--muted)',
            textAlign: 'right', flexShrink: 0, fontWeight: 600,
          }}>
            {item[countKey]}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, icon, children }) {
  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <h4 style={{
          fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.07em', color: 'var(--text-2)', fontFamily: 'var(--font-body)',
        }}>
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.stats()
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Welcome back, {user?.full_name} — here's your network overview</p>
      </div>

      <div className="page-content">
        {stats && (
          <>
            {/* Stat cards */}
            <div className="stats-grid">
              {STAT_META.map(m => (
                <div key={m.key} className="stat-card">
                  <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>{m.icon}</div>
                  <div className="stat-value">{stats[m.key]}</div>
                  <div className="stat-label">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
              <ChartCard title="Books by Status" icon="📊">
                <BarChart data={stats.books_by_status} labelKey="status" countKey="count" color="#1E4D8C" />
              </ChartCard>
              <ChartCard title="Books by Genre" icon="🏷️">
                <BarChart data={stats.books_by_genre} labelKey="genre" countKey="count" color="#2E8B57" />
              </ChartCard>
              <ChartCard title="Books by Language" icon="🌐">
                <BarChart data={stats.books_by_language} labelKey="language" countKey="count" color="#0F766E" />
              </ChartCard>
              <ChartCard title="Top Authors" icon="✍️">
                <BarChart data={stats.books_by_author} labelKey="author" countKey="count" color="#7C3AED" />
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </>
  );
}
