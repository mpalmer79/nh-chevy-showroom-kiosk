import '@testing-library/jest-dom';

// =============================================================================
// DOM API MOCKS
// =============================================================================

// Mock scrollTo
window.scrollTo = jest.fn() as unknown as typeof window.scrollTo;

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock IntersectionObserver
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
}
window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
}
window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock matchMedia
window.matchMedia = window.matchMedia || function(query: string) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  } as unknown as MediaQueryList;
};

// Mock HTMLMediaElement methods (for video/audio elements in tests)
window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
window.HTMLMediaElement.prototype.pause = jest.fn();
window.HTMLMediaElement.prototype.load = jest.fn();

// Mock navigator.mediaDevices for camera tests
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockRejectedValue(new Error('Camera not available in test')),
    enumerateDevices: jest.fn().mockResolvedValue([]),
  },
  writable: true,
  configurable: true,
});

// =============================================================================
// SPEECH SYNTHESIS MOCK
// =============================================================================

const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn(() => [
    { name: 'Google US English', lang: 'en-US', default: true },
    { name: 'Google UK English Female', lang: 'en-GB', default: false },
  ]),
  speaking: false,
  paused: false,
  pending: false,
  onvoiceschanged: null,
};

Object.defineProperty(window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
  configurable: true,
});

// Mock SpeechSynthesisUtterance
class MockSpeechSynthesisUtterance {
  text: string;
  lang: string;
  voice: SpeechSynthesisVoice | null;
  volume: number;
  rate: number;
  pitch: number;
  onend: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => void) | null;
  onerror: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisErrorEvent) => void) | null;
  onstart: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => void) | null;
  
  constructor(text?: string) {
    this.text = text || '';
    this.lang = 'en-US';
    this.voice = null;
    this.volume = 1;
    this.rate = 1;
    this.pitch = 1;
    this.onend = null;
    this.onerror = null;
    this.onstart = null;
  }
}

window.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance;

// =============================================================================
// FETCH MOCK HELPER
// =============================================================================

declare global {
  function createMockResponse(data: unknown, status?: number): Promise<Partial<Response>>;
}

// Helper to create mock fetch responses
(global as Record<string, unknown>).createMockResponse = (data: unknown, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  });
};

// =============================================================================
// CONSOLE SUPPRESSION (for cleaner test output)
// =============================================================================

// Suppress console.error for expected errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Filter out React act() warnings and expected test errors
    const message = typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0]);
    if (
      typeof message === 'string' &&
      (message.includes('Warning: An update to') ||
       message.includes('Warning: ReactDOM.render') ||
       message.includes('act(...)') ||
       message.includes('Removing a style property during rerender') ||
       message.includes('Not implemented: HTMLMediaElement.prototype.play') ||
       message.includes('Error: API Error') ||
       message.includes('Camera error') ||
       message.includes('NotAllowedError') ||
       message.includes('NotFoundError'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// =============================================================================
// ENVIRONMENT VARIABLES
// =============================================================================

process.env.REACT_APP_API_URL = 'http://localhost:8000/api/v1';
process.env.REACT_APP_ENVIRONMENT = 'test';
process.env.REACT_APP_DEALERSHIP = 'Test Dealership';
process.env.REACT_APP_KIOSK_ID = 'TEST-KIOSK-001';
