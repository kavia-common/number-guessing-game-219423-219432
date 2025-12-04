import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { useTranslation } from 'react-i18next';
// Import success sound from src so CRA bundles and serves the correct URL
import successChimeUrl from './assets/success-chime.mp3';
import LeaderboardModal from './LeaderboardModal';
import { addResult } from './leaderboard';
import AchievementsModal from './AchievementsModal';
import StatisticsModal from './StatisticsModal';
import { incrementTotalGames } from './statistics';
import { ACHIEVEMENT_META, readAchievements, unlockAchievements, writeAchievements } from './achievements';
import {
  LEVELS,
  LEVEL_ORDER,
  LEVEL_PRESET_DIFFICULTY,
  LEVEL_DESCRIPTIONS,
  readLevelProgress,
  writeLevelProgress,
  getNextLevel,
} from './levels';

/**
 * Number Guessing Game - Ocean Professional themed
 * Single page, centered layout with header, guess input, difficulty selector, feedback, attempts, score, and reset button.
 * Self-contained; no backend calls. Includes keyboard accessibility and focus management.
 */

// Ocean Professional theme tokens (synced with CSS vars in App.css)
const THEME = {
  name: 'Ocean Professional',
  primary: '#2563EB',
  secondary: '#F59E0B',
  success: '#F59E0B',
  error: '#EF4444',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
};

// Difficulty presets
const DIFFICULTIES = {
  easy: { label: 'Easy', min: 1, max: 20 },
  medium: { label: 'Medium', min: 1, max: 50 },
  hard: { label: 'Hard', min: 1, max: 100 },
};

// PUBLIC_INTERFACE
// Fixed penalty per hint usage applied to final score on win
const HINT_PENALTY = 100;

/** PUBLIC_INTERFACE
 * Default Timer Challenge durations by difficulty (in seconds)
 * These are distinct for the challenge countdown.
 */
const TIMER_CHALLENGE_DEFAULTS = {
  easy: 30,
  medium: 45,
  hard: 60,
};

// internal helper to clamp a number between min and max
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/** PUBLIC_INTERFACE
 * Time bonus up to +50% when winning with full time left in Timer Challenge.
 * finalScore = max(0, baseScore - hintPenalty) * (1 + (remaining/total) * TIME_BONUS_WEIGHT)
 */
const TIME_BONUS_WEIGHT = 0.5;

// PUBLIC_INTERFACE
// Volume constant for success sound (0.0 - 1.0)
const SUCCESS_SOUND_VOLUME = 0.6;

// PUBLIC_INTERFACE
// Clamp final score to a reasonable upper bound to avoid runaway values.
const MAX_FINAL_SCORE = 5000;

// PUBLIC_INTERFACE
// Maximum allowed attempts per difficulty
const MAX_ATTEMPTS = {
  easy: 6,
  medium: 8,
  hard: 10,
};

// PUBLIC_INTERFACE
// Hint types for this game
const HINT_TYPES = {
  parity: 'parity',
  range: 'range',
  digit: 'digit',
  proximity: 'proximity',
};

// PUBLIC_INTERFACE
// Guess history entry shape helper
function makeHistoryEntry(index, value, result) {
  return {
    index,
    value,
    result, // 'too low' | 'too high' | 'correct'
    ts: Date.now(),
    id: `${Date.now()}-${index}-${value}-${result}`,
  };
}

/** PUBLIC_INTERFACE
 * Format seconds to mm:ss (or s for under a minute if desired)
 */
function formatSeconds(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m <= 0) return `${s}s`;
  return `${String(m)}:${String(s).padStart(2, '0')}`;
}

/** PUBLIC_INTERFACE
 * Main application component for the Number Guessing Game.
 * Manages theme, game state, and renders the UI.
 */
