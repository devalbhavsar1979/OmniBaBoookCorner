import React, { useState, useEffect } from 'react';
import { wishRequestApi, libraryApi, getImageUrl } from '../services/api';
import { Modal, Alert } from './common';

const GENRES = ['Fiction', 'Non-Fiction', 'Comedy', 'Science', 'History', 'Biography', 'Mythological', 'Fantacy', 'Spiritual/Meditation', 'Sports/Music', 'Halth/Diet', 'Drama', 'Self-Help', 'Children', 'Poetry', 'Philosophy', 'Religion', 'Technology', 'Other'];
const AGE_GROUPS = ['GENERIC', 'TODDLER', 'CHILDREN', 'TEENAGER', 'ADULT'];
const AGE_GROUP_LABELS = { GENERIC: 'All Ages', TODDLER: 'Toddler', CHILDREN: 'Children', TEENAGER: 'Teenager', ADULT: 'Adult' };

export default function WishRequestAcceptModal({ wr, onClose, onDone }) {
  const [libraries, setLibraries] = useState([]);
  const [libraryId, setLibraryId] = useState(wr.target_library_id || '');
  const [genre, setGenre] = useState(GENRES[0]);
  const [ageGroup, setAgeGroup] = useState(wr.age_group || 'GENERIC');
  const [description, setDescription] = useState(wr.notes || '');
  const [frontImg, setFrontImg] = useState(null);
  const [backImg, setBackImg] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    libraryApi.list({ page_size: 100 }).then(res => setLibraries(res.data.items)).catch(() => {});
  }, []);

  const isContribute = wr.type === 'WANT_TO_CONTRIBUTE';
  const copiesNote = isContribute && wr.quantity > 1
    ? `This will add ${wr.quantity} identical copies to the catalogue.`
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!libraryId) {
      setError('Please select a library to add this book to.');
      return;
    }
    if (!genre) {
      setError('Please select a genre.');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('library_id', libraryId);
      fd.append('genre', genre);
      fd.append('age_group', ageGroup);
      if (description.trim()) fd.append('description', description.trim());
      if (frontImg) fd.append('front_image', frontImg);
      if (backImg) fd.append('back_image', backImg);

      await wishRequestApi.accept(wr.id, fd);
      onDone();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to accept request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Accept & Add to Library — Request #${wr.id}`} onClose={onClose}>
      <Alert type="error" message={error} />

      <p style={{ color: 'var(--text)', marginBottom: 4 }}>
        <strong>{wr.title}</strong> by {wr.author}
      </p>
      {copiesNote && (
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 12 }}>{copiesNote}</p>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Add to Library</label>
          <select className="form-control" value={libraryId} onChange={(e) => setLibraryId(e.target.value)} required>
            <option value="">— Select a library —</option>
            {libraries.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          {wr.target_library_name && (
            <small style={{ color: 'var(--muted)' }}>Requester suggested: {wr.target_library_name}</small>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Genre</label>
            <select className="form-control" value={genre} onChange={(e) => setGenre(e.target.value)}>
              {GENRES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Target Age Group</label>
            <select className="form-control" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
              {AGE_GROUPS.map(a => <option key={a} value={a}>{AGE_GROUP_LABELS[a]}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Description (optional)</label>
          <textarea className="form-control" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Front Photo {wr.front_image ? '(replace)' : '(optional)'}</label>
            <input className="form-control" type="file" accept=".jpg,.jpeg,.png,.gif" onChange={(e) => setFrontImg(e.target.files[0])} />
            {wr.front_image && !frontImg && <img src={getImageUrl(wr.front_image)} alt="front" style={{ marginTop: 6, height: 60, borderRadius: 4 }} />}
          </div>
          <div className="form-group">
            <label>Back Photo {wr.back_image ? '(replace)' : '(optional)'}</label>
            <input className="form-control" type="file" accept=".jpg,.jpeg,.png,.gif" onChange={(e) => setBackImg(e.target.files[0])} />
            {wr.back_image && !backImg && <img src={getImageUrl(wr.back_image)} alt="back" style={{ marginTop: 6, height: 60, borderRadius: 4 }} />}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-success" disabled={saving}>
            {saving ? 'Adding…' : 'Accept & Add to Library'}
          </button>
        </div>
      </form>
    </Modal>
  );
}