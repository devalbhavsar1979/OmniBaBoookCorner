import React, { useState, useEffect, useCallback } from 'react';
import { bookApi, libraryApi, requestApi, getImageUrl, SHARE_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Spinner, Modal, Pagination, EmptyState, Alert, StatusBadge, ConfirmModal } from '../components/common';
import UserSearchPopup from '../components/UserSearchPopup';

const GENRES = ['Fiction', 'Non-Fiction', 'Comedy','Science', 'History', 'Biography', 'Mythological', 'Story/Fantacy', 'Spiritual/Meditation','Sports/Music','Health/Diet', 'Drama','Motivational/Self-Help',  'Poetry', 'Philosophy', 'Religion', 'Technology', 'Other'];
const LANGUAGES = ['English', 'Gujarati', 'Hindi'];
const AGE_GROUPS = ['GENERIC', 'TODDLER', 'CHILDREN', 'TEENAGER', 'ADULT'];
const AGE_GROUP_LABELS = { GENERIC: 'All Ages', TODDLER: 'Toddler', CHILDREN: 'Children', TEENAGER: 'Teenager', ADULT: 'Adult' };
const AGE_GROUP_FILTER = ['TODDLER', 'CHILDREN', 'TEENAGER', 'ADULT']; // GENERIC = no filter, excluded from checkboxes

function getLibraryPrefix(libraryName) {
  if (!libraryName) return 'LIB';
  const words = libraryName.trim().split(/\s+/);
  const bookIdx = words.findIndex((w) => w.toLowerCase() === 'book');
  const nonBookWords = words.filter((w) => w.toLowerCase() !== 'book');
  const initials = nonBookWords.map((w) => w[0].toUpperCase());
  if (initials.length < 3 && bookIdx !== -1) {
    initials.splice(Math.min(bookIdx, initials.length), 0, 'B');
  }
  while (initials.length < 3) initials.push(initials[initials.length - 1] || 'X');
  return initials.slice(0, 3).join('');
}