function App() {
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState(() => i18n.language || 'en');
  useEffect(() => {
    if (lang !== i18n.language) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);
  /** State
   * Place 'range' before any usage in initializers to avoid TDZ issues.
   */
  const [theme, setTheme] = useState('light'); // kept to respect existing template behavior

  // Levels: unlocked progress and current level
  const [unlockedLevels, setUnlockedLevels] = useState(() => readLevelProgress());
  const [level, setLevel] = useState(() => LEVELS.BEGINNER);
  const [unlockMessage, setUnlockMessage] = useState(''); // aria-live message for unlocks

  // PUBLIC_INTERFACE
  // difficulty selection persisted in state, default Medium; will be preset by level
  const [difficulty, setDifficulty] = useState('medium');

  const [range, setRange] = useState(() => {
    const d = DIFFICULTIES['medium'];
    return { min: d.min, max: d.max };
  });

  const [secret, setSecret] = useState(() => {
    // initialize secret using explicit min/max to avoid referencing 'range' before it's initialized
    const d = DIFFICULTIES['medium'];
    return generateSecret(d.min, d.max);
  });
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
  // status: 'playing' | 'won' | 'timeout' | 'out_of_attempts'
  const [status, setStatus] = useState('playing');
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0); // track score based on attempts and difficulty

  // Leaderboard modal visibility
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  // Achievements state
  const [achievements, setAchievements] = useState(() => readAchievements());
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [statisticsOpen, setStatisticsOpen] = useState(false);
  const [achToast, setAchToast] = useState(''); // announcement text for newly unlocked
  const achLiveRef = useRef(null); // aria-live for achievements
  const [roundNewlyUnlocked, setRoundNewlyUnlocked] = useState([]); // to show chips on win

  // Hint state:
  // count of hint types used (penalty per unique type)
  const [hintTypesUsed, setHintTypesUsed] = useState({
    [HINT_TYPES.parity]: false,
    [HINT_TYPES.range]: false,
    [HINT_TYPES.digit]: false,
    [HINT_TYPES.proximity]: false,
  });
  const [lastHint, setLastHint] = useState('');
  const hintCount = Object.values(hintTypesUsed).filter(Boolean).length;

  // Attempts remaining derived from difficulty and attempts used
  const maxAttempts = MAX_ATTEMPTS[difficulty];
  const attemptsRemaining = Math.max(0, maxAttempts - attempts);
  const attemptsLiveText = `Attempts remaining: ${attemptsRemaining}.`;

  // Guess History state: array of { index, value, result, ts, id }
  const [history, setHistory] = useState([]);
  const [repeatWarning, setRepeatWarning] = useState(''); // inline warning for repeated guesses
  const [historyLive, setHistoryLive] = useState(''); // aria-live updates for history

  // Timer Challenge Mode (distinct dedicated mode)
  const [timerChallenge, setTimerChallenge] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_CHALLENGE_DEFAULTS[difficulty]);
  const [totalTime, setTotalTime] = useState(TIMER_CHALLENGE_DEFAULTS[difficulty]);
  const [winTimeBonusPct, setWinTimeBonusPct] = useState(0); // for UI breakdown on success
  const timerRef = useRef(null);
  const lastAnnouncedRef = useRef(null); // to avoid SR spam

  /** Refs for accessibility and UX */
  const inputRef = useRef(null);
  const feedbackRef = useRef(null);
  const playAgainRef = useRef(null);
  const attemptsLiveRef = useRef(null);
  const historyLiveRef = useRef(null);
  const unlockLiveRef = useRef(null); // aria-live for level unlocks

  // Audio: preload success sound element
  const successAudioRef = useRef(null);

  // Apply theme token to document for CSS var selection (light/dark switch retained)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // On mount, load level progress and preset difficulty for current level
  useEffect(() => {
    const saved = readLevelProgress();
    setUnlockedLevels(saved);
    // Default to Beginner if not unlocked set present
    const initialLevel = LEVELS.BEGINNER;
    setLevel(initialLevel);
    const presetDiff = LEVEL_PRESET_DIFFICULTY[initialLevel] || 'easy';
    applyDifficultyPreset(presetDiff);

    // load achievements once
    try {
      setAchievements(readAchievements());
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived info
  const placeholder = useMemo(
    () => t('guessPlaceholder', { min: range.min, max: range.max }),
    [range, t]
  );

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  /** Logic */
  // Make generateSecret independent from component closure by always requiring min/max
  function generateSecret(min, max) {
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    return value;
  }

  // Helper: apply difficulty preset and reset game state
  function applyDifficultyPreset(nextDifficulty) {
    setDifficulty(nextDifficulty);
    const preset = DIFFICULTIES[nextDifficulty];
    setRange({ min: preset.min, max: preset.max });
    setSecret(generateSecret(preset.min, preset.max));
    setInput('');
    setFeedback('');
    setAttempts(0);
    setStatus('playing');
    setScore(0);
    resetHints();
    resetHistory();
    setRoundNewlyUnlocked([]);
    resetAndMaybeStartTimer(nextDifficulty);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  /**
   * Compute a proportional base score for a win (without time bonus).
   * Fewer attempts yield higher score, scaled by the difficulty (range max).
   * PUBLIC_INTERFACE
   */
  function computeScore(attemptCount, rangeMax) {
    // Avoid division by zero; clamp to sensible values
    const maxVal = Math.max(1, Number(rangeMax));
    const raw = Math.round((1000 * (maxVal - attemptCount + 1)) / maxVal);
    return Math.max(0, raw);
  }

  // Internal: Clear and stop timer
  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // PUBLIC_INTERFACE
  // Safely play success sound on user gesture (form submit) if allowed and not reduced-motion-muted by user
  async function playSuccessSound() {
    try {
      const el = successAudioRef.current;
      if (!el) return;
      if (el.muted) return;
      el.volume = SUCCESS_SOUND_VOLUME;
      const p = el.play();
      if (p && typeof p.then === 'function') {
        await p.catch(() => {});
      }
    } catch {
      // no-op: never block UI
    }
  }

  // PUBLIC_INTERFACE
  // Trigger a gentle vibration if supported on user interaction
  function vibrateOnWrongGuess() {
    try {
      if (navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(80);
      }
    } catch {
      // no-op
    }
  }

  // PUBLIC_INTERFACE
  // Reset timer based on current difficulty and (re)start when Timer Challenge is enabled
  function resetAndMaybeStartTimer(nextDifficulty = difficulty) {
    const duration = TIMER_CHALLENGE_DEFAULTS[nextDifficulty];
    setTotalTime(duration);
    setTimeLeft(duration);
    setWinTimeBonusPct(0);
    clearTimer();
    if (timerChallenge && status === 'playing') {
      // Start ticking every 1s
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            // Timeout reached -> loss state (no success sound here)
            clearTimer();
            setStatus('timeout');
            setFeedback(t('feedback_timeout_round_over'));
            // Do not alter history on timeout per requirements
            setTimeout(() => playAgainRef.current?.focus(), 0);
            try { incrementTotalGames(); } catch {}
            return 0;
          }
          return next;
        });
      }, 1000);
    }
  }

  // Start/stop timer on challenge toggle
  useEffect(() => {
    if (timerChallenge) {
      resetAndMaybeStartTimer(difficulty);
    } else {
      clearTimer();
    }
    return () => {
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerChallenge]);

  // Stop timer when status changes out of 'playing' (e.g., win or timeout or out_of_attempts)
  useEffect(() => {
    if (status !== 'playing') {
      clearTimer();
    } else if (timerChallenge) {
      resetAndMaybeStartTimer(difficulty);
    }
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Update countdown announcement without spamming
  const timerAriaText = useMemo(() => {
    if (!timerChallenge || status !== 'playing') return '';
    const announce = timeLeft <= 10 || timeLeft % 5 === 0 || timeLeft === totalTime;
    if (announce && lastAnnouncedRef.current !== timeLeft) {
      lastAnnouncedRef.current = timeLeft;
      return `${t('timer_challenge_countdown', { time: formatSeconds(timeLeft) })}`;
    }
    return '';
  }, [timeLeft, timerChallenge, status, totalTime, t]);

  // Reset all hint state
  function resetHints() {
    setHintTypesUsed({
      [HINT_TYPES.parity]: false,
      [HINT_TYPES.range]: false,
      [HINT_TYPES.digit]: false,
      [HINT_TYPES.proximity]: false,
    });
    setLastHint('');
  }

  // Reset guess history for new round
  function resetHistory() {
    setHistory([]);
    setRepeatWarning('');
    setHistoryLive('');
  }

  // PUBLIC_INTERFACE
  function resetGame() {
    setSecret(generateSecret(range.min, range.max));
    setInput('');
    setFeedback('');
    setAttempts(0);
    setStatus('playing');
    setScore(0);
    resetHints();
    resetHistory();
    setRoundNewlyUnlocked([]);
    resetAndMaybeStartTimer(difficulty);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // PUBLIC_INTERFACE
  function handleDifficultyChange(e) {
    const next = e.target.value;
    setDifficulty(next);
    const preset = DIFFICULTIES[next];
    setRange({ min: preset.min, max: preset.max });
    setSecret(generateSecret(preset.min, preset.max));
    setInput('');
    setFeedback('');
    setAttempts(0);
    setStatus('playing');
    setScore(0);
    resetHints();
    resetHistory();
    setRoundNewlyUnlocked([]);
    resetAndMaybeStartTimer(next);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // PUBLIC_INTERFACE
  function handleLevelChange(nextLevel) {
    // Gatekeep: must be unlocked
    if (!unlockedLevels.has(nextLevel)) return;
    setLevel(nextLevel);
    // Apply preset difficulty but allow user to change later
    const preset = LEVEL_PRESET_DIFFICULTY[nextLevel] || 'medium';
    applyDifficultyPreset(preset);
  }

  // Check and unlock next level on a win (single round)
  function unlockNextLevelIfEligible(currentLevel) {
    const next = getNextLevel(currentLevel);
    if (!next) return; // no next level
    if (unlockedLevels.has(next)) return; // already unlocked
    const nextSet = new Set(unlockedLevels);
    nextSet.add(next);
    setUnlockedLevels(nextSet);
    writeLevelProgress(nextSet);
    const msg = `🎉 ${next} unlocked!`;
    setUnlockMessage(msg);
    // announce politely
    setTimeout(() => {
      if (unlockLiveRef.current) {
        unlockLiveRef.current.textContent = msg;
      }
    }, 0);
  }

  function validateInput(value) {
    if (value.trim() === '') return { ok: false, message: t('guessLabel') };
    const num = Number(value);
    if (Number.isNaN(num)) return { ok: false, message: t('submitGuessTitle') };
    if (!Number.isInteger(num)) return { ok: false, message: t('submitGuessTitle') };
    if (num < range.min || num > range.max) {
      return { ok: false, message: t('guessPlaceholder', { min: range.min, max: range.max }) };
    }
    return { ok: true, value: num };
  }

  // Check if guess was already made in current round
  function isRepeatGuess(num) {
    return history.some((h) => h.value === num);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === 'won' || status === 'timeout' || status === 'out_of_attempts') return;

    const validation = validateInput(input);
    if (!validation.ok) {
      setFeedback(validation.message);
      setTimeout(() => feedbackRef.current?.focus(), 0);
      return;
    }

    const guess = validation.value;

    // Prevent repeated guesses: warn and ignore, do not decrement attempts, do not add to history
    if (isRepeatGuess(guess)) {
      const msg = t('repeat_warning', { guess });
      setRepeatWarning(msg);
      // subtle focus for SR users; don't change attempts
      setTimeout(() => feedbackRef.current?.focus(), 0);
      return;
    } else {
      // clear any prior repeat warning on a new, unique guess
      if (repeatWarning) setRepeatWarning('');
    }

    const nextAttempts = attempts + 1;
    let resultLabel = '';
    if (guess === secret) {
      resultLabel = 'correct';
    } else if (guess < secret) {
      resultLabel = 'too low';
    } else {
      resultLabel = 'too high';
    }

    // Update attempts only for first-time valid guesses
    setAttempts(nextAttempts);

    // Update guess history
    setHistory((prev) => {
      const entry = makeHistoryEntry(prev.length + 1, guess, resultLabel);
      const next = [...prev, entry];
      // Announce politely for screen readers
      setHistoryLive(t('history_item_aria', { value: guess, result: resultLabel }));
      return next;
    });

    if (resultLabel === 'correct') {
      const baseScore = computeScore(nextAttempts, range.max);
      const penalty = Math.min(baseScore, hintCount * HINT_PENALTY);
      let finalBase = Math.max(0, baseScore - penalty);
      let multiplier = 1;
      let finalScore = finalBase;
      let timeBonusPct = 0;

      if (timerChallenge && totalTime > 0) {
        const bonus = 1 + (Math.max(0, timeLeft) / totalTime) * TIME_BONUS_WEIGHT;
        multiplier = bonus;
        timeBonusPct = Math.round((bonus - 1) * 100);
        finalScore = Math.round(clamp(finalBase * bonus, 0, MAX_FINAL_SCORE));
      } else {
        finalScore = Math.round(clamp(finalBase, 0, MAX_FINAL_SCORE));
      }

      setScore(finalScore);
      setWinTimeBonusPct(timeBonusPct);

      try {
        addResult({
          timestamp: Date.now(),
          difficulty,
          attempts: nextAttempts,
          score: finalScore,
          timerChallenge: Boolean(timerChallenge),
          timeRemaining: timerChallenge ? Math.max(0, timeLeft) : null,
          totalTime: timerChallenge ? totalTime : null,
        });
      } catch {
        // ignore storage errors
      }

      await playSuccessSound();

      setFeedback(
        timerChallenge
          ? t('feedback_correct_timebonus', {
              secret,
              score: finalScore,
              bonus: timeBonusPct,
            })
          : t('feedback_correct', { secret, score: finalScore })
      );
      setStatus('won');

      try { incrementTotalGames(); } catch {}
      // Unlock next level for wins only (not losses/timeouts)
      unlockNextLevelIfEligible(level);

      // Achievements unlock evaluation (persist across sessions)
      try {
        const current = readAchievements();
        const toUnlock = [];
        if (nextAttempts === 1) toUnlock.push('firstTryWin');
        if (hintCount === 0) toUnlock.push('noHintsWin');
        if (toUnlock.length > 0) {
          const { next, newly } = unlockAchievements(current, toUnlock, Date.now());
          setAchievements(next);
          setRoundNewlyUnlocked(newly);
          if (newly.length > 0) {
            const titles = newly.map(k => ACHIEVEMENT_META[k]?.title || k).join(' & ');
            const msg = t('achievement_unlocked_toast', { titles });
            setAchToast(msg);
            setTimeout(() => {
              if (achLiveRef.current) achLiveRef.current.textContent = msg;
            }, 0);
            // auto-hide toast after a short delay
            setTimeout(() => setAchToast(''), 3000);
          }
        } else {
          setRoundNewlyUnlocked([]);
        }
      } catch {
        // no-op
      }

      setTimeout(() => playAgainRef.current?.focus(), 0);
      clearTimer();
      return;
    }

    // Incorrect guess path
    if (resultLabel === 'too low') {
      setFeedback(t('feedback_low'));
    } else {
      setFeedback(t('feedback_high'));
    }
    vibrateOnWrongGuess();
    setTimeout(() => feedbackRef.current?.focus(), 0);

    // After processing wrong guess, check attempts remaining and end round if zero
    const remaining = maxAttempts - nextAttempts;
    if (remaining <= 0) {
      setStatus('out_of_attempts');
      setFeedback(t('feedback_out_attempts'));
      setTimeout(() => playAgainRef.current?.focus(), 0);
      try { incrementTotalGames(); } catch {}
      clearTimer();
    }
  }

  // PUBLIC_INTERFACE
  function announceHint(text, typeKey) {
    setLastHint(text);
    setFeedback(text);
    // Only apply penalty once per hint type
    setHintTypesUsed((prev) => {
      if (!prev[typeKey]) {
        return { ...prev, [typeKey]: true };
      }
      return prev;
    });
    setTimeout(() => feedbackRef.current?.focus(), 0);
  }

  // PUBLIC_INTERFACE
  function handleParityHint() {
    if (status !== 'playing') return;
    const parity = secret % 2 === 0 ? t('hint_parity_text', { parity: 'even' }) : t('hint_parity_text', { parity: 'odd' });
    announceHint(parity, HINT_TYPES.parity);
  }

  // PUBLIC_INTERFACE
  function handleRangeHint() {
    if (status !== 'playing') return;
    const totalSpan = range.max - range.min + 1;
    const targetWidth = Math.min(Math.max(5, Math.floor(totalSpan / 3)), Math.max(3, totalSpan - 2));
    const half = Math.floor(targetWidth / 2);
    let start = Math.max(range.min, secret - half);
    let end = start + targetWidth - 1;
    if (end > range.max) {
      end = range.max;
      start = Math.max(range.min, end - targetWidth + 1);
    }
    if (start === range.min && end === range.max && totalSpan > 5) {
      start = range.min + 1;
      end = range.max - 1;
    }
    if (secret < start) start = secret;
    if (secret > end) end = secret;

    const text = t('hint_range_text', { start, end });
    announceHint(text, HINT_TYPES.range);
  }

  // PUBLIC_INTERFACE
  function handleDigitHint() {
    if (status !== 'playing') return;
    const s = String(secret);
    const startDigit = s[0];
    const text =
      s.length === 1
        ? t('hint_digit_text_single', { digit: startDigit })
        : t('hint_digit_text_multi', { digit: startDigit });
    announceHint(text, HINT_TYPES.digit);
  }

  // PUBLIC_INTERFACE
  function handleProximityHint() {
    if (status !== 'playing') return;
    if (attempts <= 0) {
      announceHint(t('hint_proximity_need_guess'), HINT_TYPES.proximity);
      return;
    }
    let msg = '';
    const thresholdVeryClose = 3;
    const thresholdHot = 6;
    const thresholdWarm = 12;
    let lastGuess = null;

    const parsed = Number(input);
    if (!Number.isNaN(parsed) && Number.isInteger(parsed) && parsed >= range.min && parsed <= range.max) {
      lastGuess = parsed;
    }

    if (lastGuess != null) {
      const delta = Math.abs(secret - lastGuess);
      if (delta === 0) {
        msg = t('hint_proximity_already_correct');
      } else if (delta <= thresholdVeryClose) {
        msg = t('hint_proximity_very_close');
      } else if (delta <= thresholdHot) {
        msg = t('hint_proximity_hot');
      } else if (delta <= thresholdWarm) {
        msg = t('hint_proximity_warm');
      } else {
        msg = t('hint_proximity_cold');
      }
    } else {
      msg = t('hint_proximity_after_valid');
    }

    announceHint(msg, HINT_TYPES.proximity);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      return;
    }
  }

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const playingDisabled = status === 'won' || status === 'timeout' || status === 'out_of_attempts';

  // Badge color classes mapping
  function badgeClass(result) {
    if (result === 'correct') return 'ngg-chip guess-correct';
    if (result === 'too high') return 'ngg-chip guess-high';
    return 'ngg-chip guess-low';
  }

  // UI helpers
  const isUnlocked = (lvl) => unlockedLevels.has(lvl);

  return (
    <div className="App" style={{ background: THEME.background, color: THEME.text }}>
      {/* Hidden/preloaded audio element; will only play on user gesture via handleSubmit */}
      <audio
        ref={successAudioRef}
        src={successChimeUrl}
        preload="auto"
        aria-hidden="true"
        style={{ display: 'none' }}
        onCanPlay={() => {
          if (successAudioRef.current) {
            successAudioRef.current.volume = SUCCESS_SOUND_VOLUME;
          }
        }}
      />

      <header className="ngg-header">
        <div className="ngg-header-inner">
          <div className="ngg-title-wrap">
            <h1 className="ngg-title">{t('appTitle')}</h1>
            <p className="ngg-subtitle">
              {t('appSubtitle', { min: range.min, max: range.max })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Levels panel */}
            <div role="group" aria-label={t('levels')} style={{ display: 'flex', gap: 6 }}>
              {LEVEL_ORDER.map((lvl) => {
                const unlocked = isUnlocked(lvl);
                const active = lvl === level;
                return (
                  <button
                    key={lvl}
                    type="button"
                    className="theme-toggle"
                    aria-label={`${t(`level_${lvl}`)} ${t('levels')}${!unlocked ? ' ' + t('levelLocked') : ''}`}
                    aria-pressed={active}
                    onClick={() => unlocked && handleLevelChange(lvl)}
                    disabled={!unlocked}
                    title={!unlocked ? `${t(`level_${lvl}`)} ${t('levelLocked')}` : `${t(`level_${lvl}`)}: ${LEVEL_DESCRIPTIONS[lvl]}`}
                    style={{
                      opacity: unlocked ? 1 : 0.5,
                      border: active ? `2px solid ${THEME.secondary}` : 'none',
                      background: active ? THEME.primary : undefined,
                    }}
                  >
                    {unlocked ? t('levelUnlockedEmoji') : t('levelLockedEmoji')} {t(`level_${lvl}`)}
                  </button>
                );
              })}
            </div>

            <label htmlFor="lang" className="ngg-label" style={{ marginRight: 6 }}>
              {t('language_label')}
            </label>
            <select
              id="lang"
              aria-label={t('language_label')}
              className="ngg-input"
              style={{ maxWidth: 140 }}
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              data-testid="language-select"
            >
              <option value="en">{t('language_en')}</option>
              <option value="te">{t('language_te')}</option>
              <option value="hi">{t('language_hi')}</option>
            </select>

            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`${t('themeLabel')}: ${theme === 'light' ? t('themeToggleDark') : t('themeToggleLight')}`}
            >
              {theme === 'light' ? t('themeToggleDark') : t('themeToggleLight')}
            </button>
            <button
              className="theme-toggle"
              onClick={() => setLeaderboardOpen(true)}
              aria-label={t('openLeaderboard')}
            >
              {t('openLeaderboard')}
            </button>
            <button
              className="theme-toggle"
              onClick={() => setAchievementsOpen(true)}
              aria-label={t('openAchievements')}
              title={t('openAchievements')}
            >
              {t('openAchievements')}
            </button>
            <button
              className="theme-toggle"
              onClick={() => setStatisticsOpen(true)}
              aria-label={t('openStatistics')}
              title={t('openStatistics')}
              data-testid="open-statistics"
            >
              {t('openStatistics')}
            </button>
          </div>
        </div>
      </header>

      {/* Achievements aria-live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true" ref={achLiveRef}>
        {achToast}
      </div>
      {/* Visual toast for achievements */}
      {achToast ? (
        <div className="ngg-ach-toast" role="status" aria-live="polite">
          {achToast}
        </div>
      ) : null}

      <main className="ngg-main">
        <section className="ngg-card" aria-labelledby="game-section-title">
          <div className="ngg-card-gradient" aria-hidden="true" />
          <h2 id="game-section-title" className="sr-only">Game controls</h2>

          {/* Level unlock aria-live region */}
          <div className="sr-only" aria-live="polite" aria-atomic="true" ref={unlockLiveRef}>
            {unlockMessage}
          </div>

          {/* Difficulty selector and Timer Challenge toggle */}
          <div className="ngg-form" role="group" aria-labelledby="difficulty-label">
            <label id="difficulty-label" htmlFor="difficulty" className="ngg-label">
              {t('difficultyLabel')}
            </label>
            <div className="ngg-input-row" style={{ gridTemplateColumns: '1fr' }}>
              <select
                id="difficulty"
                aria-label={t('difficultyLabel')}
                className="ngg-input"
                value={difficulty}
                onChange={handleDifficultyChange}
              >
                <option value="easy">{t('difficultyEasy')}</option>
                <option value="medium">{t('difficultyMedium')}</option>
                <option value="hard">{t('difficultyHard')}</option>
              </select>
            </div>

            <div className="ngg-input-row" style={{ gridTemplateColumns: 'auto 1fr' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  id="timerChallenge"
                  type="checkbox"
                  checked={timerChallenge}
                  onChange={(e) => setTimerChallenge(e.target.checked)}
                  aria-label={t('timerChallengeEnableLabel')}
                />
                <label htmlFor="timerChallenge" className="ngg-label" style={{ margin: 0 }}>
                  {t('timerChallengeEnableLabel')}
                </label>
              </div>
              {timerChallenge && status === 'playing' && (
                <div
                  aria-live="polite"
                  aria-atomic="true"
                  className="ngg-attempts"
                  style={{ textAlign: 'right' }}
                >
                  <span aria-hidden="true">⏱ {formatSeconds(timeLeft)}</span>
                  <span className="sr-only">{timerAriaText}</span>
                </div>
              )}
              {timerChallenge && status === 'timeout' && (
                <div aria-live="polite" className="ngg-attempts" style={{ textAlign: 'right', color: THEME.error }}>
                  ⏱ {t('timerUp')}
                </div>
              )}
            </div>
          </div>

          <form className="ngg-form" onSubmit={handleSubmit}>
            <label htmlFor="guess" className="ngg-label">
              {t('guessLabel')}
            </label>
            <div className="ngg-input-row">
              <input
                id="guess"
                ref={inputRef}
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                className="ngg-input"
                min={range.min}
                max={range.max}
                placeholder={placeholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={playingDisabled}
                aria-describedby="feedback attempts score"
                aria-invalid={feedback && status === 'playing' ? 'true' : 'false'}
              />
              <button
                type="submit"
                className="ngg-btn"
                style={{ backgroundColor: THEME.primary }}
                disabled={playingDisabled || (input && isRepeatGuess(Number(input)))}
                aria-disabled={playingDisabled || (input && isRepeatGuess(Number(input)))}
                title={input && isRepeatGuess(Number(input)) ? t('repeat_warning', { guess: Number(input) }) : t('submitGuessTitle')}
              >
                {t('guessButton')}
              </button>
            </div>
          </form>

          <div className="ngg-status">
            <p
              id="feedback"
              tabIndex={-1}
              ref={feedbackRef}
              className={`ngg-feedback ${status === 'won' ? 'won' : feedback ? 'hint' : ''} ${status === 'won' && !prefersReducedMotion ? 'ngg-bounce' : ''}`}
              aria-live="polite"
            >
              {feedback || t('feedback_start')}
            </p>

            {/* Repeat warning inline, non-disruptive */}
            {repeatWarning && status === 'playing' && (
              <p className="ngg-attempts" role="alert" aria-live="polite" style={{ color: THEME.error }}>
                {repeatWarning}
              </p>
            )}

            {/* Attempts Counters */}
            <div aria-live="polite" aria-atomic="true">
              <p id="attempts" className="ngg-attempts">
                {t('attempts_used', { count: attempts })}
              </p>
              <p className="ngg-attempts">
                {t('attempts_remaining', { count: attemptsRemaining })} <strong aria-live="polite" ref={attemptsLiveRef}>{attemptsRemaining}</strong>
                <span className="sr-only">{t('attempts_remaining', { count: attemptsRemaining })}</span>
              </p>
            </div>

            {status === 'won' && (
              <>
                <p id="score" className="ngg-attempts" aria-live="polite">
                  {t('score_label', { score })}
                </p>
                {timerChallenge && (
                  <p className="ngg-attempts" aria-live="polite">
                    {t('time_bonus_breakdown', { percent: winTimeBonusPct })}
                  </p>
                )}
                {roundNewlyUnlocked.length > 0 && (
                  <div className="ngg-ach-wrap" aria-live="polite">
                    {roundNewlyUnlocked.map((key) => {
                      const meta = ACHIEVEMENT_META[key];
                      return (
                        <span key={key} className="ngg-ach-chip" role="img" aria-label={`${meta.title} ${t('achievements_unlocked')}`}>
                          {meta.emoji} {meta.title}
                        </span>
                      );
                    })}
                  </div>
                )}
              </>
            )}
            <p className="ngg-attempts" aria-live="polite">
              {t('current_range', { min: range.min, max: range.max, label: t(`difficulty_${difficulty}`) })}
            </p>
          </div>

          {/* Guess History */}
          <section
            aria-labelledby="guess-history-title"
            style={{ marginTop: 12 }}
          >
            <h3 id="guess-history-title" className="ngg-label" style={{ marginBottom: 8 }}>
              {t('history_title')}
            </h3>
            <div className="sr-only" aria-live="polite" aria-atomic="true" ref={historyLiveRef}>
              {historyLive}
            </div>
            <ul
              role="list"
              aria-label={t('history_title')}
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                border: '1px solid var(--border-color, rgba(17,24,39,0.12))',
                borderRadius: 12,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.9))',
                maxHeight: '180px',
                overflow: 'auto'
              }}
            >
              {history.length === 0 ? (
                <li className="ngg-empty" aria-label={t('history_none')}>{t('history_none')}</li>
              ) : (
                history.map((h) => (
                  <li
                    key={h.id}
                    role="listitem"
                    aria-label={t('history_item_aria', { value: h.value, result: h.result })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderBottom: '1px solid rgba(17,24,39,0.08)',
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>#{h.index} — {h.value}</span>
                    <span className={badgeClass(h.result)}>{h.result}</span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <div className="ngg-actions">
            {status === 'won' || status === 'timeout' || status === 'out_of_attempts' ? (
              <>
                <button
                  ref={playAgainRef}
                  className="ngg-btn-secondary"
                  onClick={resetGame}
                  style={{ borderColor: THEME.secondary, color: THEME.secondary }}
                >
                  {status === 'won' ? t('play_again') : t('new_game')}
                </button>
              </>
            ) : (
              <>
                <button
                  className="ngg-btn-secondary"
                  onClick={resetGame}
                  type="button"
                  style={{ borderColor: THEME.secondary, color: THEME.secondary, marginRight: 8 }}
                >
                  {t('reset')}
                </button>

                {/* Hints */}
                <div role="group" aria-label={t('hint_group')} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <button
                    className="ngg-btn-secondary"
                    type="button"
                    onClick={handleParityHint}
                    aria-label={t('hint_parity_aria')}
                    disabled={playingDisabled || hintTypesUsed[HINT_TYPES.parity]}
                    title={t('hint_parity_aria')}
                    style={{ borderColor: THEME.secondary, color: THEME.secondary }}
                  >
                    {t('hint_parity_btn')}
                  </button>
                  <button
                    className="ngg-btn-secondary"
                    type="button"
                    onClick={handleRangeHint}
                    aria-label={t('hint_range_aria')}
                    disabled={playingDisabled || hintTypesUsed[HINT_TYPES.range]}
                    title={t('hint_range_aria')}
                    style={{ borderColor: THEME.secondary, color: THEME.secondary }}
                  >
                    {t('hint_range_btn')}
                  </button>
                  <button
                    className="ngg-btn-secondary"
                    type="button"
                    onClick={handleDigitHint}
                    aria-label={t('hint_digit_aria')}
                    disabled={playingDisabled || hintTypesUsed[HINT_TYPES.digit]}
                    title={t('hint_digit_aria')}
                    style={{ borderColor: THEME.secondary, color: THEME.secondary }}
                  >
                    {t('hint_digit_btn')}
                  </button>
                  <button
                    className="ngg-btn-secondary"
                    type="button"
                    onClick={handleProximityHint}
                    aria-label={t('hint_proximity_aria')}
                    disabled={playingDisabled || hintTypesUsed[HINT_TYPES.proximity]}
                    title={t('hint_proximity_aria')}
                    style={{ borderColor: THEME.secondary, color: THEME.secondary }}
                  >
                    {t('hint_proximity_btn')}
                  </button>
                </div>
                <p className="ngg-attempts" aria-live="polite" style={{ marginTop: 8 }}>
                  {t('hints_note')}
                </p>
              </>
            )}
          </div>
        </section>

        <footer className="ngg-footer">
          <p>
            {t('themeLabel')}: <strong>{THEME.name}</strong>
          </p>
        </footer>
      </main>

      <LeaderboardModal open={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
      <AchievementsModal open={achievementsOpen} onClose={() => setAchievementsOpen(false)} />
      <StatisticsModal open={statisticsOpen} onClose={() => setStatisticsOpen(false)} />
    </div>
  );
}

export default App;
