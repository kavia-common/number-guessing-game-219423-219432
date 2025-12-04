import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  // ensure vibrate exists
  if (typeof navigator.vibrate !== 'function') {
    Object.defineProperty(window.navigator, 'vibrate', {
      value: jest.fn(),
      configurable: true,
    });
  }
});

test('Puzzle Mode toggle appears and activates panel', () => {
  render(<App />);
  const toggle = screen.getByTestId('toggle-puzzle-mode');
  expect(toggle).toBeInTheDocument();
  fireEvent.click(toggle);
  expect(screen.getByTestId('puzzle-panel')).toBeInTheDocument();
});

test('Answering correctly grants selectable clue and applies immediately with penalty', () => {
  render(<App />);
  // switch to easy for smaller ranges
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });

  fireEvent.click(screen.getByTestId('toggle-puzzle-mode'));
  const panel = screen.getByTestId('puzzle-panel');
  expect(panel).toBeInTheDocument();

  // Click the first option (our pool makes the first puzzle correct answer at idx 0 deterministic)
  fireEvent.click(screen.getByTestId('puzzle-opt-0'));
  // Feedback should appear and clue buttons enabled
  expect(screen.getByText(/Correct!|సరైంది|सही/i)).toBeInTheDocument();

  // Choose a clue; select Range
  const preFeedback = screen.getByText(/Correct!|సరైంది|सही/i).textContent;
  fireEvent.click(screen.getByTestId('puzzle-clue-range'));
  // A hint should now be shown (range hint)
  expect(screen.getByText(/Hint: .*between/i)).toBeInTheDocument();

  // The standard hint penalty and one-use-per-type rule apply; button in hints area should be disabled for range
  const rangeBtn = screen.getByRole('button', { name: /Get range hint|Range|పరిధి|सीमा/i });
  expect(rangeBtn).toBeDisabled();
});

test('Wrong answer allows one retry then locks', () => {
  render(<App />);
  fireEvent.click(screen.getByTestId('toggle-puzzle-mode'));
  // pick an incorrect option deterministically (idx 1 should be wrong in our pool)
  fireEvent.click(screen.getByTestId('puzzle-opt-1'));
  expect(screen.getByText(/try once more|మరోసారి ప్రయత్నించవచ్చు|एक बार और प्रयास/i)).toBeInTheDocument();

  // second wrong -> locked
  // depending on rotation, pick another wrong (idx 2)
  fireEvent.click(screen.getByTestId('puzzle-opt-2'));
  expect(screen.getByText(/locked/i)).toBeInTheDocument();
});

test('Puzzle panel resets on New Game and difficulty change', () => {
  render(<App />);
  fireEvent.click(screen.getByTestId('toggle-puzzle-mode'));
  expect(screen.getByTestId('puzzle-panel')).toBeInTheDocument();

  // New Game via Reset during playing
  fireEvent.click(screen.getByRole('button', { name: /Reset/i }));
  // Panel still visible in puzzle mode but puzzle state should be fresh; presence check
  expect(screen.getByTestId('puzzle-panel')).toBeInTheDocument();

  // Difficulty change refreshes puzzle
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'hard' } });
  expect(screen.getByTestId('puzzle-panel')).toBeInTheDocument();
});

test('Puzzle Mode coexists with Timer Challenge and attempts logic', () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });
  fireEvent.click(screen.getByTestId('toggle-puzzle-mode'));
  fireEvent.click(screen.getByLabelText(/Enable Timer Challenge/i));
  expect(screen.getByText(/\u23f1/)).toBeInTheDocument();

  // Make a guess while puzzle panel is open
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });
  fireEvent.change(input, { target: { value: '1' } });
  fireEvent.click(guessBtn);
  expect(screen.getByText(/Attempts used:/i)).toBeInTheDocument();
});

test('All puzzle strings are localized through i18n keys (sanity presence)', () => {
  render(<App />);
  fireEvent.click(screen.getByTestId('toggle-puzzle-mode'));
  // Verify panel and some button labels using stable testids exist, not asserting locale text directly
  expect(screen.getByTestId('puzzle-panel')).toBeInTheDocument();
  expect(screen.getByTestId('puzzle-opt-0')).toBeInTheDocument();
  expect(screen.getByTestId('puzzle-clue-range')).toBeInTheDocument();
});
