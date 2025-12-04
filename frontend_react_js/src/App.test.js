import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

test('renders Number Guessing Game header and controls and difficulty selector', () => {
  render(<App />);
  expect(screen.getByText(/Number Guessing Game/i)).toBeInTheDocument();
  // Default difficulty is Medium (1-50) - subtitle includes range
  expect(screen.getByText(/between 1 and 50/i)).toBeInTheDocument();

  expect(screen.getByLabelText(/Select difficulty/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Enter your guess/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Guess/i })).toBeInTheDocument();
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
});
