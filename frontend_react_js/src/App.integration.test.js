import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// PUBLIC_INTERFACE
test('game renders, supports difficulty changes, guessing, and reset', () => {
  render(<App />);

  // UI elements present
  expect(screen.getByText(/Number Guessing Game/i)).toBeInTheDocument();
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });
  expect(input).toBeInTheDocument();
  expect(guessBtn).toBeInTheDocument();

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

  // Enter a guess within new range and submit
  fireEvent.change(input, { target: { value: '10' } });
  fireEvent.click(guessBtn);
  const attempts2 = screen.getByText(/Attempts:/i);
  expect(attempts2.textContent).toMatch(/1/);

  // Reset game
  const resetBtn = screen.getByRole('button', { name: /Reset|Play Again/i });
  fireEvent.click(resetBtn);

  // After reset, attempts should be 0 again and range should persist for selected difficulty
  const attemptsAfter = screen.getByText(/Attempts:/i);
  expect(attemptsAfter.textContent).toMatch(/0/);
  expect(screen.getByText(/between 1 and 20/i)).toBeInTheDocument();

  // Change difficulty to Hard (1-100) and verify subtitle updates
  fireEvent.change(difficulty, { target: { value: 'hard' } });
  expect(screen.getByText(/between 1 and 100/i)).toBeInTheDocument();
});
