import React, { useEffect, useState } from 'react';
import { gamificationApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/common';

const REASON_LABELS = {
  JOIN_BONUS: 'Joined Ba Book Corner',
  BOOK_ISSUED: 'Borrowed a book',
};

function reasonLabel(reason, description) {
  return REASON_LABELS[reason] || description || reason;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ProgressBar({ pct, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.15)',
      borderRadius: 999,
      height: 10,
      overflow: 'hidden',
      width: '100%',
    }}>
      <div style={{
        width: `${Math.min(pct, 100)}%`,
        height: '100%',
        background: color,
        borderRadius: 999,
        transition: 'width 0.6s ease',
      }} />
    </div>
  );
}

function BadgeCard({ lvl, unlocked, isCurrent }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: '14px 10px',
      borderRadius: 14,
      border: isCurrent
        ? `2px solid ${lvl.color}`
        : '2px solid transparent',
      background: unlocked
        ? `linear-gradient(135deg, ${lvl.color}22, ${lvl.color}11)`
        : 'rgba(255,255,255,0.04)',
      opacity: unlocked ? 1 : 0.4,
      minWidth: 80,
      flex: 1,
      position: 'relative',
    }}>
      {isCurrent && (
        <div style={{
          position: 'absolute',
          top: -10,
          background: lvl.color,
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 99,
          letterSpacing: '0.05em',
        }}>YOU</div>
      )}
      <div style={{ fontSize: 28 }}>{unlocked ? lvl.emoji : '🔒'}</div>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: unlocked ? lvl.color : 'var(--color-text-muted, #9CA3AF)',
        textAlign: 'center',
        lineHeight: 1.3,
      }}>{lvl.name}</div>
      <div style={{
        fontSize: 10,
        color: 'var(--color-text-muted, #9CA3AF)',
        textAlign: 'center',
      }}>{lvl.min_points} BC</div>
    </div>
  );
}

export default function MyScorePage() {
  const { user } = useAuth();
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    gamificationApi.myScore()
      .then(res => setScore(res.data))
      .catch(() => setError('Could not load your score. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <Spinner />
    </div>
  );

  if (error) return (
    <div style={{ padding: 32, color: '#EF4444', textAlign: 'center' }}>{error}</div>
  );

  const { total_points, level_info, all_levels, recent_transactions } = score;
  const isMaxLevel = level_info.level === 5;

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '24px 16px 40px' }}>

      {/* Header card */}
      <div style={{
        background: `linear-gradient(135deg, ${level_info.color}33, ${level_info.color}11)`,
        border: `1.5px solid ${level_info.color}55`,
        borderRadius: 20,
        padding: '28px 24px 24px',
        marginBottom: 20,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 56, lineHeight: 1 }}>{level_info.emoji}</div>
        <div style={{
          fontSize: 22,
          fontWeight: 800,
          color: level_info.color,
          marginTop: 10,
        }}>{level_info.name}</div>
        <div style={{
          fontSize: 13,
          color: 'var(--color-text-muted, #9CA3AF)',
          marginTop: 4,
          marginBottom: 16,
        }}>Level {level_info.level} · {user?.full_name}</div>

        {/* BC total */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 99,
          padding: '8px 20px',
          marginBottom: 20,
        }}>
          <span style={{ fontSize: 20 }}>🪙</span>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#FBBF24' }}>{total_points}</span>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted, #9CA3AF)', fontWeight: 600 }}>Book Coins</span>
        </div>

        {/* Progress bar */}
        {!isMaxLevel ? (
          <>
            <ProgressBar pct={level_info.progress_pct} color={level_info.color} />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 6,
              fontSize: 11,
              color: 'var(--color-text-muted, #9CA3AF)',
            }}>
              <span>{level_info.points_in_level} / {level_info.points_for_level} BC in level</span>
              <span>→ {level_info.next_level_name} at {level_info.next_level_at} BC</span>
            </div>
          </>
        ) : (
          <div style={{
            marginTop: 8,
            fontSize: 13,
            color: level_info.color,
            fontWeight: 600,
          }}>🎉 You've reached the highest level!</div>
        )}
      </div>

      {/* All badges */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--color-text-muted, #9CA3AF)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 12,
        }}>Badges</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {all_levels.map(lvl => (
            <BadgeCard
              key={lvl.level}
              lvl={lvl}
              unlocked={total_points >= lvl.min_points}
              isCurrent={level_info.level === lvl.level}
            />
          ))}
        </div>
      </div>

      {/* How to earn */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '16px 18px',
        marginBottom: 20,
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--color-text-muted, #9CA3AF)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 12,
        }}>How to Earn Book Coins</div>
        {[
          { icon: '🎉', label: 'Join Ba Book Corner', bc: '+50 BC' },
          { icon: '📚', label: 'Borrow a book', bc: '+20 BC' },
        ].map(row => (
          <div key={row.label} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 0',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ fontSize: 18 }}>{row.icon}</span>
            <span style={{ flex: 1, fontSize: 13 }}>{row.label}</span>
            <span style={{ fontWeight: 700, color: '#FBBF24', fontSize: 13 }}>{row.bc}</span>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--color-text-muted, #9CA3AF)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 12,
        }}>Recent Activity</div>

        {recent_transactions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: 'var(--color-text-muted, #9CA3AF)',
            fontSize: 13,
            padding: '24px 0',
          }}>No activity yet. Start borrowing books to earn coins!</div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            overflow: 'hidden',
          }}>
            {recent_transactions.map((tx, i) => (
              <div key={tx.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderBottom: i < recent_transactions.length - 1
                  ? '1px solid rgba(255,255,255,0.06)'
                  : 'none',
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(251,191,36,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  flexShrink: 0,
                }}>🪙</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                    {reasonLabel(tx.reason, tx.description)}
                  </div>
                  {tx.description && tx.reason !== tx.description && (
                    <div style={{
                      fontSize: 11,
                      color: 'var(--color-text-muted, #9CA3AF)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>{tx.description}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, color: '#FBBF24', fontSize: 15 }}>+{tx.points}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted, #9CA3AF)', marginTop: 2 }}>
                    {formatDate(tx.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
