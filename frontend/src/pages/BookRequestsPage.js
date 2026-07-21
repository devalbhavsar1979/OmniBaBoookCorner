import React, { useState, useEffect, useCallback } from 'react';
import { wishRequestApi, libraryApi, getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Spinner, Pagination, EmptyState, Alert, Modal } from '../components/common';
import WishRequestAcceptModal from '../components/WishRequestAcceptModal';

const LANGUAGES = ['English', 'Gujarati', 'Hindi'];
const AGE_GROUPS = ['GENERIC', 'TODDLER', 'CHILDREN', 'TEENAGER', 'ADULT'];
const AGE_GROUP_LABELS = { GENERIC: 'All Ages', TODDLER: 'Toddler', CHILDREN: 'Children', TEENAGER: 'Teenager', ADULT: 'Adult' };
const CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'WORN'];
const CONDITION_LABELS = { NEW: 'New', GOOD: 'Good', FAIR: 'Fair', WORN: 'Worn' };

const TYPE_LABELS = { WANT_TO_READ: 'Want to Read', WANT_TO_CONTRIBUTE: 'Want to Contribute' };
const STATUS_LABELS = { PENDING: 'Pending', IN_PROGRESS: 'In Progress', FULFILLED: 'Fulfilled', REJECTED: 'Rejected' };

function TypeBadge({ type }) {
  if (!type) return null;
  return <span className={`badge badge-${type.toLowerCase()}`}>{TYPE_LABELS[type] || type}</span>;
}

