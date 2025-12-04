import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';
import { readAchievements } from './achievements';

// Helpers
function bruteForceWin(max) {
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
  // Clear achievements storage
  try { window.localStorage.removeItem('ngg_achievements'); } catch {}
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test('First-Try Win unlocks when attemptsUsed === 1', () => {
  render(<App />);
  // Ensure easy for small range
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });

  // Try to win in exactly one attempt by brute force restarting until first guess hits
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });

  let unlocked = false;
  for (let tries = 0; tries < 30; tries++) {
    // Always guess 1; if not correct, reset and try again; eventually it will be 1
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.click(guessBtn);
    const feedback = screen.getByText(/Too low|Too high|Correct!/i);
    if (/Correct!/i.test(feedback.textContent)) {
      unlocked = true;
      break;
    } else {
      // reset and try another round
      fireEvent.click(screen.getByRole('button', { name: /New Game|Play Again|Reset/i }));
    }
  }
  expect(unlocked).toBe(true);

  const ach = readAchievements();
  expect(ach.firstTryWin).toBe(true);

  // UI toast or chip indication
  expect(screen.getByText(/Score:/i)).toBeInTheDocument();
});

test('No-Hints Win unlocks when no hints used', () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });

  // Brute force win without touching hint buttons
  expect(bruteForceWin(20)).toBe(true);

  const ach = readAchievements();
  expect(ach.noHintsWin).toBe(true);
});

test('Achievements persist via localStorage across reloads', () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });

  // Unlock no-hints by winning
  expect(bruteForceWin(20)).toBe(true);
  expect(readAchievements().noHintsWin).toBe(true);

  // Re-render app (simulate reload)
  render(<App />);
  // Achievements modal should show unlocked state
  fireEvent.click(screen.getByRole('button', { name: /Achievements/i }));
  expect(screen.getByText(/Achievements/i)).toBeInTheDocument();
  expect(screen.getByText(/Unlocked: /i) || screen.getByText(/Unlocked/i)).toBeInTheDocument();
});

test('Achievements do not unlock on timeout/loss', () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });

  // Enable timer mode and cause timeout
  fireEvent.click(screen.getByLabelText(/Enable Timer Mode/i));
  act(() => { jest.advanceTimersByTime(30000); });

  expect(screen.getByText(/Time’s up!|Time's up!/i)).toBeInTheDocument();

  const ach = readAchievements();
  expect(ach.firstTryWin).toBe(false);
  expect(ach.noHintsWin).toBe(false);
});

test('Multiple achievements can unlock in the same win', () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });

  // Attempt to win on first try without hints: guess 1, if not correct, reset and repeat
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });

  for (let tries = 0; tries < 30; tries++) {
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.click(guessBtn);
    const feedback = screen.getByText(/Too low|Too high|Correct!/i);
    if (/Correct!/i.test(feedback.textContent)) {
      break;
    } else {
      fireEvent.click(screen.getByRole('button', { name: /New Game|Play Again|Reset/i }));
    }
  }

  const ach = readAchievements();
  expect(ach.firstTryWin).toBe(true);
  expect(ach.noHintsWin).toBe(true);

  // UI should show score and may have achievement chips
  expect(screen.getByText(/Score:/i)).toBeInTheDocument();
});
