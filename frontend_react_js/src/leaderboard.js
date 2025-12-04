const STORAGE_KEY = 'ngg_leaderboard_v2';

/**
 * Shape of a result entry:
 * { id: string, timestamp: number, difficulty: 'easy'|'medium'|'hard', attempts: number, score: number }
 */

// PUBLIC_INTERFACE
export function readResults() {
  /** Read results array from localStorage, return [] if not found or invalid */
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Ensure minimum fields presence; filter out invalid entries and normalize new metadata
    return parsed
      .filter(
        (e) =>
          e &&
          typeof e === 'object' &&
          typeof e.timestamp === 'number' &&
          typeof e.difficulty === 'string' &&
          typeof e.attempts === 'number' &&
          typeof e.score === 'number'
      )
      .map((e) => ({
        ...e,
        timerChallenge: Boolean(e.timerChallenge),
        timeRemaining: typeof e.timeRemaining === 'number' ? e.timeRemaining : null,
        totalTime: typeof e.totalTime === 'number' ? e.totalTime : null,
      }));
  } catch {
    return [];
  }
}

// PUBLIC_INTERFACE
export function writeResults(entries) {
  /** Persist results array safely */
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries || []));
  } catch {
    // ignore quota or serialization errors
  }
}

// PUBLIC_INTERFACE
export function clearResults() {
  /** Remove leaderboard data */
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}

// PUBLIC_INTERFACE
export function addResult({ timestamp, difficulty, attempts, score, timerChallenge = false, timeRemaining = null, totalTime = null }) {
  /** Add a single result and cap list size to top 50 to prevent unbounded growth.
   * We keep a single list; sorting happens per view.
   */
  const nowEntry = {
    id: `${timestamp}-${difficulty}-${attempts}-${score}-${Math.random().toString(36).slice(2)}`,
    timestamp,
    difficulty,
    attempts,
    score,
    timerChallenge: Boolean(timerChallenge),
    timeRemaining: typeof timeRemaining === 'number' ? timeRemaining : null,
    totalTime: typeof totalTime === 'number' ? totalTime : null,
  };
  const existing = readResults();
  const combined = [nowEntry, ...existing];
  // Cap to 50 entries total to keep storage small
  const capped = combined.slice(0, 50);
  writeResults(capped);
  return nowEntry;
}

// PUBLIC_INTERFACE
export function getHighScores(limit = 10) {
  /** Return best by score desc; tie-breaker attempts asc, then timestamp asc for stability */
  const list = readResults().slice();
  list.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.attempts !== b.attempts) return a.attempts - b.attempts;
    return a.timestamp - b.timestamp;
  });
  return list.slice(0, limit);
}

// PUBLIC_INTERFACE
export function getBestAttempts(limit = 10) {
  /** Return best by attempts asc; tie-breaker higher score desc, then timestamp asc */
  const list = readResults().slice();
  list.sort((a, b) => {
    if (a.attempts !== b.attempts) return a.attempts - b.attempts;
    if (b.score !== a.score) return b.score - a.score;
    return a.timestamp - b.timestamp;
  });
  return list.slice(0, limit);
}
