import React from 'react';

// ── Status Badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  if (!status) return null;
  const key = status.toLowerCase();
  const labels = {
    available: 'Available',
    requested: 'Requested',
    request_accepted: 'Accepted',
    volunteer_picked: 'Picked Up',
    volunteer_delivered: 'Delivered',
    issued: 'Issued',
    return_requested: 'Return Req.',
    return_picked: 'Return Picked',
    return_delivered: 'Return Del.',
  };
  return (
    <span className={`badge badge-${key}`}>
      {labels[key] || status}
    </span>
  );
}

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
      >
        ← Prev
      </button>
      <span className="pagination-info">
        Page {page} of {totalPages}
      </span>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
      >
        Next →
      </button>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = '◫', title, message }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {message && <p style={{ marginTop: 6, fontSize: '0.875rem' }}>{message}</p>}
    </div>
  );
}

// ── Alert ─────────────────────────────────────────────────────────────────────
export function Alert({ type = 'error', message }) {
  if (!message) return null;
  return <div className={`alert alert-${type}`}>{message}</div>;
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
export function ConfirmModal({ title, message, onConfirm, onCancel, danger = false }) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <p style={{ color: 'var(--charcoal)', marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
