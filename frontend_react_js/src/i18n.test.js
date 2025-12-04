import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

test('language switch changes header title', () => {
  render(<App />);
  // default English present
  expect(screen.getByText(/Number Guessing Game/i)).toBeInTheDocument();

  const sel = screen.getByTestId('language-select');
  fireEvent.change(sel, { target: { value: 'hi' } });
  expect(screen.getByText(/संख्या अनुमान खेल/i)).toBeInTheDocument();

  fireEvent.change(sel, { target: { value: 'te' } });
  expect(screen.getByText(/సంఖ్య ఊహించే ఆట/i)).toBeInTheDocument();
});