function formatBookId(bookId, libraryName) {
  return `${getLibraryPrefix(libraryName)}-${bookId}`;
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.85rem', color: 'var(--charcoal)', fontWeight: 500, textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

const BANNER_BORDER = { success: '#10B981', warning: '#F59E0B', error: '#EF4444' };
const BANNER_ICON   = { success: '✅', warning: '⚠️', error: '❌' };

function BookFormModal({ libraryId, libraries, initial, onClose, onSaved }) {
  const isEdit = !!initial;

  // Step machine: pick → isbn → scanning → filled | error | manual
  // Edit mode skips the picker and goes straight to the form.
  const [step, setStep] = useState(isEdit ? 'manual' : 'pick');
  const [isbnInput, setIsbnInput] = useState('');
  const [scanBanner, setScanBanner] = useState(null); // { type: 'success'|'warning'|'error', text }
  const [genreFromScan, setGenreFromScan] = useState(false);

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

  // ── ISBN lookup ──────────────────────────────────────────────────────────
  const handleIsbnLookup = async () => {
    setStep('scanning');
    try {
      const res = await bookApi.lookupIsbn(isbnInput);
      const data = res.data;

      if (!data.title && !data.author) {
        setStep('error');
        return;
      }

      setForm(prev => ({
        ...prev,
        title:     data.title            || prev.title,
        author:    data.author           || prev.author,
        language:  data.language         || prev.language,
        age_group: data.age_group        || prev.age_group,
        genre:     data.genre_suggestion || prev.genre,
      }));
      setGenreFromScan(!!data.genre_suggestion);

      if (data.cover_url) {
        try {
          const imgResp = await fetch(data.cover_url);
          if (imgResp.ok) {
            const blob = await imgResp.blob();
            if (blob.size > 1000) {
              setFrontImg(new File([blob], 'cover.jpg', { type: blob.type || 'image/jpeg' }));
            }
          }
        } catch { /* cover fetch optional */ }
      }

      setScanBanner({ type: 'success', text: 'Fields filled from ISBN lookup — please review before saving.' });
      setStep('filled');
    } catch (err) {
      setStep('error');
    }
  };

  // ── Save book ────────────────────────────────────────────────────────────
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
      if (backImg)  fd.append('back_image',  backImg);

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

  // ── Method picker ────────────────────────────────────────────────────────
  if (step === 'pick') {
    return (
      <div style={{ padding: '4px 0 8px' }}>
        <button
          type="button"
          onClick={() => setStep('isbn')}
          style={{
            width: '100%', padding: '20px 16px', marginBottom: 12,
            background: 'var(--sienna, #8B4513)', color: '#fff',
            border: 'none', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🔢</div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>Enter ISBN Number</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: 4 }}>
            Auto-fill title, author, genre &amp; cover from the ISBN on the book
          </div>
        </button>
        <div style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: 12, fontSize: '0.85rem' }}>or</div>
        <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setStep('manual')}>
          ✏️ Fill in manually
        </button>
      </div>
    );
  }

  // ── ISBN input ───────────────────────────────────────────────────────────
  if (step === 'isbn') {
    const cleanLen = isbnInput.replace(/[^0-9X]/gi, '').length;
    return (
      <div style={{ padding: '8px 0' }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
            ISBN Number
          </label>
          <input
            className="form-control"
            type="text"
            placeholder="e.g. 9780385472579 or 0385472579"
            value={isbnInput}
            onChange={(e) => setIsbnInput(e.target.value.replace(/[^0-9X\-\s]/gi, ''))}
            maxLength={17}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && cleanLen >= 10) handleIsbnLookup(); }}
          />
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
            Find the ISBN barcode on the back cover or copyright page (10 or 13 digits).
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleIsbnLookup}
            disabled={cleanLen < 10}
          >
            Look up book →
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setStep('pick')}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // ── Scanning spinner ─────────────────────────────────────────────────────
  if (step === 'scanning') {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>📖</div>
        <Spinner />
        <div style={{ marginTop: 14, fontWeight: 600 }}>Looking up ISBN…</div>
        <div style={{ color: 'var(--muted)', fontSize: '0.83rem', marginTop: 4 }}>
          Fetching book details from Open Library
        </div>
      </div>
    );
  }

  // ── Error screen ─────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>😕</div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Book not found</div>
        <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>
          No book found for that ISBN in Open Library. Check the number and try again.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={() => setStep('isbn')}>
            Try a different ISBN
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setStep('manual')}>
            Fill in manually
          </button>
        </div>
      </div>
    );
  }

  // ── Book form (step === 'filled' or 'manual') ────────────────────────────
  return (
    <form onSubmit={handleSubmit}>

      {/* Scan result banner */}
      {scanBanner && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '10px 14px', marginBottom: 16,
          background: 'var(--surface)', borderRadius: 6,
          border: '1px solid var(--border)',
          borderLeft: `3px solid ${BANNER_BORDER[scanBanner.type]}`,
          fontSize: '0.85rem',
        }}>
          <span>{BANNER_ICON[scanBanner.type]}</span>
          <span style={{ flex: 1 }}>{scanBanner.text}</span>
          <button
            type="button"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, fontSize: '1rem' }}
            onClick={() => setScanBanner(null)}
          >✕</button>
        </div>
      )}

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
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Genre *
            {genreFromScan && (
              <span style={{
                fontSize: '0.68rem', background: '#FEF3C7', color: '#92400E',
                padding: '1px 7px', borderRadius: 99, fontWeight: 700,
              }}>⚠️ Suggested</span>
            )}
          </label>
          <select
            className="form-control"
            name="genre"
            value={form.genre}
            onChange={(e) => { setGenreFromScan(false); set(e); }}
            style={genreFromScan ? { borderColor: '#F59E0B' } : {}}
          >
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
          {frontImg && (
            <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src={URL.createObjectURL(frontImg)} alt="front cover" style={{ height: 60, borderRadius: 4 }} />
              {step === 'filled' && (
                <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>✓ From ISBN</span>
              )}
            </div>
          )}
          <input
            className="form-control"
            type="file"
            accept=".jpg,.jpeg,.png"
            onChange={(e) => setFrontImg(e.target.files[0])}
          />
          {initial?.front_image && !frontImg && (
            <img src={getImageUrl(initial.front_image)} alt="front" style={{ marginTop: 6, height: 60, borderRadius: 4 }} />
          )}
        </div>
        <div className="form-group">
          <label>Back Image</label>
          <input className="form-control" type="file" accept=".jpg,.jpeg,.png,.gif" onChange={(e) => setBackImg(e.target.files[0])} />
          {initial?.back_image && (
            <img src={getImageUrl(initial.back_image)} alt="back" style={{ marginTop: 6, height: 60, borderRadius: 4 }} />
          )}
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

