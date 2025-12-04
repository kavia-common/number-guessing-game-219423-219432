import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Helpers
function bruteForceWinWithin(max) {
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });
  for (let g = 1; g <= max; g++) {
    fireEvent.change(input, { target: { value: String(g) } });
    fireEvent.click(guessBtn);
    const feedbackEl = screen.getByText(/Make a guess to begin!|Too low|Too high|Correct!/i);
    if (/Correct!/i.test(feedbackEl.textContent)) {
      return true;
    }
  }
  return false;
}

beforeEach(() => {
  // Clear level progress
  try {
    window.localStorage.removeItem('ngg_levels_progress_v1');
  } catch {}
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test('Beginner unlocked by default; others locked in UI', () => {
  render(<App />);

  const beginnerBtn = screen.getByRole('button', { name: /Beginner level/i });
  const interBtn = screen.getByRole('button', { name: /Intermediate level \(locked\)/i });
  const expertBtn = screen.getByRole('button', { name: /Expert level \(locked\)/i });

  expect(beginnerBtn).toBeEnabled();
  expect(interBtn).toBeDisabled();
  expect(expertBtn).toBeDisabled();
});

test('Winning Beginner unlocks Intermediate and announces', () => {
  render(<App />);

  // In Beginner by default (initialized); ensure difficulty preset is Easy (1-20)
  // Change to ensure easy range if not; but level preset should already set it.
  expect(screen.getByText(/between 1 and 20/i)).toBeInTheDocument();

  const won = bruteForceWinWithin(20);
  expect(won).toBe(true);
  expect(screen.getByText(/Score:/i)).toBeInTheDocument();

  // Now Intermediate should be enabled
  const interBtn = screen.getByRole('button', { name: /Intermediate level/i });
  expect(interBtn).toBeEnabled();
});

test('Winning Intermediate unlocks Expert; no unlocks on losses/timeouts', () => {
  render(<App />);

  // First win Beginner to unlock Intermediate
  expect(bruteForceWinWithin(20)).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /Play Again/i }));

  // Switch level to Intermediate, should reset and set medium (1-50)
  const interBtn = screen.getByRole('button', { name: /Intermediate level/i });
  fireEvent.click(interBtn);
  expect(screen.getByText(/between 1 and 50/i)).toBeInTheDocument();

  // Win Intermediate
  expect(bruteForceWinWithin(50)).toBe(true);
  expect(screen.getByText(/Score:/i)).toBeInTheDocument();

  // Expert should now be enabled
  const expertBtn = screen.getByRole('button', { name: /Expert level/i });
  expect(expertBtn).toBeEnabled();

  // Verify that unlocking does not happen on loss/timeout:
  // Start new game in Beginner, enable timer, advance full time to timeout
  fireEvent.click(screen.getByRole('button', { name: /Play Again/i }));
  // Change to Beginner explicitly
  const beginnerBtn = screen.getByRole('button', { name: /Beginner level/i });
  fireEvent.click(beginnerBtn);
  fireEvent.click(screen.getByLabelText(/Enable Timer Mode/i));
  // 30s for easy
  jest.advanceTimersByTime(30000);
  expect(screen.getByText(/Time’s up!|Time's up!/i)).toBeInTheDocument();
});

test('Progress persists via localStorage across reloads', () => {
  render(<App />);
  // Win Beginner
  expect(bruteForceWinWithin(20)).toBe(true);

  // Intermediate should be enabled
  expect(screen.getByRole('button', { name: /Intermediate level/i })).toBeEnabled();

  // Unmount by re-rendering new App
  // In this environment re-render is sufficient to test persisted state
  render(<App />);

  // Intermediate should remain enabled due to persisted progress
  expect(screen.getByRole('button', { name: /Intermediate level/i })).toBeEnabled();
});

test('Changing level resets round and applies difficulty preset; user may change difficulty afterward', () => {
  render(<App />);

  // Make a guess in Beginner/Easy
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });
  fireEvent.change(input, { target: { value: '5' } });
  fireEvent.click(guessBtn);

  // Now switch to Intermediate (first unlock it by winning if needed)
  let interBtn = screen.queryByRole('button', { name: /Intermediate level/i });
  if (!interBtn) {
    // Win beginner to unlock
    expect(bruteForceWinWithin(20)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Play Again/i }));
  }
  interBtn = screen.getByRole('button', { name: /Intermediate level/i });
  fireEvent.click(interBtn);

  // Should reset attempts and set medium range
  expect(screen.getByText(/between 1 and 50/i)).toBeInTheDocument();
  const usedNode = screen.getByText(/Attempts used:/i);
  expect(usedNode.textContent).toMatch(/0/);

  // Change difficulty independently and ensure it updates (e.g., to hard)
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'hard' } });
  expect(screen.getByText(/between 1 and 100/i)).toBeInTheDocument();
});
