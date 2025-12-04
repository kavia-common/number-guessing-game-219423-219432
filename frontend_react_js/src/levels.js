const STORAGE_KEY = 'ngg_levels_progress_v1';

// PUBLIC_INTERFACE
export const LEVELS = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  EXPERT: 'Expert',
};

// PUBLIC_INTERFACE
export const LEVEL_ORDER = [LEVELS.BEGINNER, LEVELS.INTERMEDIATE, LEVELS.EXPERT];

// PUBLIC_INTERFACE
export const LEVEL_DESCRIPTIONS = {
  [LEVELS.BEGINNER]: 'Great for first-time players.',
  [LEVELS.INTERMEDIATE]: 'A balanced challenge.',
  [LEVELS.EXPERT]: 'For seasoned guessers. Good luck!',
};

// PUBLIC_INTERFACE
export const LEVEL_PRESET_DIFFICULTY = {
  [LEVELS.BEGINNER]: 'easy',
  [LEVELS.INTERMEDIATE]: 'medium',
  [LEVELS.EXPERT]: 'hard',
};

// PUBLIC_INTERFACE
export function readLevelProgress() {
  /**
   * Reads unlocked levels from localStorage.
   * Returns a Set of unlocked level names; defaults to Beginner unlocked.
   */
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set([LEVELS.BEGINNER]);
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.unlocked)) return new Set([LEVELS.BEGINNER]);
    const valid = parsed.unlocked.filter((l) => LEVEL_ORDER.includes(l));
    if (valid.length === 0) return new Set([LEVELS.BEGINNER]);
    return new Set(valid);
  } catch {
    return new Set([LEVELS.BEGINNER]);
  }
}

// PUBLIC_INTERFACE
export function writeLevelProgress(unlockedSet) {
  /**
   * Persists unlocked levels to localStorage.
   */
  try {
    const arr = Array.from(unlockedSet).filter((l) => LEVEL_ORDER.includes(l));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ unlocked: arr }));
  } catch {
    // no-op
  }
}

// PUBLIC_INTERFACE
export function getNextLevel(currentLevel) {
  /**
   * Get the next level in progression order, or null if at the last level.
   */
  const idx = LEVEL_ORDER.indexOf(currentLevel);
  if (idx === -1 || idx >= LEVEL_ORDER.length - 1) return null;
  return LEVEL_ORDER[idx + 1];
}
