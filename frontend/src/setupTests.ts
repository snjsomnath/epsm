// Basic jsdom shims and mocks for common browser APIs used by components
// Provide matchMedia for MUI that expects it in some components
import '@testing-library/jest-dom';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Minimal ResizeObserver mock
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

// Provide a basic fetch if tests or components call it (vitest/jsdom provides fetch but keep fallback)
if (!window.fetch) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  window.fetch = () => Promise.resolve(new Response(null as any));
}

export {};