function WishStatusBadge({ status }) {
  if (!status) return null;
  return <span className={`badge badge-${status.toLowerCase()}`}>{STATUS_LABELS[status] || status}</span>;
}

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Create / Edit Form ──────────────────────────────────────────────────────
function WishRequestFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [type, setType] = useState(initial?.type || 'WANT_TO_READ');
  const [title, setTitle] = useState(initial?.title || '');
  const [author, setAuthor] = useState(initial?.author || '');
  const [language, setLanguage] = useState(initial?.language || 'English');
  const [ageGroup, setAgeGroup] = useState(initial?.age_group || 'GENERIC');
  const [condition, setCondition] = useState(initial?.condition || 'GOOD');
  const [quantity, setQuantity] = useState(initial?.quantity || 1);
  const [targetLibraryId, setTargetLibraryId] = useState(initial?.target_library_id || '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [frontImg, setFrontImg] = useState(null);
  const [backImg, setBackImg] = useState(null);
  const [libraries, setLibraries] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    libraryApi.list({ page_size: 100 }).then(res => setLibraries(res.data.items)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !author.trim()) {
      setError('Title and author are required.');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      if (!isEdit) fd.append('type', type);
      fd.append('title', title.trim());
      fd.append('author', author.trim());
      fd.append('language', language);
      if (notes.trim()) fd.append('notes', notes.trim());
      if (targetLibraryId) fd.append('target_library_id', targetLibraryId);

      if (type === 'WANT_TO_READ') {
        fd.append('age_group', ageGroup);
      } else {
        fd.append('condition', condition);
        fd.append('quantity', quantity);
        if (frontImg) fd.append('front_image', frontImg);
        if (backImg) fd.append('back_image', backImg);
      }

      if (isEdit) {
        await wishRequestApi.update(initial.id, fd);
      } else {
        await wishRequestApi.create(fd);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save request. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Book Request' : 'New Book Request'} onClose={onClose}>
      <Alert type="error" message={error} />
      <form onSubmit={handleSubmit}>

        <div className="form-group">
          <label>Request Type</label>
          <select
            className="form-control"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={isEdit}
          >
            <option value="WANT_TO_READ">Want to Read (not in our catalogue)</option>
            <option value="WANT_TO_CONTRIBUTE">Want to Contribute (donate a book)</option>
          </select>
          {isEdit && (
            <small style={{ color: 'var(--muted)' }}>Request type can't be changed after creation.</small>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Book Title</label>
            <input className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Author</label>
            <input className="form-control" value={author} onChange={(e) => setAuthor(e.target.value)} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Language</label>
            <select className="form-control" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>

          {type === 'WANT_TO_READ' ? (
            <div className="form-group">
              <label>Target Age Group</label>
              <select className="form-control" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
                {AGE_GROUPS.map(a => <option key={a} value={a}>{AGE_GROUP_LABELS[a]}</option>)}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label>Book Condition</label>
              <select className="form-control" value={condition} onChange={(e) => setCondition(e.target.value)}>
                {CONDITIONS.map(c => <option key={c} value={c}>{CONDITION_LABELS[c]}</option>)}
              </select>
            </div>
          )}
        </div>

        {type === 'WANT_TO_CONTRIBUTE' && (
          <div className="form-row">
            <div className="form-group">
              <label>Quantity (copies)</label>
              <input
                type="number" min="1" className="form-control"
                value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="form-group">
              <label>Target Library (optional)</label>
              <select className="form-control" value={targetLibraryId} onChange={(e) => setTargetLibraryId(e.target.value)}>
                <option value="">Any / Ba Foundation network</option>
                {libraries.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {type === 'WANT_TO_READ' && (
          <div className="form-group">
            <label>Target Library (optional)</label>
            <select className="form-control" value={targetLibraryId} onChange={(e) => setTargetLibraryId(e.target.value)}>
              <option value="">Any / Ba Foundation network</option>
              {libraries.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        )}

        {type === 'WANT_TO_CONTRIBUTE' && (
          <div className="form-row">
            <div className="form-group">
              <label>Front Photo (optional)</label>
              <input className="form-control" type="file" accept=".jpg,.jpeg,.png,.gif" onChange={(e) => setFrontImg(e.target.files[0])} />
              {initial?.front_image && <img src={getImageUrl(initial.front_image)} alt="front" style={{ marginTop: 6, height: 60, borderRadius: 4 }} />}
            </div>
            <div className="form-group">
              <label>Back Photo (optional)</label>
              <input className="form-control" type="file" accept=".jpg,.jpeg,.png,.gif" onChange={(e) => setBackImg(e.target.files[0])} />
              {initial?.back_image && <img src={getImageUrl(initial.back_image)} alt="back" style={{ marginTop: 6, height: 60, borderRadius: 4 }} />}
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Notes (optional)</label>
          <textarea className="form-control" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Submit Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Detail View ──────────────────────────────────────────────────────────────
function WishRequestDetailModal({ wr, isAdmin, onClose, onAccept, onReject }) {
  const canAct = isAdmin && (wr.status === 'PENDING' || wr.status === 'IN_PROGRESS');
  return (
    <Modal title={`Request #${wr.id}`} onClose={onClose}>
      <div className="profile-detail-list">
        <div className="profile-detail-row">
          <span className="profile-detail-label">Type</span>
          <span className="profile-detail-value"><TypeBadge type={wr.type} /></span>
        </div>
        <div className="profile-detail-row">
          <span className="profile-detail-label">Status</span>
          <span className="profile-detail-value"><WishStatusBadge status={wr.status} /></span>
        </div>
        <div className="profile-detail-row">
          <span className="profile-detail-label">Title</span>
          <span className="profile-detail-value">{wr.title}</span>
        </div>
        <div className="profile-detail-row">
          <span className="profile-detail-label">Author</span>
          <span className="profile-detail-value">{wr.author}</span>
        </div>
        <div className="profile-detail-row">
          <span className="profile-detail-label">Language</span>
          <span className="profile-detail-value">{wr.language}</span>
        </div>
        {wr.type === 'WANT_TO_READ' ? (
          <div className="profile-detail-row">
            <span className="profile-detail-label">Age Group</span>
            <span className="profile-detail-value">{AGE_GROUP_LABELS[wr.age_group] || '—'}</span>
          </div>
        ) : (
          <>
            <div className="profile-detail-row">
              <span className="profile-detail-label">Condition</span>
              <span className="profile-detail-value">{CONDITION_LABELS[wr.condition] || '—'}</span>
            </div>
            <div className="profile-detail-row">
              <span className="profile-detail-label">Quantity</span>
              <span className="profile-detail-value">{wr.quantity}</span>
            </div>
          </>
        )}
        <div className="profile-detail-row">
          <span className="profile-detail-label">Target Library</span>
          <span className="profile-detail-value">{wr.target_library_name || 'Any / Ba Foundation network'}</span>
        </div>
        {isAdmin && (
          <div className="profile-detail-row">
            <span className="profile-detail-label">Requested By</span>
            <span className="profile-detail-value">{wr.requester_name}</span>
          </div>
        )}
        <div className="profile-detail-row">
          <span className="profile-detail-label">Requested On</span>
          <span className="profile-detail-value">{fmtDate(wr.created_at)}</span>
        </div>
        {wr.notes && (
          <div className="profile-detail-row">
            <span className="profile-detail-label">Notes</span>
            <span className="profile-detail-value">{wr.notes}</span>
          </div>
        )}
        {wr.admin_note && (
          <div className="profile-detail-row">
            <span className="profile-detail-label">Admin Note</span>
            <span className="profile-detail-value">{wr.admin_note}</span>
          </div>
        )}
        {wr.book_id && (
          <div className="profile-detail-row">
            <span className="profile-detail-label">Catalogue Entry</span>
            <span className="profile-detail-value">Book #{wr.book_id} {wr.book?.title ? `— ${wr.book.title}` : ''}</span>
          </div>
        )}
      </div>

      {(wr.front_image || wr.back_image) && (
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {wr.front_image && <img src={getImageUrl(wr.front_image)} alt="front" style={{ width: 90, borderRadius: 6, objectFit: 'cover' }} />}
          {wr.back_image && <img src={getImageUrl(wr.back_image)} alt="back" style={{ width: 90, borderRadius: 6, objectFit: 'cover' }} />}
        </div>
      )}

      {canAct && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button className="btn btn-danger" onClick={() => onReject(wr)}>Reject</button>
          <button className="btn btn-success" onClick={() => onAccept(wr)}>Accept &amp; Add to Library</button>
        </div>
      )}
    </Modal>
  );
}

// ── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({ wr, onClose, onDone }) {
  const [adminNote, setAdminNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleReject = async () => {
    setSaving(true);
    setError('');
    try {
      await wishRequestApi.reject(wr.id, adminNote.trim() || null);
      onDone();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reject request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Reject Request #${wr.id}`} onClose={onClose}>
      <Alert type="error" message={error} />
      <p style={{ color: 'var(--text)', marginBottom: 12 }}>
        Reject <strong>{wr.title}</strong> by <strong>{wr.requester_name}</strong>?
      </p>
      <div className="form-group">
        <label>Note (optional, visible to the requester)</label>
        <textarea className="form-control" rows={3} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-danger" onClick={handleReject} disabled={saving}>
          {saving ? 'Rejecting…' : 'Reject Request'}
        </button>
      </div>
    </Modal>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────────
function WishRequestRow({ wr, isAdmin, isOwn, onView, onEdit, onAccept, onReject }) {
  const canEdit = isOwn && wr.status === 'PENDING';
  const canAct = isAdmin && (wr.status === 'PENDING' || wr.status === 'IN_PROGRESS');
  return (
    <tr>
      <td><strong>#{wr.id}</strong></td>
      <td><TypeBadge type={wr.type} /></td>
      <td>
        <div style={{ fontWeight: 500 }}>{wr.title}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{wr.author}</div>
      </td>
      <td><WishStatusBadge status={wr.status} /></td>
      {isAdmin && (
        <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{wr.requester_name}</td>
      )}
      <td style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{fmtDate(wr.created_at)}</td>
      <td>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onView(wr)}>View</button>
          {canEdit && (
            <button className="btn btn-secondary btn-sm" onClick={() => onEdit(wr)}>Edit</button>
          )}
          {canAct && (
            <>
              <button className="btn btn-danger btn-sm" onClick={() => onReject(wr)}>Reject</button>
              <button className="btn btn-success btn-sm" onClick={() => onAccept(wr)}>Accept</button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BookRequestsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [formTarget, setFormTarget] = useState(null);   // { } for new, or wr object for edit
  const [showForm, setShowForm] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);
  const [acceptTarget, setAcceptTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  const PAGE_SIZE = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const res = isAdmin ? await wishRequestApi.listAll(params) : await wishRequestApi.listMine(params);
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setFormTarget(null); setShowForm(true); };
  const openEdit = (wr) => { setFormTarget(wr); setShowForm(true); };
  const closeForm = () => setShowForm(false);
  const handleSaved = () => { setShowForm(false); load(); };

  const handleView = (wr) => setViewTarget(wr);
  const handleAcceptFromDetail = (wr) => { setViewTarget(null); setAcceptTarget(wr); };
  const handleRejectFromDetail = (wr) => { setViewTarget(null); setRejectTarget(wr); };

  return (
    <>
      <div className="page-header">
        <h2>Book Requests</h2>
        <p>
          {isAdmin
            ? 'Review and act on every reader, owner, and volunteer book request across the network.'
            : 'Request a book you\'d like to read, or offer to contribute one to a library.'}
        </p>
      </div>

      <div className="page-content">
        <div className="search-bar" style={{ marginBottom: 16 }}>
          <select className="form-control" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} style={{ maxWidth: 220 }}>
            <option value="">All Types</option>
            <option value="WANT_TO_READ">Want to Read</option>
            <option value="WANT_TO_CONTRIBUTE">Want to Contribute</option>
          </select>
          <select className="form-control" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ maxWidth: 180 }}>
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="FULFILLED">Fulfilled</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', alignSelf: 'center' }}>
            {total} {total === 1 ? 'request' : 'requests'}
          </span>
          {!isAdmin && (
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openNew}>
              + New Request
            </button>
          )}
        </div>

        {loading ? <Spinner /> : items.length === 0 ? (
          <EmptyState icon="📖" title="No requests found" message={isAdmin ? 'Requests will appear here as users submit them.' : 'Raise a request for a book to read, or to contribute one.'} />
        ) : (
          <>
            <div className="card table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Book</th>
                    <th>Status</th>
                    {isAdmin && <th>Requested By</th>}
                    <th>Requested On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(wr => (
                    <WishRequestRow
                      key={wr.id}
                      wr={wr}
                      isAdmin={isAdmin}
                      isOwn={!isAdmin || wr.requester_id === user.id}
                      onView={handleView}
                      onEdit={openEdit}
                      onAccept={setAcceptTarget}
                      onReject={setRejectTarget}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />
          </>
        )}
      </div>

      {showForm && (
        <WishRequestFormModal initial={formTarget} onClose={closeForm} onSaved={handleSaved} />
      )}

      {viewTarget && (
        <WishRequestDetailModal
          wr={viewTarget}
          isAdmin={isAdmin}
          onClose={() => setViewTarget(null)}
          onAccept={handleAcceptFromDetail}
          onReject={handleRejectFromDetail}
        />
      )}

      {acceptTarget && (
        <WishRequestAcceptModal
          wr={acceptTarget}
          onClose={() => setAcceptTarget(null)}
          onDone={() => { setAcceptTarget(null); load(); }}
        />
      )}

      {rejectTarget && (
        <RejectModal
          wr={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onDone={() => { setRejectTarget(null); load(); }}
        />
      )}
    </>
  );
}