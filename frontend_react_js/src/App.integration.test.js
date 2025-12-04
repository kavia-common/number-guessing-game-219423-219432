import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Ensure navigator.vibrate is present to avoid environment-specific failures
beforeAll(() => {
  if (typeof navigator.vibrate !== 'function') {
    Object.defineProperty(window.navigator, 'vibrate', {
      value: jest.fn(),
      configurable: true,
    });
  }
});

// PUBLIC_INTERFACE
test('game renders, supports difficulty changes, guessing, reset, scoring, hint, and shows Timer Mode toggle', () => {
  render(<App />);

  // UI elements present
  expect(screen.getByText(/Number Guessing Game/i)).toBeInTheDocument();
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });
  const hintBtn = screen.getByRole('button', { name: /Get Hint/i });
  expect(input).toBeInTheDocument();
  expect(guessBtn).toBeInTheDocument();
  expect(hintBtn).toBeInTheDocument();
  expect(hintBtn).toBeEnabled();

  // Timer Mode toggle presence
  expect(screen.getByLabelText(/Enable Timer Mode/i)).toBeInTheDocument();

  // Default difficulty is Medium (1-50)
  expect(screen.getByText(/between 1 and 50/i)).toBeInTheDocument();
  // Range text section
  expect(screen.getByText(/Current range:/i)).toBeInTheDocument();

  // Enter a guess and submit
  fireEvent.change(input, { target: { value: '25' } });
  fireEvent.click(guessBtn);

  // Should show feedback and attempts increment to 1
  const attempts = screen.getByText(/Attempts:/i);
  expect(attempts).toBeInTheDocument();
  expect(attempts.textContent).toMatch(/1/);

  // Change difficulty to Easy (1-20) and ensure range updates and attempts reset
  const difficulty = screen.getByLabelText(/Select difficulty/i);
  fireEvent.change(difficulty, { target: { value: 'easy' } });

  expect(screen.getByText(/between 1 and 20/i)).toBeInTheDocument();

  const attemptsAfterDiffChange = screen.getByText(/Attempts:/i);
  expect(attemptsAfterDiffChange.textContent).toMatch(/0/);

  // Use hint during active game, hint text shows
  const hintBtnEasy = screen.getByRole('button', { name: /Get Hint/i });
  fireEvent.click(hintBtnEasy);
  expect(screen.getByText(/Hint: The number is (even|odd)/i)).toBeInTheDocument();

  // Brute-force guesses to guarantee a win within small range and capture score
  let scoreTextEasyFirst = null;
  for (let g = 1; g <= 20; g++) {
    fireEvent.change(input, { target: { value: String(g) } });
    fireEvent.click(guessBtn);
    const feedbackEl = screen.getByText(/Make a guess to begin!|Too low|Too high|Correct!/i);
    if (/Correct!/i.test(feedbackEl.textContent)) {
      const scoreEl = screen.getByText(/Score:/i);
      expect(scoreEl).toBeInTheDocument();
      scoreTextEasyFirst = scoreEl.textContent;
      break;
    }
  }
  expect(scoreTextEasyFirst).not.toBeNull();

  // Hint button disabled after win
  expect(screen.getByRole('button', { name: /Get Hint/i })).toBeDisabled();

  // Play Again should reset attempts and hide score until next win; hint cleared
  const playAgainBtn = screen.getByRole('button', { name: /Play Again/i });
  fireEvent.click(playAgainBtn);
  expect(screen.getByText(/Attempts:/i).textContent).toMatch(/0/);
  // score element should not be visible now
  expect(screen.queryByText(/Score:/i)).toBeNull();
  // hint cleared after reset
  expect(screen.getByText(/Make a guess to begin!/i)).toBeInTheDocument();

  // Intentionally make more guesses before correct to produce a lower score
  let madeThreeWrongGuesses = 0;
  for (let g = 1; g <= 20 && madeThreeWrongGuesses < 3; g++) {
    fireEvent.change(input, { target: { value: String(g) } });
    fireEvent.click(guessBtn);
    const feedbackEl = screen.getByText(/Make a guess to begin!|Too low|Too high|Correct!/i);
    if (/Too low|Too high/i.test(feedbackEl.textContent)) {
      madeThreeWrongGuesses++;
    }
    if (/Correct!/i.test(feedbackEl.textContent)) {
      // Found too early, restart to ensure more attempts
      const playAgain = screen.getByRole('button', { name: /Play Again/i });
      fireEvent.click(playAgain);
      madeThreeWrongGuesses = 0;
      g = 0; // loop will increment to 1
    }
  }
  // Now continue brute-force until win
  let scoreTextEasySecond = null;
  for (let g = 1; g <= 20; g++) {
    fireEvent.change(input, { target: { value: String(g) } });
    fireEvent.click(guessBtn);
    const feedbackEl = screen.getByText(/Make a guess to begin!|Too low|Too high|Correct!/i);
    if (/Correct!/i.test(feedbackEl.textContent)) {
      const scoreEl = screen.getByText(/Score:/i);
      expect(scoreEl).toBeInTheDocument();
      scoreTextEasySecond = scoreEl.textContent;
      break;
    }
  }
  expect(scoreTextEasySecond).not.toBeNull();

  // Extract numeric scores to compare: fewer guesses should yield higher score
  const extractNumber = (txt) => {
    const m = txt.match(/(\d+)/);
    return m ? Number(m[1]) : 0;
  };
  const s1 = extractNumber(scoreTextEasyFirst);
  const s2 = extractNumber(scoreTextEasySecond);
  expect(s1).toBeGreaterThanOrEqual(0);
  expect(s2).toBeGreaterThanOrEqual(0);
  // We attempted to make more wrong guesses in the second run, so expect second score <= first
  expect(s2).toBeLessThanOrEqual(s1);

  // Reset game
  const resetBtn = screen.getByRole('button', { name: /Reset|Play Again/i });
  fireEvent.click(resetBtn);

  // After reset, attempts should be 0 again and range should persist for selected difficulty
  const attemptsAfter = screen.getByText(/Attempts:/i);
  expect(attemptsAfter.textContent).toMatch(/0/);
  expect(screen.getByText(/between 1 and 20/i)).toBeInTheDocument();
  expect(screen.queryByText(/Score:/i)).toBeNull();

  // Change difficulty to Hard (1-100) and verify subtitle updates and score resets/hidden and hint cleared
  fireEvent.change(difficulty, { target: { value: 'hard' } });
  expect(screen.getByText(/between 1 and 100/i)).toBeInTheDocument();
  expect(screen.queryByText(/Score:/i)).toBeNull();
  expect(screen.getByText(/Make a guess to begin!/i)).toBeInTheDocument();
});
