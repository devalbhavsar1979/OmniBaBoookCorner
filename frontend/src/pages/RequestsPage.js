import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { requestApi, libraryApi, getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Spinner, Pagination, EmptyState, StatusBadge, ConfirmModal, Alert } from '../components/common';

// ── Map helpers ───────────────────────────────────────────────────────────────
async function geocodeAddress(address) {
  if (!address) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'BaBookCorner/1.0' } }
    );
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

const libIcon = L.divIcon({
  html: '<div style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4))">🏛️</div>',
  className: '', iconSize: [26, 26], iconAnchor: [13, 13],
});
const readerIcon = L.divIcon({
  html: '<div style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4))">📍</div>',
  className: '', iconSize: [26, 26], iconAnchor: [13, 26],
});

function BoundsFitter({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds?.length === 2) map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, bounds]);
  return null;
}

function RouteMap({ libCoords, readerCoords }) {
  const [routePoints, setRoutePoints] = useState([]);

  useEffect(() => {
    if (!libCoords || !readerCoords) return;
    const url = `https://router.project-osrm.org/route/v1/driving/${libCoords.lng},${libCoords.lat};${readerCoords.lng},${readerCoords.lat}?overview=full&geometries=geojson`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        const coords = data.routes?.[0]?.geometry?.coordinates;
        if (coords) setRoutePoints(coords.map(([lng, lat]) => [lat, lng]));
      })
      .catch(() => {});
  }, [libCoords, readerCoords]);

  const center = [(libCoords.lat + readerCoords.lat) / 2, (libCoords.lng + readerCoords.lng) / 2];
  const bounds = [[libCoords.lat, libCoords.lng], [readerCoords.lat, readerCoords.lng]];

  return (
    <MapContainer center={center} zoom={12} style={{ height: 200, width: '100%' }} zoomControl scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <BoundsFitter bounds={bounds} />
      <Marker position={[libCoords.lat, libCoords.lng]} icon={libIcon} />
      <Marker position={[readerCoords.lat, readerCoords.lng]} icon={readerIcon} />
      {routePoints.length > 0 && (
        <Polyline positions={routePoints} pathOptions={{ color: '#2563EB', weight: 4, opacity: 0.85 }} />
      )}
    </MapContainer>
  );
}

const STATUS_OPTIONS = [
  'REQUESTED', 'REQUEST_ACCEPTED', 'VOLUNTEER_PICKED',
  'VOLUNTEER_DELIVERED', 'ISSUED', 'RETURN_REQUESTED',
  'RETURN_PICKED', 'RETURN_DELIVERED',
];

const STATUS_SHORT = {
  REQUESTED: 'Requested',
  REQUEST_ACCEPTED: 'Accepted',
  VOLUNTEER_PICKED: 'Picked Up',
  VOLUNTEER_DELIVERED: 'Delivered',
  ISSUED: 'Issued',
  RETURN_REQUESTED: 'Return Req.',
  RETURN_PICKED: 'Return Picked',
  RETURN_DELIVERED: 'Return Delivered',
};

