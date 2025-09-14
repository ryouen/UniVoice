/**
 * Unit tests for WindowClient service
 */

import { WindowClient } from '../../src/services/WindowClient';

// Mock window.univoice
const mockWindowManager = {
  measureSetupContent: jest.fn(),
  setSetupBounds: jest.fn(),
  enterMain: jest.fn(),
  toggleHistory: jest.fn(),
  toggleSummary: jest.fn()
};

const mockWindow = {
  minimize: jest.fn(),
  maximize: jest.fn(),
  unmaximize: jest.fn(),
  close: jest.fn(),
  isMaximized: jest.fn(),
  setAlwaysOnTop: jest.fn(),
  isAlwaysOnTop: jest.fn()
};

// Setup global mocks
(global as any).window = {
  univoice: {
    windowManager: mockWindowManager,
    window: mockWindow
  }
};

describe('WindowClient', () => {
  let windowClient: WindowClient;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get fresh instance
    windowClient = WindowClient.getInstance();
  });

  describe('Singleton Pattern', () => {
    test('should return the same instance', () => {
      const instance1 = WindowClient.getInstance();
      const instance2 = WindowClient.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Window Manager Methods', () => {
    test('toggleHistory calls windowManager API', async () => {
      mockWindowManager.toggleHistory.mockResolvedValue(true);
      
      const result = await windowClient.toggleHistory();
      
      expect(mockWindowManager.toggleHistory).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    test('toggleSummary calls windowManager API', async () => {
      mockWindowManager.toggleSummary.mockResolvedValue(true);
      
      const result = await windowClient.toggleSummary();
      
      expect(mockWindowManager.toggleSummary).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    test('measureAndSetSetupSize measures and sets bounds', async () => {
      const mockSize = { width: 800, height: 600 };
      mockWindowManager.measureSetupContent.mockReturnValue(mockSize);
      mockWindowManager.setSetupBounds.mockResolvedValue(true);
      
      const result = await windowClient.measureAndSetSetupSize();
      
      expect(mockWindowManager.measureSetupContent).toHaveBeenCalledTimes(1);
      expect(mockWindowManager.setSetupBounds).toHaveBeenCalledWith(800, 600);
      expect(result).toBe(true);
    });

    test('measureAndSetSetupSize handles null measurement', async () => {
      mockWindowManager.measureSetupContent.mockReturnValue(null);
      
      const result = await windowClient.measureAndSetSetupSize();
      
      expect(mockWindowManager.measureSetupContent).toHaveBeenCalledTimes(1);
      expect(mockWindowManager.setSetupBounds).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    test('enterMain calls windowManager API', async () => {
      mockWindowManager.enterMain.mockResolvedValue(true);
      
      const result = await windowClient.enterMain();
      
      expect(mockWindowManager.enterMain).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });
  });

  describe('Window Control Methods', () => {
    test('minimize calls window API', async () => {
      await windowClient.minimize();
      expect(mockWindow.minimize).toHaveBeenCalledTimes(1);
    });

    test('maximize calls window API', async () => {
      await windowClient.maximize();
      expect(mockWindow.maximize).toHaveBeenCalledTimes(1);
    });

    test('unmaximize calls window API', async () => {
      await windowClient.unmaximize();
      expect(mockWindow.unmaximize).toHaveBeenCalledTimes(1);
    });

    test('close calls window API', async () => {
      await windowClient.close();
      expect(mockWindow.close).toHaveBeenCalledTimes(1);
    });

    test('isMaximized returns window state', async () => {
      mockWindow.isMaximized.mockResolvedValue(true);
      
      const result = await windowClient.isMaximized();
      
      expect(mockWindow.isMaximized).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    test('setAlwaysOnTop calls window API', async () => {
      mockWindow.setAlwaysOnTop.mockResolvedValue(true);
      
      const result = await windowClient.setAlwaysOnTop(true);
      
      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(true);
      expect(result).toBe(true);
    });

    test('isAlwaysOnTop returns window state', async () => {
      mockWindow.isAlwaysOnTop.mockResolvedValue(true);
      
      const result = await windowClient.isAlwaysOnTop();
      
      expect(mockWindow.isAlwaysOnTop).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('handles errors gracefully for toggleHistory', async () => {
      mockWindowManager.toggleHistory.mockRejectedValue(new Error('Test error'));
      
      const result = await windowClient.toggleHistory();
      
      expect(result).toBe(false);
    });

    test('handles errors gracefully for toggleSummary', async () => {
      mockWindowManager.toggleSummary.mockRejectedValue(new Error('Test error'));
      
      const result = await windowClient.toggleSummary();
      
      expect(result).toBe(false);
    });

    test('handles errors gracefully for enterMain', async () => {
      mockWindowManager.enterMain.mockRejectedValue(new Error('Test error'));
      
      const result = await windowClient.enterMain();
      
      expect(result).toBe(false);
    });

    test('handles errors gracefully for isMaximized', async () => {
      mockWindow.isMaximized.mockRejectedValue(new Error('Test error'));
      
      const result = await windowClient.isMaximized();
      
      expect(result).toBe(false);
    });

    test('handles errors gracefully for setAlwaysOnTop', async () => {
      mockWindow.setAlwaysOnTop.mockRejectedValue(new Error('Test error'));
      
      const result = await windowClient.setAlwaysOnTop(true);
      
      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('handles missing window.univoice gracefully', async () => {
      // Temporarily remove window.univoice
      const originalUnivoice = (global as any).window.univoice;
      (global as any).window.univoice = undefined;
      
      const result = await windowClient.toggleHistory();
      expect(result).toBe(false);
      
      // Restore
      (global as any).window.univoice = originalUnivoice;
    });

    test('handles missing windowManager gracefully', async () => {
      // Temporarily remove windowManager
      const originalWindowManager = (global as any).window.univoice.windowManager;
      (global as any).window.univoice.windowManager = undefined;
      
      const result = await windowClient.toggleHistory();
      expect(result).toBe(false);
      
      // Restore
      (global as any).window.univoice.windowManager = originalWindowManager;
    });
  });
});