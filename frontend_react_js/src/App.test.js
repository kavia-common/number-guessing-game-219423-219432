import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Number Guessing Game header and controls', () => {
  render(<App />);
  expect(screen.getByText(/Number Guessing Game/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Enter your guess/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Guess/i })).toBeInTheDocument();
});
