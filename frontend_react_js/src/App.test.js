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

test('renders header, controls, difficulty selector, attempts counters, and hint buttons', () => {
  render(<App />);
  expect(screen.getByText(/Number Guessing Game/i)).toBeInTheDocument();
  expect(screen.getByText(/between 1 and 50/i)).toBeInTheDocument();

  expect(screen.getByLabelText(/Select difficulty/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Enter your guess/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Guess/i })).toBeInTheDocument();

  // Attempts counters visible
  expect(screen.getByText(/Attempts used:/i)).toBeInTheDocument();
  expect(screen.getByText(/Attempts remaining:/i)).toBeInTheDocument();

  // Hint buttons exist and are enabled while playing
  expect(screen.getByRole('button', { name: /Even\/Odd/i })).toBeEnabled();
  expect(screen.getByRole('button', { name: /Range/i })).toBeEnabled();
  expect(screen.getByRole('button', { name: /Starts With/i })).toBeEnabled();
  expect(screen.getByRole('button', { name: /Proximity/i })).toBeEnabled();

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

  // hint buttons disabled after win
  expect(screen.getByRole('button', { name: /Even\/Odd/i })).toBeDisabled();
});

test('using parity hint shows text and reduces final score; range/digit/proximity hints also respond; buttons disable after use', () => {
  render(<App />);

  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });

  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });

  // Make an initial guess to enable proximity 'meaningful'
  fireEvent.change(input, { target: { value: '1' } });
  fireEvent.click(guessBtn);

  const parityBtn = screen.getByRole('button', { name: /Even\/Odd/i });
  fireEvent.click(parityBtn);
  expect(screen.getByText(/Hint: The number is (even|odd)/i)).toBeInTheDocument();
  expect(parityBtn).toBeDisabled();

  const rangeBtn = screen.getByRole('button', { name: /Range/i });
  fireEvent.click(rangeBtn);
  const rangeMsg = screen.getByText(/Hint: The number is between/i);
  expect(rangeMsg).toBeInTheDocument();
  // the subrange should not trivially equal full range
  expect(rangeMsg.textContent).not.toMatch(/between 1–20$/i);
  expect(rangeBtn).toBeDisabled();

  const digitBtn = screen.getByRole('button', { name: /Starts With/i });
  fireEvent.click(digitBtn);
  expect(screen.getByText(/Hint: The number (starts with|single-digit)/i)).toBeInTheDocument();
  expect(digitBtn).toBeDisabled();

  const proxBtn = screen.getByRole('button', { name: /Proximity/i });
  fireEvent.click(proxBtn);
  expect(screen.getByText(/Hint:/i)).toBeInTheDocument();
  expect(proxBtn).toBeDisabled();

  const scoreWithHints = bruteForceWinAndGetScoreText(20);
  expect(scoreWithHints).not.toBeNull();

  // Play again and win without hints to compare
  const playAgain = screen.getByRole('button', { name: /Play Again/i });
  fireEvent.click(playAgain);

  const scoreNoHints = bruteForceWinAndGetScoreText(20);
  expect(scoreNoHints).not.toBeNull();

  const extractNumber = (txt) => {
    const m = txt.match(/(\d+)/);
    return m ? Number(m[1]) : 0;
  };
  expect(extractNumber(scoreNoHints)).toBeGreaterThanOrEqual(extractNumber(scoreWithHints));
});

test('hint state resets on New Game and on difficulty change', () => {
  render(<App />);

  const parityBtn = screen.getByRole('button', { name: /Even\/Odd/i });
  fireEvent.click(parityBtn);
  expect(parityBtn).toBeDisabled();

  // Reset -> buttons enabled again
  const resetBtn = screen.getByRole('button', { name: /Reset/i });
  fireEvent.click(resetBtn);
  expect(screen.getByRole('button', { name: /Even\/Odd/i })).toBeEnabled();

  // Use and change difficulty -> buttons enabled again
  fireEvent.click(screen.getByRole('button', { name: /Even\/Odd/i }));
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'hard' } });
  expect(screen.getByRole('button', { name: /Even\/Odd/i })).toBeEnabled();
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
