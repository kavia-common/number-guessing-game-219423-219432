const STORAGE_KEY = 'ngg_achievements';

/**
 * Shape:
 * {
 *   firstTryWin: boolean,
 *   noHintsWin: boolean,
 *   unlockedAt: { firstTryWin?: number, noHintsWin?: number }
 * }
 */

const DEFAULT_ACHIEVEMENTS = Object.freeze({
  firstTryWin: false,
  noHintsWin: false,
  unlockedAt: {},
});

// PUBLIC_INTERFACE
export function readAchievements() {
  /**
   * Read achievements object from localStorage. Returns defaults if absent/invalid.
   */
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ACHIEVEMENTS, unlockedAt: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_ACHIEVEMENTS, unlockedAt: {} };
    }
    const firstTryWin = Boolean(parsed.firstTryWin);
    const noHintsWin = Boolean(parsed.noHintsWin);
    const unlockedAt = parsed.unlockedAt && typeof parsed.unlockedAt === 'object'
      ? { ...parsed.unlockedAt }
      : {};
    return { firstTryWin, noHintsWin, unlockedAt };
  } catch {
    return { ...DEFAULT_ACHIEVEMENTS, unlockedAt: {} };
  }
}

// PUBLIC_INTERFACE
export function writeAchievements(ach) {
  /**
   * Persist achievements object safely to localStorage.
   */
  try {
    const safe = {
      firstTryWin: Boolean(ach.firstTryWin),
      noHintsWin: Boolean(ach.noHintsWin),
      unlockedAt: { ...(ach.unlockedAt || {}) },
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  } catch {
    // no-op on quota or serialization errors
  }
}

// PUBLIC_INTERFACE
export function unlockAchievements(current, keysToUnlock, timestamp = Date.now()) {
  /**
   * Merge unlocks into current achievements, tagging unlockedAt timestamps where newly unlocked.
   * Returns the updated object and an array of newly unlocked keys.
   */
  const next = { ...current, unlockedAt: { ...(current.unlockedAt || {}) } };
  const newly = [];
  for (const key of keysToUnlock) {
    if (!next[key]) {
      next[key] = true;
      next.unlockedAt[key] = timestamp;
      newly.push(key);
    }
  }
  if (newly.length > 0) {
    writeAchievements(next);
  }
  return { next, newly };
}

// PUBLIC_INTERFACE
export const ACHIEVEMENT_META = {
  firstTryWin: {
    key: 'firstTryWin',
    title: 'First-Try Win',
    description: 'Win a round in exactly 1 attempt.',
    emoji: '⚡',
  },
  noHintsWin: {
    key: 'noHintsWin',
    title: 'No-Hints Win',
    description: 'Win a round without using any hints.',
    emoji: '🧠',
  },
};
