import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Spinner, Pagination, EmptyState, Modal, StatusBadge } from '../components/common';
import { getImageUrl } from '../services/api';
import api from '../services/api';

const GENRES = ['Fiction','Non-Fiction','Science','History','Biography','Self-Help','Children','Poetry','Philosophy','Religion','Technology','Other'];
const LANGUAGES = ['English','Gujarati','Hindi'];
const AGE_GROUPS = ['GENERIC','TODDLER','CHILDREN','TEENAGER','ADULT'];
const AGE_GROUP_LABELS = { GENERIC:'All Ages', TODDLER:'Toddler', CHILDREN:'Children', TEENAGER:'Teenager', ADULT:'Adult' };
const PAGE_SIZE = 12;

export default function PublicBooksPage() {
  const navigate = useNavigate();

  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [language, setLanguage] = useState([]);
  const [ageGroup, setAgeGroup] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewBook, setViewBook] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search, genre, page, page_size: PAGE_SIZE };
      if (language.length > 0) params.language = language.join(',');
      if (ageGroup) params.age_group = ageGroup;
      const res = await api.get('/public/books', { params });
      setBooks(res.data.items);
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, genre, language, ageGroup, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="pub-root">
      <Helmet>
        <title>Book Catalogue — Ba Book Corner</title>
        <meta name="description" content="Browse all available books at Ba Book Corner libraries. Find fiction, non-fiction, children's books and more." />
      </Helmet>

      {/* ── Public Header ── */}
      <header className="pub-header">
        <div className="pub-header-inner">
          <div className="pub-brand">
            <img src="/logo.png" alt="Ba Book Corner" className="pub-logo" />
            <div>
              <div className="pub-brand-name">Ba Book Corner</div>
              <div className="pub-brand-sub">Ba Foundation Library Network</div>
            </div>
          </div>
          <nav className="pub-nav">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/login')}>
              Sign In
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>
              Register
            </button>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="pub-hero">
        <h1 className="pub-hero-title">Explore Our Book Collection</h1>
        <p className="pub-hero-sub">
          Discover books across all Ba Foundation libraries. Register and request a book to get it delivered to your door.
        </p>
        <div className="pub-hero-stats">
          <span>📚 {total} books available</span>
          <span>🏛️ Multiple libraries</span>
          <span>🚚 Free home delivery</span>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="pub-content">
        <div className="pub-filters">
          <input
            className="form-control"
            placeholder="Search title or author…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ flex: 1, minWidth: 180 }}
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
                    setLanguage((prev) => e.target.checked ? [...prev, l] : prev.filter((x) => x !== l));
                  }}
                />
                {l}
              </label>
            ))}
          </div>
        </div>

        {/* ── Book Grid ── */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner /></div>
        ) : books.length === 0 ? (
          <EmptyState icon="◫" title="No books found" message="Try adjusting your search filters." />
        ) : (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 16 }}>
              Showing {books.length} of {total} books
            </p>
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
                        </div>
                      )}
                      <div className="book-card-meta">
                        <span className="book-card-tag">{book.genre}</span>
                        <span className="book-card-tag">{book.language}</span>
                        {book.age_group && book.age_group !== 'GENERIC' && (
                          <span className="book-card-tag book-card-tag-age">👶 {AGE_GROUP_LABELS[book.age_group]}</span>
                        )}
                      </div>
                      <div><StatusBadge status="AVAILABLE" /></div>
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
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate('/login', { state: { from: '/catalogue' } })}
                    >
                      Request Book
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {viewBook && (
        <Modal title="Book Details" onClose={() => setViewBook(null)}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            {viewBook.front_image && <img src={getImageUrl(viewBook.front_image)} alt="front" style={{ width: 90, borderRadius: 6, objectFit: 'cover' }} />}
            {viewBook.back_image && <img src={getImageUrl(viewBook.back_image)} alt="back" style={{ width: 90, borderRadius: 6, objectFit: 'cover' }} />}
          </div>
          <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 4 }}>{viewBook.title}</h3>
          <p style={{ color: 'var(--muted)', marginBottom: 12 }}>by {viewBook.author}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <span className="book-card-tag">{viewBook.genre}</span>
            <span className="book-card-tag">{viewBook.language}</span>
            {viewBook.library_name && <span className="book-card-tag">🏛️ {viewBook.library_name}</span>}
          </div>
          {viewBook.description && (
            <p style={{ color: 'var(--text)', fontSize: '0.9rem', marginBottom: 16 }}>{viewBook.description}</p>
          )}
          <div style={{ background: 'var(--info-bg)', border: '1px solid #BAE0F5', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16 }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--info)', margin: 0 }}>
              📌 <strong>Sign in or register</strong> to request this book for free home delivery.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => navigate('/register')}>
              Register Free
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/login', { state: { from: '/catalogue' } })}>
              Sign In
            </button>
          </div>
        </Modal>
      )}

      {/* ── Public Footer ── */}
      <footer className="pub-footer">
        <div className="pub-footer-inner">
          <span>© {new Date().getFullYear()} Ba Foundation · Ba Book Corner</span>
          <div style={{ display: 'flex', gap: 16 }}>
            <button className="pub-footer-link" onClick={() => navigate('/login')}>Sign In</button>
            <button className="pub-footer-link" onClick={() => navigate('/register')}>Register</button>
          </div>
        </div>
      </footer>
    </div>
  );
}