function getNextActionLabel(status, role) {
  if (role === 'VOLUNTEER') {
    const map = {
      REQUESTED: 'Accept Request',
      REQUEST_ACCEPTED: 'Mark Picked Up',
      VOLUNTEER_PICKED: 'Mark Delivered',
      RETURN_REQUESTED: 'Accept Return (Pick Up)',
      RETURN_PICKED: 'Deliver Return',
    };
    return map[status] || null;
  }
  if (role === 'OWNER' || role === 'SUPER_ADMIN') {
    const map = {
      REQUESTED: 'Issue Directly',
      VOLUNTEER_DELIVERED: 'Issue to Reader',
      RETURN_REQUESTED: 'Accept Return (Mark Available)',
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

// ── Book Detail Modal ─────────────────────────────────────────────────────────
function BookDetailModal({ req, onClose }) {
  const [library, setLibrary] = useState(null);
  const [libLoading, setLibLoading] = useState(true);
  const [coords, setCoords] = useState(null);   // { lib: {lat,lng}, reader: {lat,lng} }
  const [geoLoading, setGeoLoading] = useState(false);

  const joinAddr = (...parts) => parts.filter(Boolean).join(', ') || null;

  // 1. Fetch library details
  useEffect(() => {
    if (req.book?.library_id) {
      libraryApi.get(req.book.library_id)
        .then(res => setLibrary(res.data))
        .catch(() => {})
        .finally(() => setLibLoading(false));
    } else {
      setLibLoading(false);
    }
  }, [req.book?.library_id]);

  // 2. Geocode both endpoints once library data is ready
  useEffect(() => {
    if (libLoading) return;
    setGeoLoading(true);
    const readerAddr = req.delivery_address
      || joinAddr(req.reader?.address_line, req.reader?.city, req.reader?.state, req.reader?.pincode);

    const resolveLibCoords = () => {
      if (library?.latitude && library?.longitude)
        return Promise.resolve({ lat: library.latitude, lng: library.longitude });
      const libAddr = joinAddr(library?.address, library?.city, library?.state, library?.pincode);
      return geocodeAddress(libAddr);
    };

    Promise.all([resolveLibCoords(), geocodeAddress(readerAddr)])
      .then(([lib, reader]) => { if (lib && reader) setCoords({ lib, reader }); })
      .catch(() => {})
      .finally(() => setGeoLoading(false));
  }, [libLoading, library, req.delivery_address, req.reader]); // eslint-disable-line

  const InfoRow = ({ icon, value, bold, color }) => !value ? null : (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5 }}>
      <span style={{ fontSize: '0.82rem', flexShrink: 0, lineHeight: 1.55, opacity: 0.75 }}>{icon}</span>
      <span style={{
        fontSize: bold ? '0.88rem' : '0.78rem',
        color: color || (bold ? 'var(--ink)' : 'var(--charcoal)'),
        fontWeight: bold ? 700 : 400,
        wordBreak: 'break-word', lineHeight: 1.5,
      }}>{value}</span>
    </div>
  );

  const imgUrl = getImageUrl(req.book?.front_image);

  // OSM directions link (always available as fallback)
  const readerAddr = req.delivery_address
    || joinAddr(req.reader?.address_line, req.reader?.city, req.reader?.state, req.reader?.pincode);
  const libAddr = joinAddr(library?.address, library?.city, library?.state, library?.pincode);
  const osmUrl = coords
    ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${coords.lib.lat}%2C${coords.lib.lng}%3B${coords.reader.lat}%2C${coords.reader.lng}`
    : (libAddr && readerAddr
        ? `https://www.openstreetmap.org/directions?from=${encodeURIComponent(libAddr)}&to=${encodeURIComponent(readerAddr)}`
        : null);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{
        maxWidth: 560, padding: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh',
      }}>

        {/* ── Header — pinned, never scrolls ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--parchment)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1rem' }}>📋</span>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>Request #{req.id}</span>
            <StatusBadge status={req.status} />
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

        {/* ── Book strip: image left, info right ── */}
        <div style={{
          display: 'flex', gap: 14, alignItems: 'stretch',
          padding: '14px 16px',
          background: 'linear-gradient(135deg, #fdf6ec 0%, #f7ede0 100%)',
          borderBottom: '2px solid var(--border)',
        }}>
          {/* Cover */}
          <div style={{
            width: 72, minWidth: 72, height: 100,
            borderRadius: 7, overflow: 'hidden',
            background: '#e8ddd0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 3px 10px rgba(0,0,0,0.15), 3px 0 0 rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.08)',
          }}>
            {imgUrl
              ? <img src={imgUrl} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '2rem', opacity: 0.25 }}>📖</span>
            }
          </div>

          {/* Book meta */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--ink)', lineHeight: 1.25, marginBottom: 3 }}>
              {req.book?.title || `Book #${req.book_id}`}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--sienna)', fontStyle: 'italic', marginBottom: 8 }}>
              {req.book?.author}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted)',
                background: 'rgba(0,0,0,0.07)', borderRadius: 4, padding: '2px 7px',
              }}>
                #{req.book?.id || req.book_id}
              </span>
              {req.book?.genre && (
                <span style={{ fontSize: '0.68rem', color: 'var(--muted)', background: 'rgba(0,0,0,0.07)', borderRadius: 4, padding: '2px 7px' }}>
                  {req.book.genre}
                </span>
              )}
              {req.book?.language && (
                <span style={{ fontSize: '0.68rem', color: 'var(--muted)', background: 'rgba(0,0,0,0.07)', borderRadius: 4, padding: '2px 7px' }}>
                  {req.book.language}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Route Map ── */}
        <div style={{ borderBottom: '1px solid var(--border)', position: 'relative', background: '#f0f4f8' }}>
          {geoLoading || libLoading ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Loading map…</span>
            </div>
          ) : coords ? (
            <RouteMap libCoords={coords.lib} readerCoords={coords.reader} />
          ) : (
            <div style={{ height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span style={{ fontSize: '1.2rem' }}>🗺️</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Could not resolve addresses for map</span>
            </div>
          )}
          {/* Open in OSM button — always visible */}
          {osmUrl && (
            <a
              href={osmUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                position: 'absolute', bottom: 8, right: 8, zIndex: 1000,
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: '0.72rem', fontWeight: 600,
                background: 'white', color: '#3d7b44',
                border: '1px solid #c8dfc9',
                borderRadius: 4, padding: '4px 10px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                textDecoration: 'none',
              }}
            >
              🗺️ Open in OpenStreetMap
            </a>
          )}
        </div>

        {/* ── Two-column: Library | Reader ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>

          {/* Library column */}
          <div style={{
            borderRight: '1px solid var(--border)',
            borderTop: '3px solid var(--sienna)',
            padding: '14px 14px 16px',
            background: 'rgba(196,112,74,0.03)',
          }}>
            {libLoading ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', padding: '4px 0' }}>Loading…</div>
            ) : (
              <>
                <InfoRow icon="🏛️" value={library?.name || req.book?.library_name} bold />
                <InfoRow icon="👤" value={library?.owner_name || req.book?.library_owner_name} color="var(--charcoal)" />
                <InfoRow icon="📞" value={library?.contact_phone} />
                <InfoRow icon="✉️" value={library?.contact_email} />
                <InfoRow icon="📍" value={joinAddr(library?.address, library?.city, library?.state, library?.pincode)} />
              </>
            )}
          </div>

          {/* Reader column */}
          <div style={{
            borderTop: '3px solid var(--forest)',
            padding: '14px 14px 16px',
            background: 'rgba(74,107,74,0.03)',
          }}>
            <InfoRow icon="👤" value={req.reader?.full_name} bold />
            <InfoRow icon="📞" value={req.reader?.phone} />
            <InfoRow icon="✉️" value={req.reader?.email} />
            <InfoRow icon="📍" value={req.delivery_address || joinAddr(req.reader?.address_line, req.reader?.city, req.reader?.state, req.reader?.pincode)} />
            {req.delivery_notes && <InfoRow icon="📝" value={req.delivery_notes} />}
          </div>
        </div>
        </div>{/* end scrollable body */}
      </div>
    </div>
  );
}

