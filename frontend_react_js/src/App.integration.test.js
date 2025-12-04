import { render, screen, fireEvent, act } from '@testing-library/react';
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

// Helper: read attempts used/remaining from UI
function readAttempts() {
  const usedNode = screen.getByText(/Attempts used:/i);
  const remainingNode = screen.getByText(/Attempts remaining:/i);
  const extract = (el) => {
    const m = el.textContent.match(/(\d+)/);
    return m ? Number(m[1]) : 0;
    };
  return { used: extract(usedNode), remaining: extract(remainingNode) };
}

// PUBLIC_INTERFACE
test('game renders, supports difficulty changes, guessing, reset, scoring, hint, timer toggle, and shows attempts counters', () => {
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

  // Attempts counters present and zeroed for new game (Medium max 8)
  let counters = readAttempts();
  expect(counters.used).toBe(0);
  expect(counters.remaining).toBe(8);

  // Enter a guess and submit
  fireEvent.change(input, { target: { value: '25' } });
  fireEvent.click(guessBtn);

  // Should show feedback and attempts used increment to 1; remaining to 7
  counters = readAttempts();
  expect(counters.used).toBe(1);
  expect(counters.remaining).toBe(7);

  // Change difficulty to Easy (1-20) and ensure range updates and attempts reset (Easy max 6)
  const difficulty = screen.getByLabelText(/Select difficulty/i);
  fireEvent.change(difficulty, { target: { value: 'easy' } });

  expect(screen.getByText(/between 1 and 20/i)).toBeInTheDocument();

  counters = readAttempts();
  expect(counters.used).toBe(0);
  expect(counters.remaining).toBe(6);

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
  counters = readAttempts();
  expect(counters.used).toBe(0);
  expect(counters.remaining).toBe(6);
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
  expect(s2).toBeLessThanOrEqual(s1);

  // Reset game
  const resetBtn = screen.getByRole('button', { name: /Reset|Play Again/i });
  fireEvent.click(resetBtn);

  // After reset, attempts should be 0 again and range should persist for selected difficulty
  counters = readAttempts();
  expect(counters.used).toBe(0);
  expect(counters.remaining).toBe(6);
  expect(screen.getByText(/between 1 and 20/i)).toBeInTheDocument();
  expect(screen.queryByText(/Score:/i)).toBeNull();

  // Change difficulty to Hard (1-100) and verify subtitle updates and score resets/hidden and hint cleared
  fireEvent.change(difficulty, { target: { value: 'hard' } });
  expect(screen.getByText(/between 1 and 100/i)).toBeInTheDocument();
  counters = readAttempts();
  expect(counters.used).toBe(0);
  expect(counters.remaining).toBe(10);
  expect(screen.queryByText(/Score:/i)).toBeNull();
  expect(screen.getByText(/Make a guess to begin!/i)).toBeInTheDocument();
});

test('reaching zero attempts causes a loss, disables inputs, and shows New Game; timer coexists', () => {
  render(<App />);

  // Set to Easy (max attempts 6)
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'easy' } });
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });

  // Make 6 wrong guesses by inputting a number out of parity range blindly; since we don't know secret, brute-force avoiding correct
  // Strategy: alternate 1 and 2; if correct appears early, reset and continue; but here we'll just make 6 distinct guesses 1..6
  for (let i = 1; i <= 6; i++) {
    fireEvent.change(input, { target: { value: String(i) } });
    fireEvent.click(guessBtn);
    const feedback = screen.getByText(/Too low|Too high|Correct!/i);
    if (/Correct!/i.test(feedback.textContent)) {
      // If we accidentally guessed correctly, restart the game to keep testing loss scenario
      const playAgain = screen.getByRole('button', { name: /Play Again/i });
      fireEvent.click(playAgain);
      // reset loop
      i = 0;
    }
  }

  // After 6 processed guesses, either we won earlier or we should be out of attempts
  if (screen.queryByText(/Score:/i)) {
    // If we happened to win, start again to force a loss
    const playAgain = screen.getByRole('button', { name: /Play Again/i });
    fireEvent.click(playAgain);
    for (let i = 11; i <= 16; i++) {
      fireEvent.change(input, { target: { value: String(i) } });
      fireEvent.click(guessBtn);
      const feedback = screen.getByText(/Too low|Too high|Correct!/i);
      if (/Correct!/i.test(feedback.textContent)) {
        // restart and continue
        const playAgain2 = screen.getByRole('button', { name: /Play Again/i });
        fireEvent.click(playAgain2);
        i = 10;
      }
    }
  }

  // Now expect out of attempts message and disabled inputs
  expect(screen.getByText(/Out of attempts!/i)).toBeInTheDocument();
  expect(screen.queryByText(/Score:/i)).toBeNull();
  expect(screen.getByLabelText(/Enter your guess/i)).toBeDisabled();
  expect(screen.getByRole('button', { name: /Guess/i })).toBeDisabled();
  expect(screen.getByRole('button', { name: /New Game/i })).toBeInTheDocument();

  // Timer mode can also end the game; ensure enabling timer on new game still works
  const newGameBtn = screen.getByRole('button', { name: /New Game/i });
  fireEvent.click(newGameBtn);
  fireEvent.click(screen.getByLabelText(/Enable Timer Mode/i));
  expect(screen.getByText(/⏱/)).toBeInTheDocument();
});

test('attempts reset properly on New Game and on difficulty change', () => {
  render(<App />);
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });

  // Medium default: 8 remaining
  let counters = readAttempts();
  expect(counters.used).toBe(0);
  expect(counters.remaining).toBe(8);

  fireEvent.change(input, { target: { value: '25' } });
  fireEvent.click(guessBtn);
  counters = readAttempts();
  expect(counters.used).toBe(1);
  expect(counters.remaining).toBe(7);

  // Reset
  fireEvent.click(screen.getByRole('button', { name: /Reset/i }));
  counters = readAttempts();
  expect(counters.used).toBe(0);
  expect(counters.remaining).toBe(8);

  // Difficulty change to hard resets
  fireEvent.change(screen.getByLabelText(/Select difficulty/i), { target: { value: 'hard' } });
  counters = readAttempts();
  expect(counters.used).toBe(0);
  expect(counters.remaining).toBe(10);
});
