/* eslint-disable no-undef */
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Provide basic HTMLAudioElement mock compatible with JSDOM to avoid unhandled play() behavior
if (!window.HTMLMediaElement) {
  Object.defineProperty(window, 'HTMLMediaElement', {
    writable: true,
    value: class HTMLMediaElement {
      play() { return Promise.resolve(); }
      pause() {}
      addEventListener() {}
      removeEventListener() {}
      load() {}
    }
  });
}

// Provide navigator.vibrate mock if not available
if (typeof navigator.vibrate !== 'function') {
  Object.defineProperty(window.navigator, 'vibrate', {
    value: jest.fn(),
    configurable: true,
  });
}
