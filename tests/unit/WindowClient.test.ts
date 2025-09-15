import { windowClient } from '../../src/services/WindowClient';

describe('WindowClient', () => {
  let mockWindowManager: any;
  let mockWindow: any;
  let originalWindowUnivoice: any; // 元のwindow.univoiceを保存するための変数

  beforeEach(() => {
    // 元のwindow.univoiceを保存
    originalWindowUnivoice = (global as any).window.univoice;

    mockWindowManager = {
      toggleHistory: jest.fn().mockResolvedValue(true),
      toggleSummary: jest.fn().mockResolvedValue(true),
      measureSetupContent: jest.fn().mockResolvedValue([800, 600]),
      setSetupBounds: jest.fn().mockResolvedValue(true),
      enterMain: jest.fn().mockResolvedValue(true),
    };

    mockWindow = {
      minimize: jest.fn().mockResolvedValue(undefined),
      maximize: jest.fn().mockResolvedValue(undefined),
      unmaximize: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      isMaximized: jest.fn().mockResolvedValue(false),
      setAlwaysOnTop: jest.fn().mockResolvedValue(true),
      isAlwaysOnTop: jest.fn().mockResolvedValue(false),
    };

    // グローバルなwindow.univoiceをモック
    (global as any).window = {
      univoice: {
        windowManager: mockWindowManager,
        window: mockWindow,
      },
    };

    jest.clearAllMocks(); // 各テストの前にモックの呼び出し履歴をクリア
  });

  afterEach(() => {
    // グローバルなwindow.univoiceを元に戻す
    (global as any).window.univoice = originalWindowUnivoice;
  });

  describe('Window Manager Methods', () => {
    it('toggleHistory calls windowManager API', async () => {
      const result = await windowClient.toggleHistory();
      expect(mockWindowManager.toggleHistory).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('toggleSummary calls windowManager API', async () => {
      const result = await windowClient.toggleSummary();
      expect(mockWindowManager.toggleSummary).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('measureAndSetSetupSize always returns true (deprecated)', async () => {
      const result = await windowClient.measureAndSetSetupSize();
      expect(mockWindowManager.measureSetupContent).not.toHaveBeenCalled(); // 内部で呼ばれないことを確認
      expect(mockWindowManager.setSetupBounds).not.toHaveBeenCalled(); // 内部で呼ばれないことを確認
      expect(result).toBe(true);
    });

    it('enterMain calls windowManager API', async () => {
      const result = await windowClient.enterMain();
      expect(mockWindowManager.enterMain).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });
  });

  describe('Window Control Methods', () => {
    it('minimize calls window API', async () => {
      await windowClient.minimize();
      expect(mockWindow.minimize).toHaveBeenCalledTimes(1);
    });

    it('maximize calls window API', async () => {
      await windowClient.maximize();
      expect(mockWindow.maximize).toHaveBeenCalledTimes(1);
    });

    it('unmaximize calls window API', async () => {
      await windowClient.unmaximize();
      expect(mockWindow.unmaximize).toHaveBeenCalledTimes(1);
    });

    it('close calls window API', async () => {
      await windowClient.close();
      expect(mockWindow.close).toHaveBeenCalledTimes(1);
    });

    it('isMaximized returns window state', async () => {
      mockWindow.isMaximized.mockResolvedValueOnce(true);
      const result = await windowClient.isMaximized();
      expect(mockWindow.isMaximized).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('setAlwaysOnTop calls window API', async () => {
      await windowClient.setAlwaysOnTop(true);
      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(true);
    });

    it('isAlwaysOnTop returns window state', async () => {
      mockWindow.isAlwaysOnTop.mockResolvedValueOnce(true);
      const result = await windowClient.isAlwaysOnTop();
      expect(mockWindow.isAlwaysOnTop).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles missing windowManager gracefully', async () => {
      // window.univoice.windowManagerを一時的にundefinedにする
      const tempWindowManager = (global as any).window.univoice.windowManager;
      (global as any).window.univoice.windowManager = undefined;
      
      const result = await windowClient.toggleHistory();
      expect(result).toBe(false);

      // 元に戻す
      (global as any).window.univoice.windowManager = tempWindowManager;
    });

    it('handles missing window gracefully', async () => {
      // window.univoice.windowを一時的にundefinedにする
      const tempWindow = (global as any).window.univoice.window;
      (global as any).window.univoice.window = undefined;
      
      const result = await windowClient.minimize();
      expect(result).toBeUndefined(); // voidを返すメソッドなのでundefinedを期待

      // 元に戻す
      (global as any).window.univoice.window = tempWindow;
    });

    it('handles windowManager method errors gracefully', async () => {
      mockWindowManager.toggleHistory.mockRejectedValueOnce(new Error('API Error'));
      const result = await windowClient.toggleHistory();
      expect(result).toBe(false);
    });

    it('handles window method errors gracefully', async () => {
      mockWindow.minimize.mockRejectedValueOnce(new Error('API Error'));
      const result = await windowClient.minimize();
      expect(result).toBeUndefined(); // voidを返すメソッドなのでundefinedを期待
    });
  });
});
