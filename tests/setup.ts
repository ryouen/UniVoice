/**
 * Jest Test Setup
 * 
 * This file runs before each test suite to set up the testing environment
 */

import '@testing-library/jest-dom';
import path from 'path';
import fs from 'fs';

// Mock Electron modules
jest.mock('electron', () => ({
  app: {
    commandLine: {
      appendSwitch: jest.fn(),
    },
    isReady: jest.fn().mockReturnValue(true),
    on: jest.fn(),
    getPath: jest.fn().mockReturnValue('/fake/path'),
    getName: jest.fn().mockReturnValue('UniVoice'),
    getVersion: jest.fn().mockReturnValue('2.0.0'),
    requestSingleInstanceLock: jest.fn().mockReturnValue(true),
    whenReady: jest.fn().mockResolvedValue(undefined),
  },
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
  ipcRenderer: {
    on: jest.fn(),
    send: jest.fn(),
    invoke: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    loadURL: jest.fn(),
    destroy: jest.fn(),
    close: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
    isDestroyed: jest.fn().mockReturnValue(false),
    isMinimized: jest.fn().mockReturnValue(false),
    isVisible: jest.fn().mockReturnValue(true),
    getBounds: jest.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600 }),
    setBounds: jest.fn(),
    setContentBounds: jest.fn(),
    setTitle: jest.fn(),
    once: jest.fn(),
    setSize: jest.fn(),
    setPosition: jest.fn(),
    webContents: {
      send: jest.fn(),
      session: {
        clearStorageData: jest.fn(),
        setPermissionRequestHandler: jest.fn(),
      },
      on: jest.fn(),
      openDevTools: jest.fn(),
      isDestroyed: jest.fn().mockReturnValue(false),
      getURL: jest.fn().mockReturnValue(''),
    },
  })),
  screen: {
    getPrimaryDisplay: jest.fn().mockReturnValue({
      workAreaSize: { width: 1920, height: 1080 },
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    }),
    getDisplayNearestPoint: jest.fn().mockReturnValue({
      workArea: { width: 1920, height: 1080 },
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    }),
    getCursorScreenPoint: jest.fn().mockReturnValue({ x: 0, y: 0 }),
  },
  dialog: {
    showSaveDialog: jest.fn(),
  },
  Menu: {
    buildFromTemplate: jest.fn(() => ({
      popup: jest.fn(),
    })),
    setApplicationMenu: jest.fn(),
  },
  MenuItem: jest.fn(),
  shell: {
    openPath: jest.fn(),
  },
}));

// Polyfill for setImmediate
if (typeof setImmediate === 'undefined') {
  (global as any).setImmediate = (callback: (...args: any[]) => void, ...args: any[]) => {
    return setTimeout(callback, 0, ...args);
  };
}

// Mock Node.js modules for testing environment
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  appendFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => ''),
}));

// Mock path module
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: (...args: string[]) => args.join('/'),
}));

// Mock process.cwd() for consistent test environment
const originalCwd = process.cwd;
process.cwd = jest.fn(() => '/test-workspace');

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Cleanup after all tests
afterAll(() => {
  process.cwd = originalCwd;
});

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Extend Jest matchers type
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}
