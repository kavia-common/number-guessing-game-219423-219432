import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';

// Helper to input and submit a guess
function submitGuess(val) {
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });
  fireEvent.change(input, { target: { value: String(val) } });
  fireEvent.click(guessBtn);
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test('history records guesses with correct labels and accessible list', () => {
  render(<App />);

  // Make two distinct guesses
  submitGuess(10);
  // Feedback should be either Too low or Too high
  let fb = screen.getByText(/Too low|Too high/i);
  expect(fb).toBeInTheDocument();

  submitGuess(20);
  fb = screen.getByText(/Too low|Too high|Correct!/i);
  expect(fb).toBeInTheDocument();

  // History section present
  expect(screen.getByText(/Guess History/i)).toBeInTheDocument();

  // There should be at least two list items now
  const items = screen.getAllByRole('listitem');
  expect(items.length).toBeGreaterThanOrEqual(2);

  // Each item should include a badge with result text
  // We can't know which is high/low/correct deterministically, but ensure it includes one of them
  const itemLabels = items.map((el) => el.getAttribute('aria-label') || el.textContent);
  const hasExpectedLabels = itemLabels.some((t) => /too high|too low|correct/i.test(t || ''));
  expect(hasExpectedLabels).toBe(true);

  // aria-live polite region should be present
  expect(screen.getByLabelText(/List of previous guesses/i)).toBeInTheDocument();
});

test('repeated guesses show inline warning, do not decrement attempts, and do not duplicate entries', () => {
  render(<App />);

  // First unique guess
  submitGuess(5);

  const attemptsUsedEl = screen.getByText(/Attempts used:/i);
  const getUsed = () => {
    const m = attemptsUsedEl.textContent.match(/(\d+)/);
    return m ? Number(m[1]) : 0;
  };
  expect(getUsed()).toBe(1);

  // Repeat the same guess
  submitGuess(5);

  // Attempts should remain 1
  expect(getUsed()).toBe(1);

  // Inline warning visible
  expect(screen.getByText(/You already guessed 5/i)).toBeInTheDocument();

  // History should contain only one entry for "5"
  const items = screen.getAllByRole('listitem');
  const count5 = items.filter((li) => (li.textContent || '').includes('#1 — 5') || (li.textContent || '').includes('— 5')).length;
  expect(count5).toBe(1);
});

test('history resets on New Game and difficulty change', () => {
  render(<App />);
  submitGuess(7);

  // Ensure there is at least one history entry
  expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);

  // Reset via Reset button while playing
  fireEvent.click(screen.getByRole('button', { name: /Reset/i }));
  // History should be empty
  expect(screen.getByText(/No guesses yet/i)).toBeInTheDocument();

  // Make a guess again and then change difficulty
  submitGuess(3);
  expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);

  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'hard' } });
  expect(screen.getByText(/No guesses yet/i)).toBeInTheDocument();
});

test('history integrates with timer mode and loss/win without regressions', () => {
  render(<App />);

  // Enable Timer Challenge and make a couple of guesses
  fireEvent.click(screen.getByLabelText(/Enable Timer Challenge/i));
  submitGuess(1);
  submitGuess(2);

  // Two items expected
  const countBefore = screen.getAllByRole('listitem').length;
  expect(countBefore).toBeGreaterThanOrEqual(2);

  // Advance timer to cause timeout loss on easy? Ensure we are in default Medium; switch to easy for deterministic 30s
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });
  fireEvent.click(screen.getByLabelText(/Enable Timer Challenge/i));
  act(() => {
    jest.advanceTimersByTime(30000);
  });

  // Timeout loss shows new game; history should not record anything further after timeout
  expect(screen.getByText(/Time’s up!|Time's up!/i)).toBeInTheDocument();

  // Start New Game and ensure history cleared
  fireEvent.click(screen.getByRole('button', { name: /New Game/i }));
  expect(screen.getByText(/No guesses yet/i)).toBeInTheDocument();

  // Now brute-force a quick win and ensure the final correct guess is recorded
  let found = false;
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });
  for (let g = 1; g <= 20; g++) {
    fireEvent.change(input, { target: { value: String(g) } });
    fireEvent.click(guessBtn);
    const feedbackEl = screen.getByText(/Too low|Too high|Correct!/i);
    if (/Correct!/i.test(feedbackEl.textContent)) {
      found = true;
      break;
    }
  }
  expect(found).toBe(true);

  // Ensure a 'correct' label appears in history
  const items = screen.getAllByRole('listitem');
  const hasCorrect = items.some((li) => /correct/i.test(li.getAttribute('aria-label') || li.textContent || ''));
  expect(hasCorrect).toBe(true);
});
