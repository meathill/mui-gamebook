import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

// Mock console to reduce noise
global.console = {
  ...console,
  // error: vi.fn(),
  // warn: vi.fn(),
};
