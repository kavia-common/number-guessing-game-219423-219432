import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';

// Mock Audio and vibrate APIs to prevent flakiness and allow call assertions
class MockAudioElement {
  constructor() {
    this.volume = 1;
    this.muted = false;
    this.src = '';
    this.play = jest.fn().mockResolvedValue();
    this.pause = jest.fn();
    this.addEventListener = jest.fn();
    this.removeEventListener = jest.fn();
    this.load = jest.fn();
  }
}
beforeAll(() => {
  Object.defineProperty(window, 'HTMLMediaElement', {
    value: class {},
  });
  Object.defineProperty(window.navigator, 'vibrate', {
    value: jest.fn(),
    configurable: true,
  });
});

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

test('renders header, controls, difficulty selector, and attempts counters', () => {
  render(<App />);
  expect(screen.getByText(/Number Guessing Game/i)).toBeInTheDocument();
  expect(screen.getByText(/between 1 and 50/i)).toBeInTheDocument();

  expect(screen.getByLabelText(/Select difficulty/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Enter your guess/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Guess/i })).toBeInTheDocument();

  // Attempts counters visible
  expect(screen.getByText(/Attempts used:/i)).toBeInTheDocument();
  expect(screen.getByText(/Attempts remaining:/i)).toBeInTheDocument();

  // Hint button exists and is enabled while playing
  const hintBtn = screen.getByRole('button', { name: /Get Hint/i });
  expect(hintBtn).toBeInTheDocument();
  expect(hintBtn).toBeEnabled();

  // Timer Mode toggle present
  expect(screen.getByLabelText(/Enable Timer Mode/i)).toBeInTheDocument();
});

test('score is hidden initially and appears after a correct guess', () => {
  render(<App />);

  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });
  expect(screen.queryByText(/Score:/i)).toBeNull();

  for (let g = 1; g <= 20; g++) {
    fireEvent.change(input, { target: { value: String(g) } });
    fireEvent.click(guessBtn);
    const feedback = screen.getByText(/Too low|Too high|Correct!/i);
    if (/Correct!/i.test(feedback.textContent)) {
      break;
    }
  }
  expect(screen.getByText(/Score:/i)).toBeInTheDocument();

  const hintBtn = screen.getByRole('button', { name: /Get Hint/i });
  expect(hintBtn).toBeDisabled();
});

test('using hint shows hint text and reduces final score compared to no hint with similar attempts', () => {
  render(<App />);

  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });

  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });
  const hintBtn = screen.getByRole('button', { name: /Get Hint/i });

  fireEvent.change(input, { target: { value: '1' } });
  fireEvent.click(guessBtn);

  fireEvent.click(hintBtn);
  expect(screen.getByText(/Hint: The number is (even|odd)/i)).toBeInTheDocument();

  const scoreTextAfterHintRun = bruteForceWinAndGetScoreText(20);
  expect(scoreTextAfterHintRun).not.toBeNull();

  const playAgain = screen.getByRole('button', { name: /Play Again/i });
  fireEvent.click(playAgain);

  fireEvent.change(input, { target: { value: '1' } });
  fireEvent.click(guessBtn);

  const scoreTextNoHintRun = bruteForceWinAndGetScoreText(20);
  expect(scoreTextNoHintRun).not.toBeNull();

  const extractNumber = (txt) => {
    const m = txt.match(/(\d+)/);
    return m ? Number(m[1]) : 0;
  };
  const withHint = extractNumber(scoreTextAfterHintRun);
  const withoutHint = extractNumber(scoreTextNoHintRun);

  expect(withoutHint).toBeGreaterThanOrEqual(withHint);
});

test('hint state resets on New Game and on difficulty change', () => {
  render(<App />);

  const hintBtn = screen.getByRole('button', { name: /Get Hint/i });
  fireEvent.click(hintBtn);
  expect(screen.getByText(/Hint: The number is (even|odd)/i)).toBeInTheDocument();

  const resetBtn = screen.getByRole('button', { name: /Reset/i });
  fireEvent.click(resetBtn);
  expect(screen.getByText(/Make a guess to begin!/i)).toBeInTheDocument();

  fireEvent.click(hintBtn);
  expect(screen.getByText(/Hint: The number is (even|odd)/i)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'hard' } });
  expect(screen.getByText(/Make a guess to begin!/i)).toBeInTheDocument();
});

test('Timer Mode countdown displays and stops on win; no score on timeout', () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });

  fireEvent.click(screen.getByLabelText(/Enable Timer Mode/i));
  expect(screen.getByText(/⏱/)).toBeInTheDocument();

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

  act(() => {
    jest.advanceTimersByTime(5000);
  });
  expect(screen.getByText(/Score:/i)).toBeInTheDocument();
});

test('Timer Mode timeout transitions to loss state and disables inputs; score not shown', () => {
  render(<App />);

  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });
  fireEvent.click(screen.getByLabelText(/Enable Timer Mode/i));

  act(() => {
    jest.advanceTimersByTime(30000);
  });

  expect(screen.getByText(/Time’s up!|Time's up!/i)).toBeInTheDocument();
  expect(screen.queryByText(/Score:/i)).toBeNull();
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });
  expect(input).toBeDisabled();
  expect(guessBtn).toBeDisabled();

  expect(screen.getByRole('button', { name: /New Game/i })).toBeInTheDocument();
});

test('Timer resets on New Game and on difficulty change', () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });
  fireEvent.click(screen.getByLabelText(/Enable Timer Mode/i));

  act(() => {
    jest.advanceTimersByTime(5000);
  });

  fireEvent.click(screen.getByRole('button', { name: /Reset/i }));
  act(() => {
    jest.advanceTimersByTime(1000);
  });
  expect(screen.queryByText(/Time’s up!|Time's up!/i)).toBeNull();

  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'hard' } });
  act(() => {
    jest.advanceTimersByTime(1000);
  });
  expect(screen.queryByText(/Time’s up!|Time's up!/i)).toBeNull();
});
