import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
// Import success sound from src so CRA bundles and serves the correct URL
import successChimeUrl from './assets/success-chime.mp3';
import LeaderboardModal from './LeaderboardModal';
import { addResult } from './leaderboard';

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

// PUBLIC_INTERFACE
// Default timer durations by difficulty (in seconds)
const TIMER_DEFAULTS = {
  easy: 30,
  medium: 45,
  hard: 60,
};

// PUBLIC_INTERFACE
// Volume constant for success sound (0.0 - 1.0)
const SUCCESS_SOUND_VOLUME = 0.6;

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
  /** State
   * Place 'range' before any usage in initializers to avoid TDZ issues.
   */
  const [theme, setTheme] = useState('light'); // kept to respect existing template behavior

  // PUBLIC_INTERFACE
  // difficulty selection persisted in state, default Medium
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

  // Timer Mode
  const [timerMode, setTimerMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DEFAULTS[difficulty]);
  const timerRef = useRef(null);
  const lastAnnouncedRef = useRef(null); // to avoid SR spam

  /** Refs for accessibility and UX */
  const inputRef = useRef(null);
  const feedbackRef = useRef(null);
  const playAgainRef = useRef(null);
  const attemptsLiveRef = useRef(null);

  // Audio: preload success sound element
  const successAudioRef = useRef(null);

  // Apply theme token to document for CSS var selection (light/dark switch retained)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Derived info
  const placeholder = useMemo(
    () => `Enter a number (${range.min}-${range.max})`,
    [range]
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

  /**
   * Compute a proportional score for a win.
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
      // Respect a simple "muted" or reduced motion preference to avoid disruptive feedback
      const prefersReducedMotion =
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (el.muted) return;

      // Set volume once before play
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
  // Reset timer based on current difficulty and (re)start when timerMode is enabled
  function resetAndMaybeStartTimer(nextDifficulty = difficulty) {
    const duration = TIMER_DEFAULTS[nextDifficulty];
    setTimeLeft(duration);
    clearTimer();
    if (timerMode && status === 'playing') {
      // Start ticking every 1s
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            // Timeout reached -> loss state (no success sound here)
            clearTimer();
            setStatus('timeout');
            setFeedback("Time's up! Round over.");
            setTimeout(() => playAgainRef.current?.focus(), 0);
            return 0;
          }
          return next;
        });
      }, 1000);
    }
  }

  // Start/stop timer on mode toggle
  useEffect(() => {
    if (timerMode) {
      resetAndMaybeStartTimer(difficulty);
    } else {
      clearTimer();
    }
    return () => {
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerMode]);

  // Stop timer when status changes out of 'playing' (e.g., win or timeout or out_of_attempts)
  useEffect(() => {
    if (status !== 'playing') {
      clearTimer();
    } else if (timerMode) {
      resetAndMaybeStartTimer(difficulty);
    }
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Update countdown announcement without spamming
  const timerAriaText = useMemo(() => {
    if (!timerMode || status !== 'playing') return '';
    const announce = timeLeft <= 10 || timeLeft % 5 === 0 || timeLeft === TIMER_DEFAULTS[difficulty];
    if (announce && lastAnnouncedRef.current !== timeLeft) {
      lastAnnouncedRef.current = timeLeft;
      return `Time remaining: ${formatSeconds(timeLeft)}.`;
    }
    return '';
  }, [timeLeft, timerMode, status, difficulty]);

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

  // PUBLIC_INTERFACE
  function resetGame() {
    setSecret(generateSecret(range.min, range.max));
    setInput('');
    setFeedback('');
    setAttempts(0);
    setStatus('playing');
    setScore(0);
    resetHints();
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
    resetAndMaybeStartTimer(next);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function validateInput(value) {
    if (value.trim() === '') return { ok: false, message: 'Please enter a number.' };
    const num = Number(value);
    if (Number.isNaN(num)) return { ok: false, message: 'That is not a valid number.' };
    if (!Number.isInteger(num)) return { ok: false, message: 'Please enter a whole number.' };
    if (num < range.min || num > range.max) {
      return { ok: false, message: `Enter a number between ${range.min} and ${range.max}.` };
    }
    return { ok: true, value: num };
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
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (guess === secret) {
      const baseScore = computeScore(nextAttempts, range.max);
      const penalty = Math.min(baseScore, hintCount * HINT_PENALTY);
      const finalScore = Math.max(0, baseScore - penalty);
      setScore(finalScore);

      try {
        addResult({
          timestamp: Date.now(),
          difficulty,
          attempts: nextAttempts,
          score: finalScore,
        });
      } catch {
        // ignore storage errors
      }

      await playSuccessSound();

      setFeedback(`Correct! The number was ${secret}. Your score: ${finalScore}.`);
      setStatus('won');
      setTimeout(() => playAgainRef.current?.focus(), 0);
      clearTimer();
      return;
    }

    // Incorrect guess path
    if (guess < secret) {
      setFeedback('Too low. Try a higher number.');
    } else {
      setFeedback('Too high. Try a lower number.');
    }
    vibrateOnWrongGuess();
    setTimeout(() => feedbackRef.current?.focus(), 0);

    // After processing wrong guess, check attempts remaining and end round if zero
    const remaining = maxAttempts - nextAttempts;
    if (remaining <= 0) {
      setStatus('out_of_attempts');
      setFeedback('Out of attempts! Round over.');
      setTimeout(() => playAgainRef.current?.focus(), 0);
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
    const parity = secret % 2 === 0 ? 'even' : 'odd';
    announceHint(`Hint: The number is ${parity}.`, HINT_TYPES.parity);
  }

  // PUBLIC_INTERFACE
  function handleRangeHint() {
    if (status !== 'playing') return;
    // Create a subrange around the secret within difficulty bounds
    const totalSpan = range.max - range.min + 1;
    // target a subrange about one third of the current span, min width 5, max width totalSpan - 2
    const targetWidth = Math.min(Math.max(5, Math.floor(totalSpan / 3)), Math.max(3, totalSpan - 2));
    const half = Math.floor(targetWidth / 2);
    let start = Math.max(range.min, secret - half);
    let end = start + targetWidth - 1;
    if (end > range.max) {
      end = range.max;
      start = Math.max(range.min, end - targetWidth + 1);
    }
    // Ensure it doesn't collapse to entire range
    if (start === range.min && end === range.max && totalSpan > 5) {
      // shrink by 1 on each side if possible
      start = range.min + 1;
      end = range.max - 1;
    }
    // Ensure secret is inside
    if (secret < start) start = secret;
    if (secret > end) end = secret;

    const text = `Hint: The number is between ${start}–${end}.`;
    announceHint(text, HINT_TYPES.range);
  }

  // PUBLIC_INTERFACE
  function handleDigitHint() {
    if (status !== 'playing') return;
    const s = String(secret);
    const startDigit = s[0];
    // If single-digit, it reveals the number — but allowed by requirement to handle gracefully
    const text =
      s.length === 1
        ? `Hint: It's a single-digit number and starts with ${startDigit}.`
        : `Hint: The number starts with ${startDigit}.`;
    announceHint(text, HINT_TYPES.digit);
  }

  // PUBLIC_INTERFACE
  function handleProximityHint() {
    if (status !== 'playing') return;
    if (attempts <= 0) {
      announceHint('Hint: Make at least one guess to get a proximity hint.', HINT_TYPES.proximity);
      return;
    }
    const lastGuessNum = Number(input) || NaN;
    // When no current input, we infer last guess proximity based on feedback history is not tracked; use last numeric input if valid.
    // If current input invalid, just provide a category based on the most recent valid guess captured via attempts changes.
    // For simplicity, we'll provide generic guidance when we cannot read a valid last guess.
    let msg = 'Hint: ';
    const thresholdVeryClose = 3;
    const thresholdHot = 6;
    const thresholdWarm = 12;
    let lastGuess = null;

    // Attempt to parse from feedback 'Too high/low' doesn't tell the guess; best effort use last entered input if within range
    const parsed = Number(input);
    if (!Number.isNaN(parsed) && Number.isInteger(parsed) && parsed >= range.min && parsed <= range.max) {
      lastGuess = parsed;
    }

    if (lastGuess != null) {
      const delta = Math.abs(secret - lastGuess);
      if (delta === 0) {
        msg += 'You already have the correct number!';
      } else if (delta <= thresholdVeryClose) {
        msg += 'You are very close.';
      } else if (delta <= thresholdHot) {
        msg += 'Hot.';
      } else if (delta <= thresholdWarm) {
        msg += 'Warm.';
      } else {
        msg += 'Cold.';
      }
    } else {
      msg += 'Proximity available after a valid guess.';
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
            <h1 className="ngg-title">Number Guessing Game</h1>
            <p className="ngg-subtitle">
              Guess the secret number between {range.min} and {range.max}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </button>
            <button
              className="theme-toggle"
              onClick={() => setLeaderboardOpen(true)}
              aria-label="Open leaderboard"
            >
              🏆 Leaderboard
            </button>
          </div>
        </div>
      </header>

      <main className="ngg-main">
        <section className="ngg-card" aria-labelledby="game-section-title">
          <div className="ngg-card-gradient" aria-hidden="true" />
          <h2 id="game-section-title" className="sr-only">Game controls</h2>

          {/* Difficulty selector and Timer Mode toggle */}
          <div className="ngg-form" role="group" aria-labelledby="difficulty-label">
            <label id="difficulty-label" htmlFor="difficulty" className="ngg-label">
              Select difficulty
            </label>
            <div className="ngg-input-row" style={{ gridTemplateColumns: '1fr' }}>
              <select
                id="difficulty"
                aria-label="Select difficulty"
                className="ngg-input"
                value={difficulty}
                onChange={handleDifficultyChange}
              >
                <option value="easy">Easy (1-20)</option>
                <option value="medium">Medium (1-50)</option>
                <option value="hard">Hard (1-100)</option>
              </select>
            </div>

            <div className="ngg-input-row" style={{ gridTemplateColumns: 'auto 1fr' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  id="timerMode"
                  type="checkbox"
                  checked={timerMode}
                  onChange={(e) => setTimerMode(e.target.checked)}
                  aria-label="Enable Timer Mode"
                />
                <label htmlFor="timerMode" className="ngg-label" style={{ margin: 0 }}>
                  Enable Timer Mode
                </label>
              </div>
              {timerMode && status === 'playing' && (
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
              {timerMode && status === 'timeout' && (
                <div aria-live="polite" className="ngg-attempts" style={{ textAlign: 'right', color: THEME.error }}>
                  ⏱ Time’s up!
                </div>
              )}
            </div>
          </div>

          <form className="ngg-form" onSubmit={handleSubmit}>
            <label htmlFor="guess" className="ngg-label">
              Enter your guess
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
                disabled={playingDisabled}
              >
                Guess
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
              {feedback || 'Make a guess to begin!'}
            </p>

            {/* Attempts Counters */}
            <div aria-live="polite" aria-atomic="true">
              <p id="attempts" className="ngg-attempts">
                Attempts used: <strong>{attempts}</strong>
              </p>
              <p className="ngg-attempts">
                Attempts remaining: <strong aria-live="polite" ref={attemptsLiveRef}>{attemptsRemaining}</strong>
                <span className="sr-only">{attemptsLiveText}</span>
              </p>
            </div>

            {status === 'won' && (
              <p id="score" className="ngg-attempts" aria-live="polite">
                Score: <strong>{score}</strong>
              </p>
            )}
            <p className="ngg-attempts" aria-live="polite">
              Current range: <strong>{range.min}</strong> to <strong>{range.max}</strong> ({DIFFICULTIES[difficulty].label})
            </p>
          </div>

          <div className="ngg-actions">
            {status === 'won' || status === 'timeout' || status === 'out_of_attempts' ? (
              <>
                <button
                  ref={playAgainRef}
                  className="ngg-btn-secondary"
                  onClick={resetGame}
                  style={{ borderColor: THEME.secondary, color: THEME.secondary }}
                >
                  {status === 'won' ? 'Play Again' : 'New Game'}
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
                  Reset
                </button>

                {/* Hints */}
                <div role="group" aria-label="Hint options" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <button
                    className="ngg-btn-secondary"
                    type="button"
                    onClick={handleParityHint}
                    aria-label="Get parity hint (even or odd)"
                    disabled={playingDisabled || hintTypesUsed[HINT_TYPES.parity]}
                    title="Parity (costs score)"
                    style={{ borderColor: THEME.secondary, color: THEME.secondary }}
                  >
                    Even/Odd
                  </button>
                  <button
                    className="ngg-btn-secondary"
                    type="button"
                    onClick={handleRangeHint}
                    aria-label="Get range hint"
                    disabled={playingDisabled || hintTypesUsed[HINT_TYPES.range]}
                    title="Range (costs score)"
                    style={{ borderColor: THEME.secondary, color: THEME.secondary }}
                  >
                    Range
                  </button>
                  <button
                    className="ngg-btn-secondary"
                    type="button"
                    onClick={handleDigitHint}
                    aria-label="Get starting digit hint"
                    disabled={playingDisabled || hintTypesUsed[HINT_TYPES.digit]}
                    title="Starting digit (costs score)"
                    style={{ borderColor: THEME.secondary, color: THEME.secondary }}
                  >
                    Starts With
                  </button>
                  <button
                    className="ngg-btn-secondary"
                    type="button"
                    onClick={handleProximityHint}
                    aria-label="Get proximity hint"
                    disabled={playingDisabled || hintTypesUsed[HINT_TYPES.proximity]}
                    title="Proximity (costs score)"
                    style={{ borderColor: THEME.secondary, color: THEME.secondary }}
                  >
                    Proximity
                  </button>
                </div>
                <p className="ngg-attempts" aria-live="polite" style={{ marginTop: 8 }}>
                  Hints reduce your score. Each hint type used applies a penalty.
                </p>
              </>
            )}
          </div>
        </section>

        <footer className="ngg-footer">
          <p>
            Theme: <strong>{THEME.name}</strong>
          </p>
        </footer>
      </main>

      <LeaderboardModal open={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
    </div>
  );
}

export default App;
