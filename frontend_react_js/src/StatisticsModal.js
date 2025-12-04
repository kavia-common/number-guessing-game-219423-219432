import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readResults } from './leaderboard';
import { computeStatisticsFromLeaderboard, formatDuration, readStats } from './statistics';

// PUBLIC_INTERFACE
export default function StatisticsModal({ open, onClose }) {
  /** Accessible Statistics modal dialog displaying aggregate gameplay metrics. */
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalGames: 0,
    highestScore: 0,
    fastestWinSeconds: null,
    averageAttempts: 0,
  });
  const closeBtnRef = useRef(null);
  const lastFocusedRef = useRef(null);

  const refresh = () => {
    const entries = readResults();
    const stored = readStats();
    const computed = computeStatisticsFromLeaderboard(entries, stored?.totalGames ?? null);
    // Prefer stored totalGames if present and >= computed baseline
    const totalGames =
      stored && typeof stored.totalGames === 'number'
        ? Math.max(stored.totalGames, computed.totalGames)
        : computed.totalGames;
    setStats({ ...computed, totalGames });
  };

  useEffect(() => {
    if (open) {
      lastFocusedRef.current = document.activeElement;
      refresh();
      setTimeout(() => closeBtnRef.current?.focus(), 0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (lastFocusedRef.current && typeof lastFocusedRef.current.focus === 'function') {
        setTimeout(() => lastFocusedRef.current.focus(), 0);
      }
    }
  }, [open]);

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose?.();
    }
  }

  const cards = useMemo(
    () => [
      {
        key: 'total',
        title: t('stats_total_games'),
        value: String(stats.totalGames || 0),
        icon: '🎮',
        testid: 'stats-total-games',
      },
      {
        key: 'high',
        title: t('stats_highest_score'),
        value: String(stats.highestScore || 0),
        icon: '🏆',
        testid: 'stats-highest-score',
      },
      {
        key: 'fast',
        title: t('stats_fastest_win'),
        value:
          stats.fastestWinSeconds == null
            ? t('stats_not_available')
            : formatDuration(stats.fastestWinSeconds),
        icon: '⏱️',
        testid: 'stats-fastest-win',
      },
      {
        key: 'avg',
        title: t('stats_average_attempts'),
        value: (stats.averageAttempts || 0).toFixed(1),
        icon: '📊',
        testid: 'stats-average-attempts',
      },
    ],
    [stats, t]
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="statistics-title"
      className="ngg-leaderboard-backdrop"
      onKeyDown={onKeyDown}
      data-testid="statistics-modal"
    >
      <div className="ngg-leaderboard-modal">
        <div className="ngg-leaderboard-header">
          <h2 id="statistics-title" className="ngg-leaderboard-title">
            {t('statistics_title')}
          </h2>
          <button
            ref={closeBtnRef}
            className="ngg-btn-secondary"
            style={{ borderColor: 'var(--ocean-secondary)', color: 'var(--ocean-secondary)' }}
            onClick={() => onClose?.()}
            aria-label={t('statistics_close')}
          >
            {t('statistics_close')}
          </button>
        </div>

        <div
          className="stats-grid"
          role="group"
          aria-label={t('statistics_group_aria')}
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          }}
        >
          {cards.map((c) => (
            <div
              key={c.key}
              className="stats-card"
              data-testid={c.testid}
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.9))',
                border: '1px solid var(--border-color, rgba(17,24,39,0.12))',
                borderRadius: 12,
                padding: 16,
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                minHeight: 88,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden="true" style={{ fontSize: 18 }}>{c.icon}</span>
                <span className="ngg-label">{c.title}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{c.value}</div>
            </div>
          ))}
        </div>

        <div className="ngg-leaderboard-hint" style={{ marginTop: 12 }}>
          {t('statistics_hint')}
        </div>
      </div>

      <style>
        {`
        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 520px) {
          .stats-grid { grid-template-columns: 1fr; }
        }
      `}
      </style>
    </div>
  );
}
