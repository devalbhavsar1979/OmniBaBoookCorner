import React, { useState, useEffect, useCallback, useRef } from 'react';
import { adminApi, libraryApi, getImageUrl } from '../services/api';
import { Spinner, Pagination, EmptyState, StatusBadge } from '../components/common';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG = {
  overdue:     { border: '#EF4444', badge: '#EF4444', label: 'Overdue' },
  second_week: { border: '#F59E0B', badge: '#F59E0B', label: '2nd Week' },
  on_time:     { border: 'transparent', badge: '#10B981', label: 'On Time' },
};

function DaysBadge({ days, status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 99,
      fontSize: '0.78rem',
      fontWeight: 700,
      background: cfg.badge,
      color: '#fff',
      whiteSpace: 'nowrap',
    }}>
      {days}d — {cfg.label}
    </span>
  );
}

function IssueCard({ item, isAdmin }) {
  const cfg = STATUS_CONFIG[item.status];
  const issuedDate = new Date(item.issued_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const coverUrl = getImageUrl(item.book_front_image);
  const [reminderState, setReminderState] = useState('idle'); // idle | sending | sent | error
  const timerRef = useRef(null);

  const handleRemind = async () => {
    setReminderState('sending');
    try {
      await adminApi.sendOverdueReminder(item.request_id);
      setReminderState('sent');
      timerRef.current = setTimeout(() => setReminderState('idle'), 4000);
    } catch {
      setReminderState('error');
      timerRef.current = setTimeout(() => setReminderState('idle'), 4000);
    }
  };

  // cleanup timer on unmount
  React.useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div style={{
      display: 'flex',
      gap: 14,
      padding: '14px 16px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderLeft: `4px solid ${cfg.border}`,
      borderRadius: 'var(--radius)',
      marginBottom: 10,
      alignItems: 'flex-start',
    }}>
      {/* Cover thumbnail */}
      <div style={{
        width: 52, height: 72, flexShrink: 0,
        borderRadius: 4, overflow: 'hidden',
        background: 'var(--parchment)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {coverUrl
          ? <img src={coverUrl} alt={item.book_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '1.4rem', color: 'var(--muted)' }}>📖</span>}
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', marginBottom: 4,
        }}>
          <div style={{
            fontWeight: 700, fontSize: '0.95rem',
            color: 'var(--charcoal)', lineHeight: 1.3,
          }}>
            {item.book_title}
          </div>
          <DaysBadge days={item.days_issued} status={item.status} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>🏛️ {item.library_name}</span>
          <StatusBadge status={item.request_status} />
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--charcoal)', marginBottom: 2 }}>
          👤 <strong>{item.reader_name}</strong>
          <span style={{ color: 'var(--muted)', marginLeft: 6 }}>
            {item.reader_contact}
          </span>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: item.status === 'overdue' ? 10 : 0 }}>
          Issued: {issuedDate}
        </div>

        {/* Send Reminder button — overdue cards, admin only */}
        {isAdmin && item.status === 'overdue' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn btn-sm"
              disabled={reminderState === 'sending' || reminderState === 'sent'}
              onClick={handleRemind}
              style={{
                background: reminderState === 'sent' ? '#10B981' : '#EF4444',
                color: '#fff', border: 'none', cursor: reminderState === 'sent' ? 'default' : 'pointer',
                fontSize: '0.78rem', padding: '4px 12px',
              }}
            >
              {reminderState === 'sending' ? '⏳ Sending…'
                : reminderState === 'sent' ? '✓ Reminder Sent'
                : '📧 Send Reminder'}
            </button>
            {reminderState === 'error' && (
              <span style={{ fontSize: '0.75rem', color: '#EF4444' }}>
                Failed to send — check SMTP settings
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function IssueRegisterPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  const [data, setData] = useState(null);
  const [libraries, setLibraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [libraryId, setLibraryId] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.issueRegister({
        page,
        page_size: PAGE_SIZE,
        ...(libraryId ? { library_id: libraryId } : {}),
        ...(overdueOnly ? { overdue_only: true } : {}),
      });
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, libraryId, overdueOnly]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isAdmin) {
      libraryApi.list({ page_size: 100 }).then(r => setLibraries(r.data.items || [])).catch(() => {});
    }
  }, [isAdmin]);

  const stats = data?.stats;

  return (
    <>
      <div className="page-header">
        <h2>Issue Register</h2>
        <p>{isAdmin ? 'All books currently issued to readers' : 'Books currently issued to you'}</p>
      </div>

      <div className="page-content">

        {/* Summary chips */}
        {stats && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{
              padding: '8px 16px', borderRadius: 99,
              background: '#D1FAE5', color: '#065F46',
              fontWeight: 700, fontSize: '0.85rem',
            }}>
              🟢 On Time: {stats.on_time}
            </div>
            <div style={{
              padding: '8px 16px', borderRadius: 99,
              background: '#FEF3C7', color: '#92400E',
              fontWeight: 700, fontSize: '0.85rem',
            }}>
              🟡 2nd Week (8–{data.overdue_days}d): {stats.second_week}
            </div>
            <div style={{
              padding: '8px 16px', borderRadius: 99,
              background: '#FEE2E2', color: '#991B1B',
              fontWeight: 700, fontSize: '0.85rem',
            }}>
              🔴 Overdue (&gt;{data.overdue_days}d): {stats.overdue}
            </div>
          </div>
        )}

        {/* Filters — admin only */}
        {isAdmin && (
          <div style={{
            display: 'flex', gap: 10, marginBottom: 16,
            flexWrap: 'wrap', alignItems: 'center',
          }}>
            <select
              className="form-control"
              style={{ maxWidth: 220 }}
              value={libraryId}
              onChange={e => { setLibraryId(e.target.value); setPage(1); }}
            >
              <option value="">All Book Corners</option>
              {libraries.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>

            <label style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: '0.875rem', color: 'var(--charcoal)',
              cursor: 'pointer', userSelect: 'none',
            }}>
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={e => { setOverdueOnly(e.target.checked); setPage(1); }}
              />
              Show overdue only
            </label>

            {(libraryId || overdueOnly) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { setLibraryId(''); setOverdueOnly(false); setPage(1); }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* List */}
        {loading ? (
          <Spinner />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No issued books"
            message={overdueOnly ? 'No overdue books found.' : 'No books are currently issued.'}
          />
        ) : (
          <>
            <div style={{ marginBottom: 8, fontSize: '0.82rem', color: 'var(--muted)' }}>
              {data.total} record{data.total !== 1 ? 's' : ''}
              {overdueOnly ? ' (overdue only)' : ''}
            </div>
            {data.items.map(item => (
              <IssueCard key={item.request_id} item={item} isAdmin={isAdmin} />
            ))}
            <Pagination
              page={page}
              totalPages={Math.ceil(data.total / PAGE_SIZE)}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </>
  );
}
