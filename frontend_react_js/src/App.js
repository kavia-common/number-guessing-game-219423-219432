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
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState('playing'); // 'playing' | 'won'
  const [score, setScore] = useState(0); // track score based on attempts and difficulty

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

  // PUBLIC_INTERFACE
  function resetGame() {
    // re-generate secret using the current range
    setSecret(generateSecret(range.min, range.max));
    setInput('');
    setFeedback('');
    setAttempts(0);
    setStatus('playing');
    setScore(0);
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
    if (status === 'won') return;

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
      const finalScore = computeScore(nextAttempts, range.max);
      setScore(finalScore);
      setFeedback(`Correct! The number was ${secret}. Your score: ${finalScore}.`);
      setStatus('won');
      // after announcing correctness, focus play again
      setTimeout(() => playAgainRef.current?.focus(), 0);
    } else if (guess < secret) {
      setFeedback('Too low. Try a higher number.');
      setTimeout(() => feedbackRef.current?.focus(), 0);
    } else {
      setFeedback('Too high. Try a lower number.');
      setTimeout(() => feedbackRef.current?.focus(), 0);
    }
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

          {/* Difficulty selector */}
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
                disabled={status === 'won'}
                aria-describedby="feedback attempts score"
                aria-invalid={feedback && status !== 'won' ? 'true' : 'false'}
              />
              <button
                type="submit"
                className="ngg-btn"
                style={{ backgroundColor: THEME.primary }}
                disabled={status === 'won'}
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
            {status === 'won' ? (
              <button
                ref={playAgainRef}
                className="ngg-btn-secondary"
                onClick={resetGame}
                style={{ borderColor: THEME.secondary, color: THEME.secondary }}
              >
                Play Again
              </button>
            ) : (
              <button
                className="ngg-btn-secondary"
                onClick={resetGame}
                type="button"
                style={{ borderColor: THEME.secondary, color: THEME.secondary }}
              >
                Reset
              </button>
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
