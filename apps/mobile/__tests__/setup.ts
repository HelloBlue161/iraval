import { vi, beforeEach } from 'vitest';

// Global test setup
beforeEach(() => {
  vi.clearAllMocks();
});

// Mock console.warn and console.error to keep test output clean
global.console.warn = vi.fn();
global.console.error = vi.fn();

// Mock window and document for jsdom environment
if (typeof window !== 'undefined') {
  window.matchMedia = window.matchMedia || (() => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
  }));
}