function ShareBookModal({ book }) {
  const [thoughts, setThoughts] = useState('');
  const frontUrl = getImageUrl(book.front_image);
  const backUrl = getImageUrl(book.back_image);

  const buildShareLink = () => {
    let link = `${SHARE_BASE_URL}/api/v1/public/books/${book.id}/share`;
    if (thoughts.trim()) link += `?thoughts=${encodeURIComponent(thoughts.trim())}`;
    return link;
  };

  // Builds the full human-readable message: title, author, description, thoughts, link.
  // wa.me pre-fills this verbatim in WhatsApp's compose box — recipient sees everything.
  const buildShareText = () => {
    let text = `📚 *${book.title}*\nby ${book.author}`;
    if (book.description?.trim()) text += `\n\n${book.description.trim()}`;
    if (thoughts.trim()) text += `\n\n"${thoughts.trim()}"`;
    text += `\n\n${buildShareLink()}`;
    return text;
  };

  // Always use wa.me so the full text (title, author, description, thoughts, link)
  // appears in WhatsApp's compose box. navigator.share with files was dropped because
  // WhatsApp on Android strips the text and only forwards the URL as caption.
  const handleWhatsApp = () => {
    const text = buildShareText();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(buildShareLink())}&quote=${encodeURIComponent(buildShareText())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        {frontUrl
          ? <img src={frontUrl} alt="front cover" style={{ width: 100, height: 140, borderRadius: 6, objectFit: 'cover' }} />
          : <div style={{ width: 100, height: 140, borderRadius: 6, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>No front image</div>}
        {backUrl
          ? <img src={backUrl} alt="back cover" style={{ width: 100, height: 140, borderRadius: 6, objectFit: 'cover' }} />
          : <div style={{ width: 100, height: 140, borderRadius: 6, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>No back image</div>}
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 4 }}>{book.title}</h3>
      <p style={{ color: 'var(--muted)', marginBottom: 12 }}>by {book.author}</p>
      <div className="form-group">
        <label>Share your thoughts (optional)</label>
        <textarea
          className="form-control"
          rows={3}
          placeholder="What do you love about this book?"
          value={thoughts}
          onChange={(e) => setThoughts(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-sm" style={{ background: '#25D366', color: '#fff', border: 'none' }} onClick={handleWhatsApp}>
          Share on WhatsApp
        </button>
        <button type="button" className="btn btn-sm" style={{ background: '#1877F2', color: '#fff', border: 'none' }} onClick={handleFacebook}>
          Share on Facebook
        </button>
      </div>
    </div>
  );
}

function RequestModal({ book, onClose, onRequested }) {
  const { user } = useAuth();
  const savedAddress = [user?.address_line, user?.city, user?.state, user?.pincode].filter(Boolean).join(', ');
  const [address, setAddress] = useState(savedAddress);
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
  const [ageGroup, setAgeGroup] = useState([]);
  const [activeLibraryId, setActiveLibraryId] = useState(urlLibraryId);
  const [activeLibraryName, setActiveLibraryName] = useState(urlLibraryName);
  const [loading, setLoading] = useState(true);

  const [showFilters, setShowFilters] = useState(false);

  const [myLibraries, setMyLibraries] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [deleteBook, setDeleteBook] = useState(null);
  const [requestBook, setRequestBook] = useState(null);
  const [issueBook, setIssueBook] = useState(null);
  const [viewBook, setViewBook] = useState(null);
  const [shareBook, setShareBook] = useState(null);

  const PAGE_SIZE = 12;

  const [activeRequestCount, setActiveRequestCount] = useState(0);

  const fetchActiveCount = useCallback(async () => {
    if (!isReader) return;
    try {
      const res = await requestApi.activeCount();
      setActiveRequestCount(res.data.count);
    } catch { /* non-fatal */ }
  }, [isReader]);

  useEffect(() => { fetchActiveCount(); }, [fetchActiveCount]);

  const atLimit = isReader && activeRequestCount >= 3;

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
      if (ageGroup.length > 0) params.age_group = ageGroup.join(',');
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isReader && (
              <span style={{
                padding: '5px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700,
                background: atLimit ? '#FEE2E2' : activeRequestCount === 2 ? '#FEF3C7' : '#D1FAE5',
                color: atLimit ? '#991B1B' : activeRequestCount === 2 ? '#92400E' : '#065F46',
                border: `1px solid ${atLimit ? '#FCA5A5' : activeRequestCount === 2 ? '#FCD34D' : '#6EE7B7'}`,
              }}>
                📚 {activeRequestCount} / 3 active
              </span>
            )}
            {canManage && myLibraries.length > 0 && (
              <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                + Add Book
              </button>
            )}
          </div>
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
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="form-control"
              placeholder="Search title or author…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={() => setShowFilters((f) => !f)}
              title="Toggle filters"
              style={{
                flexShrink: 0,
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1.5px solid ${showFilters || genre || ageGroup.length > 0 || language.length > 0 ? 'var(--sienna)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                background: showFilters ? 'var(--sienna)' : 'var(--surface)',
                color: showFilters ? '#fff' : (genre || ageGroup.length > 0 || language.length > 0 ? 'var(--sienna)' : 'var(--muted)'),
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {!showFilters && (genre || ageGroup.length > 0 || language.length > 0) && (
                <span style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--sienna)',
                  border: '1.5px solid var(--surface)',
                }} />
              )}
            </button>
          </div>

          {showFilters && (
            <div style={{
              marginTop: 10,
              padding: '12px 14px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'center',
            }}>
              <select className="form-control" value={genre} onChange={(e) => { setGenre(e.target.value); setPage(1); }} style={{ maxWidth: 160 }}>
                <option value="">All Genres</option>
                {GENRES.map((g) => <option key={g}>{g}</option>)}
              </select>
              <div className="language-checkboxes" style={{ margin: 0 }}>
                <span className="language-checkboxes-label">Age:</span>
                {AGE_GROUP_FILTER.map((a) => (
                  <label key={a} className="language-checkbox-item">
                    <input
                      type="checkbox"
                      checked={ageGroup.includes(a)}
                      onChange={(e) => {
                        setPage(1);
                        setAgeGroup((prev) =>
                          e.target.checked ? [...prev, a] : prev.filter((x) => x !== a)
                        );
                      }}
                    />
                    {AGE_GROUP_LABELS[a]}
                  </label>
                ))}
              </div>
              <div className="language-checkboxes" style={{ margin: 0 }}>
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
              {(genre || ageGroup.length > 0 || language.length > 0) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setGenre(''); setAgeGroup([]); setLanguage([]); setPage(1); }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
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
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.02em' }}>
                        ID: {formatBookId(book.id, book.library_name)}
                      </div>
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
                    <button className="btn btn-secondary btn-sm" onClick={() => setShareBook(book)}>
                      Share
                    </button>
                    {isReader && book.status === 'AVAILABLE' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setRequestBook(book)}
                        disabled={atLimit}
                        title={atLimit ? 'Limit reached — return a book first' : undefined}
                      >
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
            {!viewBook.front_image && !viewBook.back_image && (
              <div style={{ width: 90, height: 126, borderRadius: 6, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                No image
              </div>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, marginBottom: 2 }}>
            Book ID: {formatBookId(viewBook.id, viewBook.library_name)}
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 4 }}>{viewBook.title}</h3>
          <p style={{ color: 'var(--muted)', marginBottom: 12 }}>by {viewBook.author}</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span className="book-card-tag">{viewBook.genre}</span>
            <span className="book-card-tag">{viewBook.language}</span>
            {viewBook.age_group && (
              <span className="book-card-tag book-card-tag-age">
                👶 {AGE_GROUP_LABELS[viewBook.age_group] || viewBook.age_group}
              </span>
            )}
            <StatusBadge status={viewBook.status} />
          </div>

          {viewBook.description && (
            <p style={{ color: 'var(--charcoal)', fontSize: '0.9rem', marginBottom: 14 }}>{viewBook.description}</p>
          )}

          <div style={{ borderTop: '1px solid var(--border, #E5E7EB)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {viewBook.library_name && (
              <DetailRow label="Library" value={viewBook.library_name} />
            )}
            {viewBook.library_owner_name && (
              <DetailRow label="Library Owner" value={viewBook.library_owner_name} />
            )}
            {!isReader && viewBook.status === 'ISSUED' && viewBook.issued_to_reader_name && (
              <DetailRow label="Issued To" value={viewBook.issued_to_reader_name} />
            )}
            {viewBook.created_at && (
              <DetailRow label="Added On" value={new Date(viewBook.created_at).toLocaleString()} />
            )}
            {viewBook.updated_at && (
              <DetailRow label="Last Updated" value={new Date(viewBook.updated_at).toLocaleString()} />
            )}
          </div>

          {isReader && viewBook.status === 'AVAILABLE' && (
            <button
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => { setViewBook(null); setRequestBook(viewBook); }}
              disabled={atLimit}
              title={atLimit ? 'Limit reached — return a book first' : undefined}
            >
              {atLimit ? 'Request limit reached' : 'Request This Book'}
            </button>
          )}
        </Modal>
      )}

      {shareBook && (
        <Modal title="Share This Book" onClose={() => setShareBook(null)}>
          <ShareBookModal book={shareBook} />
        </Modal>
      )}

      {requestBook && (
        <Modal title="Request Book" onClose={() => setRequestBook(null)}>
          <RequestModal
            book={requestBook}
            onClose={() => setRequestBook(null)}
            onRequested={() => { load(); fetchActiveCount(); }}
          />
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