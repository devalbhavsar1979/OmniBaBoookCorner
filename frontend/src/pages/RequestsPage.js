import React, { useState, useEffect, useCallback } from 'react';
import { requestApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Spinner, Pagination, EmptyState, StatusBadge, ConfirmModal, Alert } from '../components/common';

const STATUS_OPTIONS = [
  '', 'REQUESTED', 'REQUEST_ACCEPTED', 'VOLUNTEER_PICKED',
  'VOLUNTEER_DELIVERED', 'ISSUED', 'RETURN_REQUESTED',
  'RETURN_PICKED', 'RETURN_DELIVERED',
];

function getNextActionLabel(status, role) {
  if (role === 'VOLUNTEER') {
    const map = {
      REQUESTED: 'Accept Request',
      REQUEST_ACCEPTED: 'Mark Picked Up',
      VOLUNTEER_PICKED: 'Mark Delivered',
      RETURN_REQUESTED: 'Pick Up Return',
      RETURN_PICKED: 'Deliver Return',
    };
    return map[status] || null;
  }
  if (role === 'OWNER') {
    const map = {
      VOLUNTEER_DELIVERED: 'Issue to Reader',
      RETURN_DELIVERED: 'Mark Returned (Available)',
    };
    return map[status] || null;
  }
  if (role === 'READER') {
    if (status === 'ISSUED') return 'Request Return';
  }
  return null;
}

// ── Build timeline steps from a request object ────────────────────────────────
function buildTimeline(req) {
  const reader = req.reader?.full_name || req.reader?.email || `User #${req.reader_id}`;
  const volunteer = req.volunteer?.full_name || req.volunteer?.email || null;
  const owner = 'Library Owner';

  const steps = [
    {
      status: 'REQUESTED',
      label: 'Request Placed',
      description: `Reader requested the book`,
      actor: reader,
      actorRole: 'Reader',
      timestamp: req.requested_at,
      icon: '📖',
    },
    {
      status: 'REQUEST_ACCEPTED',
      label: 'Request Accepted',
      description: `Volunteer accepted the delivery`,
      actor: volunteer,
      actorRole: 'Volunteer',
      timestamp: req.accepted_at,
      icon: '✋',
    },
    {
      status: 'VOLUNTEER_PICKED',
      label: 'Book Picked Up',
      description: `Book collected from library`,
      actor: volunteer,
      actorRole: 'Volunteer',
      timestamp: req.picked_at,
      icon: '📦',
    },
    {
      status: 'VOLUNTEER_DELIVERED',
      label: 'Delivered to Reader',
      description: `Book delivered at reader's address`,
      actor: volunteer,
      actorRole: 'Volunteer',
      timestamp: req.delivered_at,
      icon: '🚚',
    },
    {
      status: 'ISSUED',
      label: 'Book Issued',
      description: `Book officially issued to reader`,
      actor: owner,
      actorRole: 'Library Owner',
      timestamp: req.issued_at,
      icon: '✅',
    },
    {
      status: 'RETURN_REQUESTED',
      label: 'Return Requested',
      description: `Reader initiated return`,
      actor: reader,
      actorRole: 'Reader',
      timestamp: req.return_requested_at,
      icon: '↩️',
    },
    {
      status: 'RETURN_PICKED',
      label: 'Return Picked Up',
      description: `Book collected from reader`,
      actor: volunteer,
      actorRole: 'Volunteer',
      timestamp: req.return_picked_at,
      icon: '📦',
    },
    {
      status: 'RETURN_DELIVERED',
      label: 'Returned to Library',
      description: `Book delivered back to library`,
      actor: volunteer,
      actorRole: 'Volunteer',
      timestamp: req.return_delivered_at,
      icon: '🏛️',
    },
    {
      status: 'AVAILABLE',
      label: 'Return Confirmed',
      description: `Book marked available again`,
      actor: owner,
      actorRole: 'Library Owner',
      timestamp: req.closed_at,
      icon: '🎉',
    },
  ];

  // Order of completed statuses to determine which steps are done
  const STATUS_ORDER = [
    'REQUESTED', 'REQUEST_ACCEPTED', 'VOLUNTEER_PICKED',
    'VOLUNTEER_DELIVERED', 'ISSUED', 'RETURN_REQUESTED',
    'RETURN_PICKED', 'RETURN_DELIVERED', 'AVAILABLE',
  ];

  const currentIndex = STATUS_ORDER.indexOf(req.status);

  return steps.map((step, i) => {
    const stepIndex = STATUS_ORDER.indexOf(step.status);
    const isDone = step.timestamp != null;
    const isCurrent = stepIndex === currentIndex && !isDone && step.timestamp == null;
    const isPending = !isDone && !isCurrent;
    return { ...step, isDone, isCurrent, isPending };
  }).filter((step) => {
    // Hide pending return steps if the book isn't issued yet
    const returnSteps = ['RETURN_REQUESTED', 'RETURN_PICKED', 'RETURN_DELIVERED', 'AVAILABLE'];
    if (returnSteps.includes(step.status) && !req.issued_at && !step.isDone) {
      return false;
    }
    return true;
  });
}

