import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ACHIEVEMENT_META, readAchievements } from './achievements';

// PUBLIC_INTERFACE
export default function AchievementsModal({ open, onClose }) {
  /** Accessible modal dialog listing achievements with lock/unlock state and dates. */
  const [ach, setAch] = useState(readAchievements());
  const { t } = useTranslation();
  const closeBtnRef = useRef(null);
  const lastFocusedRef = useRef(null);

  useEffect(() => {
    if (open) {
      lastFocusedRef.current = document.activeElement;
      setAch(readAchievements());
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

  if (!open) return null;

  const list = Object.values(ACHIEVEMENT_META);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievements-title"
      className="ngg-leaderboard-backdrop"
      onKeyDown={onKeyDown}
    >
      <div className="ngg-leaderboard-modal">
        <div className="ngg-leaderboard-header">
          <h2 id="achievements-title" className="ngg-leaderboard-title">
            {t('achievements_title')}
          </h2>
          <button
            ref={closeBtnRef}
            className="ngg-btn-secondary"
            style={{ borderColor: 'var(--ocean-secondary)', color: 'var(--ocean-secondary)' }}
            onClick={() => onClose?.()}
            aria-label={t('achievements_close')}
          >
            {t('achievements_close')}
          </button>
        </div>

        <ul className="ngg-leaderboard-list" role="list" aria-label={t('achievements_list_aria')}>
          {list.map((meta) => {
            const unlocked = Boolean(ach[meta.key]);
            const ts = ach.unlockedAt?.[meta.key];
            return (
              <li key={meta.key} className="ngg-leaderboard-item" role="listitem">
                <div className="ngg-leaderboard-meta" style={{ gap: 12 }}>
                  <span
                    className="ngg-chip"
                    aria-label={unlocked ? t('achievements_unlocked') : t('achievements_locked')}
                    title={unlocked ? t('achievements_unlocked') : t('achievements_locked')}
                    style={{
                      background: unlocked ? 'rgba(16,185,129,0.12)' : 'rgba(17,24,39,0.06)',
                      borderColor: unlocked ? 'rgba(16,185,129,0.3)' : 'rgba(17,24,39,0.12)',
                    }}
                  >
                    {meta.emoji} {unlocked ? t('achievements_unlocked') : t('achievements_locked')}
                  </span>
                  <strong>{t(`ach_${meta.key}_title`)}</strong>
                </div>
                <div className="ngg-leaderboard-stats" style={{ gap: 12 }}>
                  <span className="ngg-stat" style={{ color: 'var(--ocean-text)' }}>
                    {t(`ach_${meta.key}_desc`)}
                  </span>
                  <span className="ngg-date" aria-live="polite">
                    {unlocked && ts ? t('achievements_unlocked_at', { date: formatDate(ts) }) : t('achievements_not_yet')}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function formatDate(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return '';
  }
}
