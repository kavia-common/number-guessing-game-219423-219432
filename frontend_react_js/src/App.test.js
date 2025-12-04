import { render, screen } from '@testing-library/react';
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
