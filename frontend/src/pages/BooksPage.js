import React, { useState, useEffect, useCallback } from 'react';
import { bookApi, libraryApi, requestApi, getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Spinner, Modal, Pagination, EmptyState, Alert, StatusBadge, ConfirmModal } from '../components/common';
import UserSearchPopup from '../components/UserSearchPopup';

const GENRES = ['Fiction', 'Non-Fiction', 'Comedy','Science', 'History', 'Biography', 'Self-Help', 'Children', 'Poetry', 'Philosophy', 'Religion', 'Technology', 'Other'];
const LANGUAGES = ['English', 'Gujarati', 'Hindi'];
const AGE_GROUPS = ['GENERIC', 'TODDLER', 'CHILDREN', 'TEENAGER', 'ADULT'];
const AGE_GROUP_LABELS = { GENERIC: 'All Ages', TODDLER: 'Toddler', CHILDREN: 'Children', TEENAGER: 'Teenager', ADULT: 'Adult' };

function BookFormModal({ libraryId, libraries, initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    title: initial?.title || '',
    author: initial?.author || '',
    genre: initial?.genre || 'Fiction',
    language: initial?.language || 'English',
    age_group: initial?.age_group || 'GENERIC',
    description: initial?.description || '',
    library_id: libraryId || (libraries[0]?.id ?? ''),
  });
  const [frontImg, setFrontImg] = useState(null);
  const [backImg, setBackImg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('author', form.author);
      fd.append('genre', form.genre);
      fd.append('language', form.language);
      fd.append('age_group', form.age_group);
      if (form.description) fd.append('description', form.description);
      if (frontImg) fd.append('front_image', frontImg);
      if (backImg) fd.append('back_image', backImg);

      if (isEdit) {
        await bookApi.update(initial.id, fd);
      } else {
        await bookApi.create(form.library_id, fd);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save book.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Alert type="error" message={error} />
      {!isEdit && (
        <div className="form-group">
          <label>Library *</label>
          <select className="form-control" name="library_id" value={form.library_id} onChange={set} required>
            {libraries.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      )}
      <div className="form-group">
        <label>Title *</label>
        <input className="form-control" name="title" value={form.title} onChange={set} required />
      </div>
      <div className="form-group">
        <label>Author *</label>
        <input className="form-control" name="author" value={form.author} onChange={set} required />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Genre *</label>
          <select className="form-control" name="genre" value={form.genre} onChange={set}>
            {GENRES.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Language *</label>
          <select className="form-control" name="language" value={form.language} onChange={set}>
            {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Target Age Group</label>
        <select className="form-control" name="age_group" value={form.age_group} onChange={set}>
          {AGE_GROUPS.map((a) => <option key={a} value={a}>{AGE_GROUP_LABELS[a]}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea className="form-control" name="description" value={form.description} onChange={set} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Front Image</label>
          <input className="form-control" type="file" accept=".jpg,.jpeg,.png,.gif" onChange={(e) => setFrontImg(e.target.files[0])} />
          {initial?.front_image && <img src={getImageUrl(initial.front_image)} alt="front" style={{ marginTop: 6, height: 60, borderRadius: 4 }} />}
        </div>
        <div className="form-group">
          <label>Back Image</label>
          <input className="form-control" type="file" accept=".jpg,.jpeg,.png,.gif" onChange={(e) => setBackImg(e.target.files[0])} />
          {initial?.back_image && <img src={getImageUrl(initial.back_image)} alt="back" style={{ marginTop: 6, height: 60, borderRadius: 4 }} />}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save Book'}
        </button>
      </div>
    </form>
  );
}

function RequestModal({ book, onClose, onRequested }) {
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await requestApi.create({ book_id: book.id, delivery_address: address, delivery_notes: notes });
      onRequested();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Alert type="error" message={error} />
      <p style={{ marginBottom: 16, color: 'var(--charcoal)' }}>
        You are requesting: <strong>{book.title}</strong> by {book.author}
      </p>
      <div className="form-group">
        <label>Delivery Address *</label>
        <textarea className="form-control" value={address} onChange={(e) => setAddress(e.target.value)} required rows={3} placeholder="Your full delivery address" />
      </div>
      <div className="form-group">
        <label>Notes (optional)</label>
        <textarea className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any special instructions" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Submitting…' : 'Submit Request'}
        </button>
      </div>
    </form>
  );
}

export default function BooksPage() {
  const { user, isRole, isSuperAdmin } = useAuth();
  const isOwner = isRole('OWNER');
  const isReader = isRole('READER');
  const canManage = isOwner || isSuperAdmin;
  const navigate = useNavigate();
  const location = useLocation();

  // Read library filter from URL query params (set by Libraries page)
  const urlParams = new URLSearchParams(location.search);
  const urlLibraryId = urlParams.get('library_id') ? Number(urlParams.get('library_id')) : null;
  const urlLibraryName = urlParams.get('library_name') || '';

  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [language, setLanguage] = useState([]);
  const [ageGroup, setAgeGroup] = useState('');
  const [activeLibraryId, setActiveLibraryId] = useState(urlLibraryId);
  const [activeLibraryName, setActiveLibraryName] = useState(urlLibraryName);
  const [loading, setLoading] = useState(true);

  const [myLibraries, setMyLibraries] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [deleteBook, setDeleteBook] = useState(null);
  const [requestBook, setRequestBook] = useState(null);
  const [issueBook, setIssueBook] = useState(null);
  const [viewBook, setViewBook] = useState(null);

  const PAGE_SIZE = 12;

  // Sync URL params when they change (e.g. user navigates from Libraries again)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const lid = params.get('library_id') ? Number(params.get('library_id')) : null;
    const lname = params.get('library_name') || '';
    setActiveLibraryId(lid);
    setActiveLibraryName(lname);
    setPage(1);
  }, [location.search]);

  const clearLibraryFilter = () => {
    setActiveLibraryId(null);
    setActiveLibraryName('');
    navigate('/books', { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search, genre, page, page_size: PAGE_SIZE };
      if (language.length > 0) params.language = language.join(',');
      if (ageGroup) params.age_group = ageGroup;
      if (activeLibraryId) params.library_id = activeLibraryId;
      const res = await bookApi.list(params);
      setBooks(res.data.items);
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, genre, language, ageGroup, page, activeLibraryId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (canManage) {
      libraryApi.mine().then((res) => setMyLibraries(res.data)).catch(console.error);
    }
  }, [canManage]);

  const handleDelete = async () => {
    try {
      await bookApi.delete(deleteBook.id);
      setDeleteBook(null);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Cannot delete this book.');
    }
  };

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>Books</h2>
            <p>
              {total} {total === 1 ? 'book' : 'books'}
              {activeLibraryName ? ` in ${activeLibraryName}` : ' across all libraries'}
            </p>
          </div>
          {canManage && myLibraries.length > 0 && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              + Add Book
            </button>
          )}
        </div>
      </div>

      <div className="page-content">

        {/* ── Active library filter banner ── */}
        {activeLibraryName && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            marginBottom: 16,
            background: 'var(--parchment)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--sienna)',
            borderRadius: 'var(--radius)',
            fontSize: '0.875rem',
          }}>
            <span>
              <strong style={{ color: 'var(--sienna)' }}>Filtered:</strong>{' '}
              Showing books from <strong>{activeLibraryName}</strong>
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={clearLibraryFilter}
              style={{ marginLeft: 12, flexShrink: 0 }}
            >
              ✕ Clear Filter
            </button>
          </div>
        )}
        <div className="search-bar">
          <input
            className="form-control"
            placeholder="Search title or author…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="form-control" value={genre} onChange={(e) => { setGenre(e.target.value); setPage(1); }} style={{ maxWidth: 160 }}>
            <option value="">All Genres</option>
            {GENRES.map((g) => <option key={g}>{g}</option>)}
          </select>
          <select className="form-control" value={ageGroup} onChange={(e) => { setAgeGroup(e.target.value); setPage(1); }} style={{ maxWidth: 150 }}>
            <option value="">All Ages</option>
            {AGE_GROUPS.map((a) => <option key={a} value={a}>{AGE_GROUP_LABELS[a]}</option>)}
          </select>
          <div className="language-checkboxes">
            <span className="language-checkboxes-label">Language:</span>
            {LANGUAGES.map((l) => (
              <label key={l} className="language-checkbox-item">
                <input
                  type="checkbox"
                  checked={language.includes(l)}
                  onChange={(e) => {
                    setPage(1);
                    setLanguage((prev) =>
                      e.target.checked ? [...prev, l] : prev.filter((x) => x !== l)
                    );
                  }}
                />
                {l}
              </label>
            ))}
          </div>
        </div>

        {loading ? <Spinner /> : books.length === 0 ? (
          <EmptyState icon="◫" title="No books found" message="Try adjusting your search filters." />
        ) : (
          <>
            <div className="card-grid">
              {books.map((book, idx) => (
                <div key={book.id} className="book-card">
                  <div className={`book-card-top${idx % 2 === 1 ? ' book-card-top-reverse' : ''}`}>
                    <div className="book-card-body">
                      <div className="book-card-title">{book.title}</div>
                      <div className="book-card-author">by {book.author}</div>
                      {book.library_name && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
                          🏛️ {book.library_name}
                          {book.library_owner_name && <> — Owner: {book.library_owner_name}</>}
                        </div>
                      )}
                      {!isReader && book.status === 'ISSUED' && book.issued_to_reader_name && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
                          📖 Issued to: {book.issued_to_reader_name}
                        </div>
                      )}
                      <div className="book-card-meta">
                        <span className="book-card-tag">{book.genre}</span>
                        <span className="book-card-tag">{book.language}</span>
                        {book.age_group && book.age_group !== 'GENERIC' && (
                          <span className="book-card-tag book-card-tag-age">👶 {AGE_GROUP_LABELS[book.age_group]}</span>
                        )}
                      </div>
                      <div>
                        <StatusBadge status={isReader ? (book.status === 'AVAILABLE' ? 'AVAILABLE' : 'ISSUED') : book.status} />
                      </div>
                    </div>
                    <div className="book-card-image">
                      {book.front_image
                        ? <img src={getImageUrl(book.front_image)} alt={book.title} />
                        : <span className="no-image">B</span>
                      }
                    </div>
                  </div>
                  <div className="book-card-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setViewBook(book)}>
                      Details
                    </button>
                    {isReader && book.status === 'AVAILABLE' && (
                      <button className="btn btn-primary btn-sm" onClick={() => setRequestBook(book)}>
                        Request
                      </button>
                    )}
                    {canManage && book.status === 'AVAILABLE' && (
                      <button className="btn btn-warning btn-sm" onClick={() => setIssueBook(book)}>
                        Issue
                      </button>
                    )}
                    {canManage && (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditBook(book)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteBook(book)}>Del</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />
          </>
        )}
      </div>

      {showAdd && (
        <Modal title="Add Book" onClose={() => setShowAdd(false)}>
          <BookFormModal libraries={myLibraries} onClose={() => setShowAdd(false)} onSaved={load} />
        </Modal>
      )}

      {editBook && (
        <Modal title="Edit Book" onClose={() => setEditBook(null)}>
          <BookFormModal initial={editBook} libraries={myLibraries} onClose={() => setEditBook(null)} onSaved={load} />
        </Modal>
      )}

      {viewBook && (
        <Modal title="Book Details" onClose={() => setViewBook(null)}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            {viewBook.front_image && <img src={getImageUrl(viewBook.front_image)} alt="front" style={{ width: 90, borderRadius: 6, objectFit: 'cover' }} />}
            {viewBook.back_image && <img src={getImageUrl(viewBook.back_image)} alt="back" style={{ width: 90, borderRadius: 6, objectFit: 'cover' }} />}
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 4 }}>{viewBook.title}</h3>
          <p style={{ color: 'var(--muted)', marginBottom: 12 }}>by {viewBook.author}</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <span className="book-card-tag">{viewBook.genre}</span>
            <span className="book-card-tag">{viewBook.language}</span>
            <StatusBadge status={viewBook.status} />
          </div>
          {viewBook.description && <p style={{ color: 'var(--charcoal)', fontSize: '0.9rem' }}>{viewBook.description}</p>}
          {isReader && viewBook.status === 'AVAILABLE' && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => { setViewBook(null); setRequestBook(viewBook); }}>
              Request This Book
            </button>
          )}
        </Modal>
      )}

      {requestBook && (
        <Modal title="Request Book" onClose={() => setRequestBook(null)}>
          <RequestModal book={requestBook} onClose={() => setRequestBook(null)} onRequested={load} />
        </Modal>
      )}

      {issueBook && (
        <Modal title="Issue Book" onClose={() => setIssueBook(null)}>
          <UserSearchPopup book={issueBook} onClose={() => setIssueBook(null)} onIssued={load} />
        </Modal>
      )}

      {deleteBook && (
        <ConfirmModal
          title="Delete Book"
          message={`Delete "${deleteBook.title}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteBook(null)}
          danger
        />
      )}
    </>
  );
}