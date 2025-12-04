import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';
import { readResults, clearResults, addResult } from './leaderboard';
import { readStats, writeStats, computeStatisticsFromLeaderboard, formatDuration } from './statistics';

beforeEach(() => {
  jest.useFakeTimers();
  clearResults();
  // reset stats
  writeStats({ totalGames: 0 });
  // ensure vibrate exists
  if (typeof navigator.vibrate !== 'function') {
    Object.defineProperty(window.navigator, 'vibrate', {
      value: jest.fn(),
      configurable: true,
    });
  }
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  clearResults();
  writeStats({ totalGames: 0 });
});

function bruteForceWin(maxRange = 20) {
  const input = screen.getByLabelText(/Enter your guess|अपने अनुमान दर्ज करें|మీ అంచనాను నమోదు చేయండి/i);
  const guessBtn = screen.getByRole('button', { name: /Guess|अनुमान|గెస్/i });
  for (let g = 1; g <= maxRange; g++) {
    fireEvent.change(input, { target: { value: String(g) } });
    fireEvent.click(guessBtn);
    const fb = screen.getByText(/Too low|Too high|Correct!|सही!|సరైంది!/i);
    if (/Correct!|सही!|సరైంది!/i.test(fb.textContent)) {
      break;
    }
  }
}

test('increments totalGames on win and on losses/timeouts', () => {
  render(<App />);

  // Set easy for deterministic ranges
  fireEvent.change(screen.getByLabelText(/Select difficulty|कठिनाई चुनें|కష్టతరాన్ని ఎంచుకోండి/i), { target: { value: 'easy' } });

  // 1) Win a game
  bruteForceWin(20);
  expect(screen.getByText(/Score:|स्कोर:|స్కోర్:/i)).toBeInTheDocument();
  // totalGames should be 1
  expect(readStats().totalGames).toBe(1);

  // Play again and lose by attempts
  fireEvent.click(screen.getByRole('button', { name: /Play Again|फिर से खेलें|మళ్లీ ఆడు/i }));
  const input = screen.getByLabelText(/Enter your guess|अपने अनुमान दर्ज करें|మీ అంచనాను నమోదు చేయండి/i);
  const guessBtn = screen.getByRole('button', { name: /Guess|अनुमान|గెస్/i });
  for (let i = 1; i <= 6; i++) {
    fireEvent.change(input, { target: { value: String(i) } });
    fireEvent.click(guessBtn);
    const fb = screen.getByText(/Too low|Too high|Correct!|सही!|సరైంది!/i);
    if (/Correct!|सही!|సరైంది!/i.test(fb.textContent)) {
      // If accidentally won, restart to force loss path
      fireEvent.click(screen.getByRole('button', { name: /Play Again|फिर से खेलें|మళ్లీ ఆడు/i }));
      i = 0;
    }
  }
  expect(screen.getByText(/Out of attempts|प्रयास समाप्त|ప్రయత్నాలు ముగిశాయి/i)).toBeInTheDocument();
  expect(readStats().totalGames).toBe(2);

  // New game and trigger timeout
  fireEvent.click(screen.getByRole('button', { name: /New Game|नई खेल|కొత్త ఆట/i }));
  fireEvent.click(screen.getByLabelText(/Enable Timer Challenge|टाइमर चैलेंज सक्षम करें|టైమర్ ఛాలెంజ్‌ని ప్రారంభించండి/i));
  act(() => {
    jest.advanceTimersByTime(30000);
  });
  expect(screen.getByText(/Time’s up!|Time's up!|समय समाप्त!|సమయం ముగిసింది!/i)).toBeInTheDocument();
  expect(readStats().totalGames).toBe(3);
});

test('highest score, fastest win, and average attempts computed from leaderboard (wins only)', () => {
  // Build fake entries
  const ts = Date.now();
  clearResults();
  // timer entries where elapsed = totalTime - timeRemaining
  addResult({ timestamp: ts - 3000, difficulty: 'easy', attempts: 3, score: 800, timerChallenge: true, totalTime: 30, timeRemaining: 20 }); // elapsed 10
  addResult({ timestamp: ts - 2000, difficulty: 'easy', attempts: 5, score: 600, timerChallenge: true, totalTime: 30, timeRemaining: 15 }); // elapsed 15
  addResult({ timestamp: ts - 1000, difficulty: 'medium', attempts: 2, score: 900, timerChallenge: false, totalTime: null, timeRemaining: null });

  const entries = readResults();
  const computed = computeStatisticsFromLeaderboard(entries, 5); // fallback totalGames 5
  expect(computed.totalGames).toBeGreaterThanOrEqual(entries.length);
  expect(computed.highestScore).toBe(900);
  expect(computed.fastestWinSeconds).toBe(10);
  // average attempts over wins
  const expectedAvg = Math.round(((3 + 5 + 2) / 3) * 10) / 10;
  expect(computed.averageAttempts).toBe(expectedAvg);
  // duration formatting
  expect(formatDuration(75)).toBe('1:15');
});

test('fastest win is N/A when no timer metadata available', () => {
  clearResults();
  const ts = Date.now();
  addResult({ timestamp: ts - 5000, difficulty: 'hard', attempts: 7, score: 700, timerChallenge: false });
  const entries = readResults();
  const computed = computeStatisticsFromLeaderboard(entries, null);
  expect(computed.fastestWinSeconds).toBeNull();
});

test('Statistics modal renders localized labels and values with data-testids', () => {
  render(<App />);

  // Open statistics
  fireEvent.click(screen.getByRole('button', { name: /Statistics|सांख्यिकी|గణాంకాలు/i }));
  const modal = screen.getByTestId('statistics-modal');
  expect(modal).toBeInTheDocument();

  // Cards visible
  expect(screen.getByTestId('stats-total-games')).toBeInTheDocument();
  expect(screen.getByTestId('stats-highest-score')).toBeInTheDocument();
  expect(screen.getByTestId('stats-fastest-win')).toBeInTheDocument();
  expect(screen.getByTestId('stats-average-attempts')).toBeInTheDocument();

  // Close by button
  fireEvent.click(screen.getByRole('button', { name: /Close|बंद करें|మూసివేయి/i }));
  expect(screen.queryByTestId('statistics-modal')).toBeNull();
});

test('Backward compatibility when ngg_stats is absent and when there are no entries', () => {
  // Remove stats object
  writeStats({ totalGames: 0 });
  clearResults();

  render(<App />);
  // Open stats
  fireEvent.click(screen.getByRole('button', { name: /Statistics|सांख्यिकी|గణాంకాలు/i }));

  // With no entries, show defaults 0 and N/A
  expect(screen.getByTestId('stats-total-games').textContent).toMatch(/0$/);
  expect(screen.getByTestId('stats-highest-score').textContent).toMatch(/0$/);
  // fastest win is N/A
  const fastText = screen.getByTestId('stats-fastest-win').textContent;
  expect(/N\/A|उपलब्ध नहीं|లేదు/i.test(fastText)).toBe(true);
  expect(screen.getByTestId('stats-average-attempts').textContent).toMatch(/0(\.0)?$/);
});
