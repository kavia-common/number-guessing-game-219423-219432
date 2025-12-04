const STATS_STORAGE_KEY = 'ngg_stats_v1';

/**
 * Structure in localStorage under STATS_STORAGE_KEY:
 * { totalGames: number }
 */

// PUBLIC_INTERFACE
export function readStats() {
  /** Read statistics object from localStorage. Defaults to { totalGames: 0 } */
  try {
    const raw = window.localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return { totalGames: 0 };
    const parsed = JSON.parse(raw);
    const totalGames =
      parsed && typeof parsed.totalGames === 'number' && parsed.totalGames >= 0
        ? parsed.totalGames
        : 0;
    return { totalGames };
  } catch {
    return { totalGames: 0 };
  }
}

// PUBLIC_INTERFACE
export function writeStats(stats) {
  /** Persist statistics object safely */
  try {
    const safe = { totalGames: Math.max(0, Number(stats?.totalGames || 0)) };
    window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(safe));
  } catch {
    // no-op
  }
}

// PUBLIC_INTERFACE
export function incrementTotalGames() {
  /** Increment totalGames counter by 1 and persist */
  const current = readStats();
  const next = { totalGames: (current.totalGames || 0) + 1 };
  writeStats(next);
  return next.totalGames;
}

// PUBLIC_INTERFACE
export function computeStatisticsFromLeaderboard(entries, fallbackTotalGames = null) {
  /**
   * Compute:
   * - totalGames: prefer stored stats.totalGames, else fallbackTotalGames, else entries.length
   * - highestScore: max score across entries or 0 if none
   * - fastestWinSeconds: prefer entries with timerChallenge metadata; if totalTime/timeRemaining available, compute totalTime - timeRemaining and take the min; if not available, return null (N/A)
   * - averageAttempts: average attempts across entries (wins only), rounded to 1 decimal; 0 when no entries
   */
  const wins = Array.isArray(entries) ? entries : [];
  const totalGames =
    typeof fallbackTotalGames === 'number'
      ? Math.max(fallbackTotalGames, wins.length)
      : wins.length;

  // Highest score
  let highestScore = 0;
  for (const e of wins) {
    if (typeof e?.score === 'number' && e.score > highestScore) {
      highestScore = e.score;
    }
  }

  // Fastest win (min elapsed seconds) using timer metadata
  let fastest = null;
  for (const e of wins) {
    if (e && e.timerChallenge && typeof e.totalTime === 'number' && typeof e.timeRemaining === 'number') {
      const elapsed = e.totalTime - e.timeRemaining;
      if (Number.isFinite(elapsed) && elapsed >= 0) {
        fastest = fastest == null ? elapsed : Math.min(fastest, elapsed);
      }
    }
  }
  const fastestWinSeconds = fastest != null ? Math.round(fastest) : null;

  // Average attempts across wins
  if (wins.length === 0) {
    return { totalGames, highestScore: 0, fastestWinSeconds: fastestWinSeconds, averageAttempts: 0 };
  }
  let sumAttempts = 0;
  for (const e of wins) {
    sumAttempts += (typeof e.attempts === 'number' ? e.attempts : 0);
  }
  const avg = wins.length > 0 ? sumAttempts / wins.length : 0;
  const averageAttempts = Math.round(avg * 10) / 10;

  return { totalGames, highestScore, fastestWinSeconds, averageAttempts };
}

// PUBLIC_INTERFACE
export function formatDuration(seconds) {
  /** Format seconds as s or mm:ss for display */
  if (seconds == null) return 'N/A';
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m <= 0) return `${s}s`;
  return `${m}:${String(rem).padStart(2, '0')}`;
}
