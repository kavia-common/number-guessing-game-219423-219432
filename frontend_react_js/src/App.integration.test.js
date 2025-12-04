import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// PUBLIC_INTERFACE
test('game renders and allows guessing and reset without runtime errors', () => {
  render(<App />);

  // UI elements present
  expect(screen.getByText(/Number Guessing Game/i)).toBeInTheDocument();
  const input = screen.getByLabelText(/Enter your guess/i);
  const guessBtn = screen.getByRole('button', { name: /Guess/i });
  expect(input).toBeInTheDocument();
  expect(guessBtn).toBeInTheDocument();

  // Enter a guess and submit
  fireEvent.change(input, { target: { value: '50' } });
  fireEvent.click(guessBtn);

  // Should show feedback and attempts increment to 1
  const attempts = screen.getByText(/Attempts:/i);
  expect(attempts).toBeInTheDocument();
  expect(attempts.textContent).toMatch(/1/);

  // Reset game
  const resetBtn = screen.getByRole('button', { name: /Reset|Play Again/i });
  fireEvent.click(resetBtn);

  // After reset, attempts should be 0 again
  const attemptsAfter = screen.getByText(/Attempts:/i);
  expect(attemptsAfter.textContent).toMatch(/0/);
});
