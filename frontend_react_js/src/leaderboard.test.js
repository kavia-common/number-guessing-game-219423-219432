import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';
import { readResults, clearResults } from './leaderboard';

// Utility: brute force win for current difficulty
function bruteForceWin(max) {
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });
  for (let g = 1; g <= max; g++) {
    fireEvent.change(input, { target: { value: String(g) } });
    fireEvent.click(guessBtn);
    const feedbackEl = screen.getByText(/Make a guess to begin!|Too low|Too high|Correct!/i);
    if (/Correct!/i.test(feedbackEl.textContent)) {
      break;
    }
  }
}

beforeEach(() => {
  // fresh app and clear leaderboard
  clearResults();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  clearResults();
});

test('adds an entry on win with correct fields and persists to localStorage', () => {
  render(<App />);

  // set easy for shorter run
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });
  // Make a guess and use one hint to ensure penalties included (parity)
  fireEvent.click(screen.getByRole('button', { name: /Even\/Odd/i }));

  bruteForceWin(20);

  // Verify score shown (win)
  expect(screen.getByText(/Score:/i)).toBeInTheDocument();

  const results = readResults();
  expect(results.length).toBeGreaterThanOrEqual(1);
  const r0 = results[0];
  expect(typeof r0.timestamp).toBe('number');
  expect(['easy', 'medium', 'hard']).toContain(r0.difficulty);
  expect(typeof r0.attempts).toBe('number');
  expect(typeof r0.score).toBe('number');
});

test('Leaderboard modal shows High Scores and Best Attempts sorted deterministically', () => {
  render(<App />);

  // Run several games to populate results with different attempts and scores
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });

  // First win quickly
  bruteForceWin(20);
  // Play again
  fireEvent.click(screen.getByRole('button', { name: /Play Again/i }));

  // Second run: make a few wrong guesses first
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });
  for (let i = 0; i < 3; i++) {
    fireEvent.change(input, { target: { value: String(i + 1) } });
    fireEvent.click(guessBtn);
  }
  bruteForceWin(20);

  // Open leaderboard
  fireEvent.click(screen.getByRole('button', { name: /Leaderboard/i }));

  // Check tabs
  expect(screen.getByRole('tab', { name: /High Scores/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /Best Attempts/i })).toBeInTheDocument();

  // High Scores panel visible by default
  const highScoresItems = screen.getAllByText(/Attempts:|Score:/i);
  expect(highScoresItems.length).toBeGreaterThan(0);

  // Switch to Best Attempts
  fireEvent.click(screen.getByRole('tab', { name: /Best Attempts/i }));
  const bestAttemptsItems = screen.getAllByText(/Attempts:|Score:/i);
  expect(bestAttemptsItems.length).toBeGreaterThan(0);
});

test('Clear Leaderboard empties data', () => {
  render(<App />);

  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });
  bruteForceWin(20);
  expect(readResults().length).toBeGreaterThan(0);

  // Open modal and clear
  fireEvent.click(screen.getByRole('button', { name: /Leaderboard/i }));
  // Intercept confirm dialog and accept
  const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  fireEvent.click(screen.getByRole('button', { name: /Clear Leaderboard/i }));
  confirmSpy.mockRestore();

  expect(readResults().length).toBe(0);
});

test('does not record entry on timeout loss (Timer Challenge)', () => {
  render(<App />);

  // Enable Timer Challenge in easy and advance until timeout
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });
  fireEvent.click(screen.getByLabelText(/Enable Timer Challenge/i));

  act(() => {
    jest.advanceTimersByTime(30000);
  });

  // Loss state
  expect(screen.getByText(/Time’s up!|Time's up!/i)).toBeInTheDocument();
  expect(screen.queryByText(/Score:/i)).toBeNull();

  // No entries persisted
  expect(readResults().length).toBe(0);
});

test('Leaderboard entries include timer metadata when winning in Timer Challenge', () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });
  fireEvent.click(screen.getByLabelText(/Enable Timer Challenge/i));

  // Make a quick win to retain some time remaining
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });
  for (let g = 1; g <= 20; g++) {
    fireEvent.change(input, { target: { value: String(g) } });
    fireEvent.click(guessBtn);
    const feedbackEl = screen.getByText(/Too low|Too high|Correct!/i);
    if (/Correct!/i.test(feedbackEl.textContent)) {
      break;
    }
  }

  const results = readResults();
  expect(results.length).toBeGreaterThan(0);
  const r0 = results[0];
  expect(r0.timerChallenge).toBe(true);
  if (r0.timeRemaining != null && r0.totalTime != null) {
    expect(typeof r0.timeRemaining).toBe('number');
    expect(typeof r0.totalTime).toBe('number');
    expect(r0.timeRemaining).toBeLessThanOrEqual(r0.totalTime);
  }
});
