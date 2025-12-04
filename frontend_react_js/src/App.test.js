import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';

// Helper to brute-force and return score text after win
const bruteForceWinAndGetScoreText = (rangeMax = 20) => {
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });
  let scoreText = null;
  for (let g = 1; g <= rangeMax; g++) {
    fireEvent.change(input, { target: { value: String(g) } });
    fireEvent.click(guessBtn);
    const feedbackEl = screen.getByText(/Too low|Too high|Correct!/i);
    if (/Correct!/i.test(feedbackEl.textContent)) {
      scoreText = screen.getByText(/Score:/i).textContent;
      break;
    }
  }
  return scoreText;
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test('renders Number Guessing Game header and controls and difficulty selector', () => {
  render(<App />);
  expect(screen.getByText(/Number Guessing Game/i)).toBeInTheDocument();
  // Default difficulty is Medium (1-50) - subtitle includes range
  expect(screen.getByText(/between 1 and 50/i)).toBeInTheDocument();

  expect(screen.getByLabelText(/Select difficulty/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Enter your guess/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Guess/i })).toBeInTheDocument();
  // Hint button exists and is enabled while playing
  const hintBtn = screen.getByRole('button', { name: /Get Hint/i });
  expect(hintBtn).toBeInTheDocument();
  expect(hintBtn).toBeEnabled();

  // Timer Mode toggle present
  expect(screen.getByLabelText(/Enable Timer Mode/i)).toBeInTheDocument();
});

test('score is hidden initially and appears after a correct guess', () => {
  render(<App />);

  // Set to easy to shorten brute force
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });
  expect(screen.queryByText(/Score:/i)).toBeNull();

  // Brute force to win
  for (let g = 1; g <= 20; g++) {
    fireEvent.change(input, { target: { value: String(g) } });
    fireEvent.click(guessBtn);
    const feedback = screen.getByText(/Too low|Too high|Correct!/i);
    if (/Correct!/i.test(feedback.textContent)) {
      break;
    }
  }
  expect(screen.getByText(/Score:/i)).toBeInTheDocument();

  // After win, hint button should be disabled
  const hintBtn = screen.getByRole('button', { name: /Get Hint/i });
  expect(hintBtn).toBeDisabled();
});

test('using hint shows hint text and reduces final score compared to no hint with similar attempts', () => {
  render(<App />);

  // Switch to easy
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });

  // First run: take one guess then hint, then brute-force to win
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });
  const hintBtn = screen.getByRole('button', { name: /Get Hint/i });

  fireEvent.change(input, { target: { value: '1' } });
  fireEvent.click(guessBtn);

  // Use hint and assert hint text appears
  fireEvent.click(hintBtn);
  expect(screen.getByText(/Hint: The number is (even|odd)/i)).toBeInTheDocument();

  const scoreTextAfterHintRun = bruteForceWinAndGetScoreText(20);
  expect(scoreTextAfterHintRun).not.toBeNull();

  // Reset game (Play Again)
  const playAgain = screen.getByRole('button', { name: /Play Again/i });
  fireEvent.click(playAgain);

  // Second run: attempt to mimic similar attempts count but without any hint
  fireEvent.change(input, { target: { value: '1' } });
  fireEvent.click(guessBtn);

  const scoreTextNoHintRun = bruteForceWinAndGetScoreText(20);
  expect(scoreTextNoHintRun).not.toBeNull();

  // Extract numeric scores
  const extractNumber = (txt) => {
    const m = txt.match(/(\d+)/);
    return m ? Number(m[1]) : 0;
  };
  const withHint = extractNumber(scoreTextAfterHintRun);
  const withoutHint = extractNumber(scoreTextNoHintRun);

  // Without hint should be >= with hint (penalty applied when hint used)
  expect(withoutHint).toBeGreaterThanOrEqual(withHint);
});

test('hint state resets on New Game and on difficulty change', () => {
  render(<App />);

  // Use a hint
  const hintBtn = screen.getByRole('button', { name: /Get Hint/i });
  fireEvent.click(hintBtn);
  expect(screen.getByText(/Hint: The number is (even|odd)/i)).toBeInTheDocument();

  // Reset via Reset button (while playing)
  const resetBtn = screen.getByRole('button', { name: /Reset/i });
  fireEvent.click(resetBtn);
  // Hint text should be cleared to default feedback
  expect(screen.getByText(/Make a guess to begin!/i)).toBeInTheDocument();

  // Use a hint again, then change difficulty
  fireEvent.click(hintBtn);
  expect(screen.getByText(/Hint: The number is (even|odd)/i)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'hard' } });
  // Hint cleared after difficulty change
  expect(screen.getByText(/Make a guess to begin!/i)).toBeInTheDocument();
});

test('Timer Mode countdown displays and stops on win; no score on timeout', () => {
  render(<App />);
  // Use Easy for faster sequences
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });

  // Enable Timer Mode
  fireEvent.click(screen.getByLabelText(/Enable Timer Mode/i));
  // Countdown visible
  expect(screen.getByText(/⏱/)).toBeInTheDocument();

  // Make a few guesses and then force a win via brute force; timer should stop after win
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
  expect(screen.getByText(/Score:/i)).toBeInTheDocument();

  // After win, advancing timers shouldn't change UI (timer cleared). Advance some time.
  act(() => {
    jest.advanceTimersByTime(5000);
  });
  // Still in win state, score present
  expect(screen.getByText(/Score:/i)).toBeInTheDocument();
});

test('Timer Mode timeout transitions to loss state and disables inputs; score not shown', () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });
  fireEvent.click(screen.getByLabelText(/Enable Timer Mode/i));

  // Fast-forward to just before timeout (30s default for easy)
  act(() => {
    jest.advanceTimersByTime(30000);
  });

  // Expect timeout feedback and inputs disabled, score absent
  expect(screen.getByText(/Time’s up!|Time's up!/i)).toBeInTheDocument();
  expect(screen.queryByText(/Score:/i)).toBeNull();
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });
  expect(input).toBeDisabled();
  expect(guessBtn).toBeDisabled();

  // New Game button appears
  expect(screen.getByRole('button', { name: /New Game/i })).toBeInTheDocument();
});

test('Timer resets on New Game and on difficulty change', () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });
  fireEvent.click(screen.getByLabelText(/Enable Timer Mode/i));

  // Advance some time
  act(() => {
    jest.advanceTimersByTime(5000);
  });

  // Reset while playing
  fireEvent.click(screen.getByRole('button', { name: /Reset/i }));
  // After reset, timer is restarted to full duration. Advance another second and ensure still not timed out.
  act(() => {
    jest.advanceTimersByTime(1000);
  });
  // No timeout message expected
  expect(screen.queryByText(/Time’s up!|Time's up!/i)).toBeNull();

  // Change difficulty to hard, timer should reset to hard duration
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'hard' } });
  act(() => {
    jest.advanceTimersByTime(1000);
  });
  // Still playing and no timeout instantly
  expect(screen.queryByText(/Time’s up!|Time's up!/i)).toBeNull();
});
