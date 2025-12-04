import React, { useEffect, useRef, useState } from 'react';
import { clearResults, getBestAttempts, getHighScores, readResults } from './leaderboard';

// PUBLIC_INTERFACE
export default function LeaderboardModal({ open, onClose }) {
  /** Accessible modal dialog with two tabs: High Scores and Best Attempts */
  const [tab, setTab] = useState('scores'); // 'scores' | 'attempts'
  const [scores, setScores] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [hasData, setHasData] = useState(false);
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);
  const lastFocusedRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Store last focused element to restore on close
      lastFocusedRef.current = document.activeElement;
      refresh();
      // Move focus into modal
      setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 0);
      // Lock scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore focus to opener
      document.body.style.overflow = '';
      if (lastFocusedRef.current && typeof lastFocusedRef.current.focus === 'function') {
        setTimeout(() => lastFocusedRef.current.focus(), 0);
      }
    }
  }, [open]);

  function refresh() {
    setScores(getHighScores(10));
    setAttempts(getBestAttempts(10));
    setHasData(readResults().length > 0);
  }

  function handleClear() {
    const ok = window.confirm('Clear all leaderboard entries? This action cannot be undone.');
    if (!ok) return;
    clearResults();
    refresh();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose?.();
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
      className="ngg-leaderboard-backdrop"
      onKeyDown={onKeyDown}
    >
      <div className="ngg-leaderboard-modal" ref={dialogRef}>
        <div className="ngg-leaderboard-header">
          <h2 id="leaderboard-title" className="ngg-leaderboard-title">
            Leaderboard
          </h2>
          <button
            ref={closeBtnRef}
            className="ngg-btn-secondary"
            style={{ borderColor: 'var(--ocean-secondary)', color: 'var(--ocean-secondary)' }}
            onClick={() => onClose?.()}
            aria-label="Close leaderboard"
          >
            Close
          </button>
        </div>

        <div className="ngg-leaderboard-tabs" role="tablist" aria-label="Leaderboard views">
          <button
            role="tab"
            aria-selected={tab === 'scores'}
            aria-controls="panel-scores"
            id="tab-scores"
            className={`ngg-tab ${tab === 'scores' ? 'active' : ''}`}
            onClick={() => setTab('scores')}
          >
            High Scores
          </button>
          <button
            role="tab"
            aria-selected={tab === 'attempts'}
            aria-controls="panel-attempts"
            id="tab-attempts"
            className={`ngg-tab ${tab === 'attempts' ? 'active' : ''}`}
            onClick={() => setTab('attempts')}
          >
            Best Attempts
          </button>
          <div style={{ flex: 1 }} />
          <button
            className="ngg-btn-secondary"
            style={{ borderColor: 'var(--ocean-error)', color: 'var(--ocean-error)' }}
            onClick={handleClear}
            aria-label="Clear leaderboard"
          >
            Clear Leaderboard
          </button>
        </div>

        <div className="ngg-leaderboard-content">
          {tab === 'scores' && (
            <ul
              id="panel-scores"
              role="tabpanel"
              aria-labelledby="tab-scores"
              className="ngg-leaderboard-list"
            >
              {scores.length === 0 ? (
                <li className="ngg-empty">No results yet.</li>
              ) : (
                scores.map((r) => <LeaderboardRow key={r.id} entry={r} variant="score" />)
              )}
            </ul>
          )}
          {tab === 'attempts' && (
            <ul
              id="panel-attempts"
              role="tabpanel"
              aria-labelledby="tab-attempts"
              className="ngg-leaderboard-list"
            >
              {attempts.length === 0 ? (
                <li className="ngg-empty">No results yet.</li>
              ) : (
                attempts.map((r) => <LeaderboardRow key={r.id} entry={r} variant="attempts" />)
              )}
            </ul>
          )}
        </div>

        {!hasData && (
          <div className="ngg-leaderboard-hint">
            Play and win a game to add your first leaderboard entry!
          </div>
        )}
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

function DifficultyTag({ difficulty }) {
  const label =
    difficulty === 'easy' ? 'Easy' : difficulty === 'hard' ? 'Hard' : 'Medium';
  return <span className={`ngg-chip diff-${difficulty}`}>{label}</span>;
}

function LeaderboardRow({ entry, variant }) {
  return (
    <li className="ngg-leaderboard-item">
      <div className="ngg-leaderboard-meta">
        <DifficultyTag difficulty={entry.difficulty} />
        <span className="ngg-date">{formatDate(entry.timestamp)}</span>
      </div>
      <div className="ngg-leaderboard-stats">
        <span className="ngg-stat">
          Attempts: <strong>{entry.attempts}</strong>
        </span>
        <span className="ngg-stat">
          Score: <strong>{entry.score}</strong>
        </span>
      </div>
    </li>
  );
}
