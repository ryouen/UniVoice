// Test environment setup
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock Electron for testing
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
  },
  BrowserWindow: jest.fn(() => ({
    webContents: {
      send: jest.fn(),
    },
  })),
  app: {
    getPath: jest.fn(() => '/mock/path'),
  },
}));

// Mock WebSocket for Deepgram tests
jest.mock('ws', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    once: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    terminate: jest.fn(),
    removeAllListeners: jest.fn(),
    readyState: 1, // OPEN
    OPEN: 1,
    CONNECTING: 0,
    CLOSED: 3,
  }));
});

// Mock p-queue to avoid ESM issues
jest.mock('p-queue', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      add: jest.fn((fn) => fn()),
      clear: jest.fn(),
      onEmpty: jest.fn(),
      size: 0,
      pending: 0,
    }))
  };
});

// Global test utilities
global.generateTestAudio = (sampleRate: number, durationSeconds: number): Int16Array => {
  const numSamples = sampleRate * durationSeconds;
  const audio = new Int16Array(numSamples);
  
  // Generate sine wave
  const frequency = 440; // A4 note
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t);
    audio[i] = Math.floor(sample * 32767);
  }
  
  return audio;
};

global.delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

global.waitForEvent = (eventName: string, timeout = 5000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);
    
    // Mock event listener
    const handler = (data: any) => {
      clearTimeout(timer);
      resolve(data);
    };
    
    // In real implementation, would attach to actual event emitter
    setTimeout(() => {
      handler({ mock: true, eventName });
    }, 100);
  });
};

// Suppress console output during tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error for debugging
    error: console.error,
  };
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Extend Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});