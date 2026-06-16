import React, { useState, useEffect, useCallback } from 'react';
import { libraryApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Spinner, Modal, Pagination, EmptyState, Alert, ConfirmModal } from '../components/common';

const BLANK = {
  name: '', description: '', address: '', city: '', state: '',
  pincode: '', latitude: '', longitude: '', contact_email: '', contact_phone: '',
};

function LibraryForm({ initial = BLANK, onSubmit, loading, error }) {
  const [form, setForm] = useState(initial);
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <Alert type="error" message={error} />
      <div className="form-group">
        <label>Library Name *</label>
        <input className="form-control" name="name" value={form.name} onChange={set} required />
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea className="form-control" name="description" value={form.description} onChange={set} />
      </div>
      <div className="form-group">
        <label>Address *</label>
        <textarea className="form-control" name="address" value={form.address} onChange={set} required rows={2} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>City *</label>
          <input className="form-control" name="city" value={form.city} onChange={set} required />
        </div>
        <div className="form-group">
          <label>State *</label>
          <input className="form-control" name="state" value={form.state} onChange={set} required />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Pincode</label>
          <input className="form-control" name="pincode" value={form.pincode} onChange={set} />
        </div>
        <div className="form-group">
          <label>Contact Phone</label>
          <input className="form-control" name="contact_phone" value={form.contact_phone} onChange={set} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Latitude</label>
          <input className="form-control" type="number" step="any" name="latitude" value={form.latitude} onChange={set} />
        </div>
        <div className="form-group">
          <label>Longitude</label>
          <input className="form-control" type="number" step="any" name="longitude" value={form.longitude} onChange={set} />
        </div>
      </div>
      <div className="form-group">
        <label>Contact Email</label>
        <input className="form-control" type="email" name="contact_email" value={form.contact_email} onChange={set} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save Library'}
        </button>
      </div>
    </form>
  );
}

export default function LibrariesPage() {
  const { user, isRole } = useAuth();
  const isOwner = isRole('OWNER');
  const navigate = useNavigate();

  const [libraries, setLibraries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [editLib, setEditLib] = useState(null);
  const [deleteLib, setDeleteLib] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const PAGE_SIZE = 12;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await libraryApi.list({ search, city, page, page_size: PAGE_SIZE });
      setLibraries(res.data.items);
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, city, page]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (form) => {
    setFormLoading(true);
    setFormError('');
    try {
      const payload = { ...form };
      if (!payload.latitude) delete payload.latitude;
      if (!payload.longitude) delete payload.longitude;
      await libraryApi.create(payload);
      setShowCreate(false);
      load();
    } catch (e) {
      setFormError(e.response?.data?.detail || 'Failed to create library.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (form) => {
    setFormLoading(true);
    setFormError('');
    try {
      const payload = { ...form };
      if (!payload.latitude) delete payload.latitude;
      if (!payload.longitude) delete payload.longitude;
      await libraryApi.update(editLib.id, payload);
      setEditLib(null);
      load();
    } catch (e) {
      setFormError(e.response?.data?.detail || 'Failed to update library.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await libraryApi.delete(deleteLib.id);
      setDeleteLib(null);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to delete.');
    }
  };

  const handleViewBooks = (lib) => {
    navigate(`/books?library_id=${lib.id}&library_name=${encodeURIComponent(lib.name)}`);
  };

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>Libraries</h2>
            <p>{total} {total === 1 ? 'library' : 'libraries'} {isOwner ? 'in your network' : 'in the network'}</p>
          </div>
          {isOwner && (
            <button className="btn btn-primary" onClick={() => { setFormError(''); setShowCreate(true); }}>
              + New Library
            </button>
          )}
        </div>
      </div>

      <div className="page-content">
        <div className="search-bar">
          <input
            className="form-control"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <input
            className="form-control"
            placeholder="Filter by city…"
            value={city}
            onChange={(e) => { setCity(e.target.value); setPage(1); }}
            style={{ maxWidth: 200 }}
          />
        </div>

        {loading ? <Spinner /> : libraries.length === 0 ? (
          <EmptyState icon="⊞" title="No libraries found" message="Try a different search or add the first library." />
        ) : (
          <>
            <div className="card-grid">
              {libraries.map((lib) => {
                const totalBooks = lib.book_count ?? 0;
                return (
                  <div key={lib.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '1.05rem', marginBottom: 4 }}>{lib.name}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 8 }}>
                      {lib.city}, {lib.state}
                    </p>
                    {lib.owner_name && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--charcoal)', marginBottom: 8 }}>
                        👤 Owner: {lib.owner_name}
                      </p>
                    )}
                    {lib.description && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--charcoal)', marginBottom: 10, flex: 1 }}>
                        {lib.description}
                      </p>
                    )}
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 12 }}>
                      <div>📍 {lib.address}</div>
                      {lib.contact_phone && <div>📞 {lib.contact_phone}</div>}
                    </div>

                    {/* ── Book stats ── */}
                    <div style={{
                      display: 'flex',
                      gap: 8,
                      marginBottom: 14,
                      padding: '10px 12px',
                      background: 'var(--parchment)',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--sienna)', lineHeight: 1 }}>
                          {totalBooks}
                        </div>
                        <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginTop: 3 }}>
                          Total Books
                        </div>
                      </div>
                    </div>

                    {/* ── Actions ── */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleViewBooks(lib)}
                        style={{ flex: 1 }}
                      >
                        📚 View Books
                      </button>
                      {isOwner && lib.owner_id === user.id && (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setFormError(''); setEditLib(lib); }}>
                            Edit
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteLib(lib)}>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />
          </>
        )}
      </div>

      {showCreate && (
        <Modal title="New Library" onClose={() => setShowCreate(false)}>
          <LibraryForm onSubmit={handleCreate} loading={formLoading} error={formError} />
        </Modal>
      )}

      {editLib && (
        <Modal title="Edit Library" onClose={() => setEditLib(null)}>
          <LibraryForm initial={editLib} onSubmit={handleUpdate} loading={formLoading} error={formError} />
        </Modal>
      )}

      {deleteLib && (
        <ConfirmModal
          title="Delete Library"
          message={`Are you sure you want to deactivate "${deleteLib.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteLib(null)}
          danger
        />
      )}
    </>
  );
}