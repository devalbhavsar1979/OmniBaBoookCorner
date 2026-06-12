import React, { useState } from 'react';
import { libraryApi, bookApi } from '../services/api';
import api from '../services/api';

// Minimal user search + select modal used by owner to pick a reader to issue to.
export default function UserSearchPopup({ onClose, onIssued, book }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [issuing, setIssuing] = useState(false);

  const search = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/users', { params: { search: query } });
      setResults(res.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const doIssue = async (reader) => {
    setIssuing(true);
    try {
      await bookApi.issue(book.id, { reader_id: reader.id, delivery_address: '' });
      onIssued();
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to issue book');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 8 }}>
        <input className="form-control" placeholder="Search users by name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button className="btn btn-primary" onClick={search} disabled={loading}>Search</button>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
      </div>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      <div style={{ maxHeight: 280, overflow: 'auto' }}>
        {loading ? <div>Loading…</div> : results.length === 0 ? <div>No users found</div> : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {results.map((u) => (
              <li key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>{u.email}</div>
                </div>
                <div>
                  <button className="btn btn-primary btn-sm" onClick={() => doIssue(u)} disabled={issuing}>Issue</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
