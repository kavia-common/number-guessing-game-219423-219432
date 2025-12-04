import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

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
  // status: 'playing' | 'won' | 'timeout'
  const [status, setStatus] = useState('playing');
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0); // track score based on attempts and difficulty

  // Hint state: count of hints used, and last hint text
  const [hintCount, setHintCount] = useState(0);
  const [lastHint, setLastHint] = useState('');

  // Timer Mode
  const [timerMode, setTimerMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DEFAULTS[difficulty]);
  const timerRef = useRef(null);
  const lastAnnouncedRef = useRef(null); // to avoid SR spam

  /** Refs for accessibility */
  const inputRef = useRef(null);
  const feedbackRef = useRef(null);
  const playAgainRef = useRef(null);

  // Apply theme token to document for CSS var selection (light/dark switch retained)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  /** Derived info */
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
            // Timeout reached -> loss state
            clearTimer();
            setStatus('timeout');
            setFeedback("Time's up! Round over.");
            // Disable input via status; focus Play Again if visible soon
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
      // restarting timer for current difficulty when enabling
      resetAndMaybeStartTimer(difficulty);
    } else {
      clearTimer();
    }
    // Cleanup on unmount
    return () => {
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerMode]);

  // Stop timer when status changes out of 'playing' (e.g., win or timeout)
  useEffect(() => {
    if (status !== 'playing') {
      clearTimer();
    } else if (timerMode) {
      // if we returned to playing (e.g., after reset), ensure timer is running
      resetAndMaybeStartTimer(difficulty);
    }
    // Cleanup on unmount
    return () => {
      // no-op here; dedicated clear in status change is enough
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Update countdown announcement without spamming: announce at start and each 5s, and every second under 10s
  const timerAriaText = useMemo(() => {
    if (!timerMode || status !== 'playing') return '';
    const announce = timeLeft <= 10 || timeLeft % 5 === 0 || timeLeft === TIMER_DEFAULTS[difficulty];
    if (announce && lastAnnouncedRef.current !== timeLeft) {
      lastAnnouncedRef.current = timeLeft;
      return `Time remaining: ${formatSeconds(timeLeft)}.`;
    }
    return ''; // avoid repeated SR announcements
  }, [timeLeft, timerMode, status, difficulty]);

  // PUBLIC_INTERFACE
  function resetGame() {
    // re-generate secret using the current range
    setSecret(generateSecret(range.min, range.max));
    setInput('');
    setFeedback('');
    setAttempts(0);
    setStatus('playing');
    setScore(0);
    // Reset hints
    setHintCount(0);
    setLastHint('');
    // Reset timer for current difficulty
    resetAndMaybeStartTimer(difficulty);
    // After reset, move focus back to input for keyboard flow
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // PUBLIC_INTERFACE
  function handleDifficultyChange(e) {
    const next = e.target.value;
    setDifficulty(next);
    const preset = DIFFICULTIES[next];
    // Update range first so UI reflects immediately
    setRange({ min: preset.min, max: preset.max });
    // Regenerate secret and reset counters and feedback
    setSecret(generateSecret(preset.min, preset.max));
    setInput('');
    setFeedback('');
    setAttempts(0);
    setStatus('playing');
    setScore(0);
    // Reset hints on difficulty change
    setHintCount(0);
    setLastHint('');
    // Reset timer for new difficulty
    resetAndMaybeStartTimer(next);
    // keep focus accessible to selector change; move focus to input for play flow
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

  function handleSubmit(e) {
    e.preventDefault();
    if (status === 'won' || status === 'timeout') return;

    const validation = validateInput(input);
    if (!validation.ok) {
      setFeedback(validation.message);
      // move focus to feedback for screen readers
      setTimeout(() => feedbackRef.current?.focus(), 0);
      return;
    }

    const guess = validation.value;
    // compute the next attempts synchronously for score calc
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (guess === secret) {
      const baseScore = computeScore(nextAttempts, range.max);
      const penalty = Math.min(baseScore, hintCount * HINT_PENALTY);
      const finalScore = Math.max(0, baseScore - penalty);
      setScore(finalScore);
      setFeedback(`Correct! The number was ${secret}. Your score: ${finalScore}.`);
      setStatus('won');
      // after announcing correctness, focus play again
      setTimeout(() => playAgainRef.current?.focus(), 0);
      clearTimer();
    } else if (guess < secret) {
      setFeedback('Too low. Try a higher number.');
      setTimeout(() => feedbackRef.current?.focus(), 0);
    } else {
      setFeedback('Too high. Try a lower number.');
      setTimeout(() => feedbackRef.current?.focus(), 0);
    }
  }

  // PUBLIC_INTERFACE
  function handleGetHint() {
    if (status === 'won' || status === 'timeout') return;
    // Provide an even/odd hint only, without revealing the number
    const parity = secret % 2 === 0 ? 'even' : 'odd';
    const hintText = `Hint: The number is ${parity}.`;
    setLastHint(hintText);
    setHintCount((c) => c + 1);
    setFeedback(hintText);
    // Focus feedback for SR users
    setTimeout(() => feedbackRef.current?.focus(), 0);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      // form submit handles it
      return;
    }
  }

  return (
    <div className="App" style={{ background: THEME.background, color: THEME.text }}>
      <header className="ngg-header">
        <div className="ngg-header-inner">
          <div className="ngg-title-wrap">
            <h1 className="ngg-title">Number Guessing Game</h1>
            <p className="ngg-subtitle">
              Guess the secret number between {range.min} and {range.max}
            </p>
          </div>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
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
                disabled={status === 'won' || status === 'timeout'}
                aria-describedby="feedback attempts score"
                aria-invalid={feedback && status === 'playing' ? 'true' : 'false'}
              />
              <button
                type="submit"
                className="ngg-btn"
                style={{ backgroundColor: THEME.primary }}
                disabled={status === 'won' || status === 'timeout'}
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
              className={`ngg-feedback ${status === 'won' ? 'won' : feedback ? 'hint' : ''}`}
              aria-live="polite"
            >
              {feedback || 'Make a guess to begin!'}
            </p>
            <p id="attempts" className="ngg-attempts">
              Attempts: <strong>{attempts}</strong>
            </p>
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
            {status === 'won' || status === 'timeout' ? (
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
                <button
                  className="ngg-btn-secondary"
                  onClick={handleGetHint}
                  type="button"
                  aria-label="Get a hint about the secret number"
                  disabled={status === 'won' || status === 'timeout'}
                  style={{ borderColor: THEME.secondary, color: THEME.secondary }}
                >
                  Get Hint
                </button>
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
    </div>
  );
}

export default App;