// ── Request Row ───────────────────────────────────────────────────────────────
function RequestRow({ req, user, onAdvance, onCancel, onDirectReturn, onViewHistory, onViewDetail }) {
  const actionLabel = getNextActionLabel(req.status, user.role);
  const canCancel = req.status === 'REQUESTED' &&
    ['READER', 'OWNER', 'SUPER_ADMIN'].includes(user.role);
  const canDirectReturn = req.status === 'ISSUED' &&
    ['OWNER', 'SUPER_ADMIN'].includes(user.role);

  const clickStyle = { cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline dotted' };

  return (
    <tr>
      <td>
        <strong style={clickStyle} onClick={() => onViewDetail(req)} title="View details">#{req.id}</strong>
      </td>
      <td>
        <div style={{ fontWeight: 500, ...clickStyle }} onClick={() => onViewDetail(req)} title="View details">
          {req.book?.title || `Book #${req.book_id}`}
        </div>
        {req.book && (
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', ...clickStyle }} onClick={() => onViewDetail(req)}>
            {req.book.author}
          </div>
        )}
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
          {canDirectReturn && (
            <button
              className="btn btn-sm"
              style={{ background: '#7C3AED', color: '#fff', border: 'none' }}
              onClick={() => onDirectReturn(req)}
              title="Mark book as returned directly — skips the normal return flow"
            >
              Direct Return
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
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [advanceTarget, setAdvanceTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [directReturnTarget, setDirectReturnTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [actionError, setActionError] = useState('');

  const PAGE_SIZE = 15;

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const toggleStatus = (s) => {
    setSelectedStatuses(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
    setPage(1);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (selectedStatuses.length > 0) params.status = selectedStatuses.join(',');
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await requestApi.list(params);
      setRequests(res.data.items);
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatuses, debouncedSearch]);

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

  const handleDirectReturn = async () => {
    try {
      await requestApi.directReturn(directReturnTarget.id);
      setDirectReturnTarget(null);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to process direct return.');
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
        {/* Search + filter bar */}
        <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            className="form-control"
            placeholder="🔍 Search book title, reader or volunteer name…"
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); setPage(1); }}
          />

          {/* Status pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', flexShrink: 0 }}>Status:</span>
            <button
              onClick={() => { setSelectedStatuses([]); setPage(1); }}
              style={{
                padding: '3px 12px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600,
                border: `1.5px solid ${selectedStatuses.length === 0 ? 'var(--navy)' : 'var(--border)'}`,
                background: selectedStatuses.length === 0 ? 'var(--navy)' : 'transparent',
                color: selectedStatuses.length === 0 ? '#fff' : 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              All
            </button>
            {STATUS_OPTIONS.map(s => {
              const active = selectedStatuses.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  style={{
                    padding: '3px 12px', borderRadius: 99, fontSize: '0.75rem', fontWeight: active ? 700 : 400,
                    border: `1.5px solid ${active ? 'var(--navy)' : 'var(--border)'}`,
                    background: active ? 'var(--navy)' : 'transparent',
                    color: active ? '#fff' : 'var(--text-2)',
                    cursor: 'pointer',
                    transition: 'background 0.12s, border-color 0.12s',
                  }}
                >
                  {STATUS_SHORT[s] || s}
                </button>
              );
            })}
            {(selectedStatuses.length > 0 || debouncedSearch) && (
              <button
                onClick={() => { setSelectedStatuses([]); setSearchInput(''); setPage(1); }}
                style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.73rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}
              >
                Clear ✕
              </button>
            )}
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', marginLeft: 4 }}>
              {total} {total === 1 ? 'request' : 'requests'}
            </span>
          </div>
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
                      onDirectReturn={setDirectReturnTarget}
                      onViewHistory={setHistoryTarget}
                      onViewDetail={setDetailTarget}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* ── Book detail modal ── */}
      {detailTarget && (
        <BookDetailModal req={detailTarget} onClose={() => setDetailTarget(null)} />
      )}

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

      {/* ── Direct Return confirm modal ── */}
      {directReturnTarget && (
        <ConfirmModal
          title="Direct Return"
          message={`Mark "${directReturnTarget.book?.title}" as returned directly? The book will immediately become available and the request will be closed.`}
          onConfirm={handleDirectReturn}
          onCancel={() => setDirectReturnTarget(null)}
        />
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