function fmt(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

// ── Timeline Modal ────────────────────────────────────────────────────────────
function TimelineModal({ req, onClose }) {
  const steps = buildTimeline(req);

  const roleColors = {
    'Reader': 'var(--forest)',
    'Volunteer': 'var(--sienna)',
    'Library Owner': 'var(--charcoal)',
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.1rem' }}>Request #{req.id} — History</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>
              {req.book?.title} &nbsp;·&nbsp; Current: <StatusBadge status={req.status} />
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* ── Info strip ── */}
        <div style={{
          display: 'flex', gap: 16, flexWrap: 'wrap',
          padding: '10px 14px', marginBottom: 20,
          background: 'var(--parchment)',
          borderRadius: 'var(--radius)',
          fontSize: '0.8rem', color: 'var(--charcoal)',
        }}>
          <span>📖 <strong>Reader:</strong> {req.reader?.full_name || `#${req.reader_id}`}</span>
          {req.volunteer && <span>🚴 <strong>Volunteer:</strong> {req.volunteer.full_name}</span>}
          <span>📍 {req.delivery_address}</span>
        </div>

        {/* ── Timeline ── */}
        <div style={{ position: 'relative' }}>
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            return (
              <div key={step.status} style={{ display: 'flex', gap: 14, marginBottom: isLast ? 0 : 4 }}>

                {/* Left column: icon + vertical line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36, flexShrink: 0 }}>
                  <div style={{
                    width: 36, height: 36,
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem',
                    background: step.isDone
                      ? 'var(--forest)'
                      : step.isCurrent
                        ? 'var(--sienna)'
                        : 'var(--border)',
                    color: step.isDone || step.isCurrent ? 'white' : 'var(--muted)',
                    border: step.isCurrent ? '2px solid var(--rust)' : '2px solid transparent',
                    flexShrink: 0,
                    boxShadow: step.isCurrent ? '0 0 0 3px rgba(196,112,74,0.2)' : 'none',
                  }}>
                    {step.isDone ? '✓' : step.isCurrent ? '●' : step.icon}
                  </div>
                  {!isLast && (
                    <div style={{
                      width: 2,
                      flex: 1,
                      minHeight: 24,
                      background: step.isDone ? 'var(--forest)' : 'var(--border)',
                      margin: '3px 0',
                    }} />
                  )}
                </div>

                {/* Right column: content */}
                <div style={{
                  flex: 1,
                  paddingBottom: isLast ? 0 : 16,
                  opacity: step.isPending ? 0.4 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: step.isDone ? 'var(--ink)' : step.isCurrent ? 'var(--sienna)' : 'var(--muted)',
                    }}>
                      {step.label}
                    </span>
                    {step.isCurrent && (
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700,
                        padding: '1px 7px', borderRadius: 999,
                        background: 'var(--sienna)', color: 'white',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        Current
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 1 }}>
                    {step.description}
                  </div>

                  {step.isDone && (
                    <div style={{ display: 'flex', gap: 12, marginTop: 5, flexWrap: 'wrap' }}>
                      {step.actor && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: '0.75rem', fontWeight: 500,
                          color: roleColors[step.actorRole] || 'var(--charcoal)',
                          background: 'var(--parchment)',
                          border: '1px solid var(--border)',
                          borderRadius: 4, padding: '2px 8px',
                        }}>
                          {step.actorRole === 'Reader' ? '👤' : step.actorRole === 'Volunteer' ? '🚴' : '🏛️'}
                          {step.actor}
                          <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({step.actorRole})</span>
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', alignSelf: 'center' }}>
                        🕐 {fmt(step.timestamp)}
                      </span>
                    </div>
                  )}

                  {step.isPending && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>
                      Pending
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Request Row ───────────────────────────────────────────────────────────────
function RequestRow({ req, user, onAdvance, onCancel, onViewHistory }) {
  const actionLabel = getNextActionLabel(req.status, user.role);
  const canCancel = user.role === 'READER' && req.status === 'REQUESTED';

  return (
    <tr>
      <td><strong>#{req.id}</strong></td>
      <td>
        <div style={{ fontWeight: 500 }}>{req.book?.title || `Book #${req.book_id}`}</div>
        {req.book && <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{req.book.author}</div>}
      </td>
      <td><StatusBadge status={req.status} /></td>
      <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
        {req.reader?.full_name || `User #${req.reader_id}`}
      </td>
      <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
        {req.volunteer?.full_name || (req.status === 'REQUESTED' ? <em>Unassigned</em> : '—')}
      </td>
      <td style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
        {new Date(req.requested_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      </td>
      <td>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onViewHistory(req)}
            title="View full history"
          >
            History
          </button>
          {actionLabel && (
            <button className="btn btn-success btn-sm" onClick={() => onAdvance(req)}>
              {actionLabel}
            </button>
          )}
          {canCancel && (
            <button className="btn btn-danger btn-sm" onClick={() => onCancel(req)}>
              Cancel
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [advanceTarget, setAdvanceTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [actionError, setActionError] = useState('');

  const PAGE_SIZE = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      const res = await requestApi.list(params);
      setRequests(res.data.items);
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleAdvance = async () => {
    setActionError('');
    try {
      await requestApi.advance(advanceTarget.id);
      setAdvanceTarget(null);
      load();
    } catch (e) {
      setActionError(e.response?.data?.detail || 'Action failed.');
    }
  };

  const handleCancel = async () => {
    try {
      await requestApi.cancel(cancelTarget.id);
      setCancelTarget(null);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to cancel.');
    }
  };

  const roleHint = {
    READER: 'Track your book requests and initiate returns.',
    VOLUNTEER: 'Accept delivery requests and update pickup/delivery status.',
    OWNER: 'Issue books to readers and mark returns as available.',
  };

  return (
    <>
      <div className="page-header">
        <h2>Book Requests</h2>
        <p>{roleHint[user?.role]}</p>
      </div>

      <div className="page-content">
        <div className="search-bar" style={{ marginBottom: 16 }}>
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ maxWidth: 220 }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s || 'All Statuses'}</option>
            ))}
          </select>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', alignSelf: 'center' }}>
            {total} {total === 1 ? 'request' : 'requests'}
          </span>
        </div>

        {loading ? <Spinner /> : requests.length === 0 ? (
          <EmptyState icon="◎" title="No requests found" message="Requests will appear here as they come in." />
        ) : (
          <>
            <div className="card table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Book</th>
                    <th>Status</th>
                    <th>Reader</th>
                    <th>Volunteer</th>
                    <th>Requested</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <RequestRow
                      key={req.id}
                      req={req}
                      user={user}
                      onAdvance={setAdvanceTarget}
                      onCancel={setCancelTarget}
                      onViewHistory={setHistoryTarget}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* ── History timeline modal ── */}
      {historyTarget && (
        <TimelineModal req={historyTarget} onClose={() => setHistoryTarget(null)} />
      )}

      {/* ── Advance confirm modal ── */}
      {advanceTarget && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Confirm Action</h3>
              <button className="modal-close" onClick={() => { setAdvanceTarget(null); setActionError(''); }}>✕</button>
            </div>
            <Alert type="error" message={actionError} />
            <p style={{ color: 'var(--charcoal)', marginBottom: 8 }}>
              Request <strong>#{advanceTarget.id}</strong> — <em>{advanceTarget.book?.title}</em>
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 20 }}>
              Current status: <StatusBadge status={advanceTarget.status} />
            </p>
            <p style={{ marginBottom: 20 }}>
              Action: <strong>{getNextActionLabel(advanceTarget.status, user?.role)}</strong>
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setAdvanceTarget(null); setActionError(''); }}>Cancel</button>
              <button className="btn btn-success" onClick={handleAdvance}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel confirm modal ── */}
      {cancelTarget && (
        <ConfirmModal
          title="Cancel Request"
          message={`Cancel request for "${cancelTarget.book?.title}"?`}
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(null)}
          danger
        />
      )}
    </>
  );
}
