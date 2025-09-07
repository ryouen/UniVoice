import { IPCGateway } from '../../electron/services/ipc/gateway';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('../../electron/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    }))
  }
}));

describe('IPCGateway', () => {
  let gateway: IPCGateway;
  let mockUnifiedPipeline: EventEmitter;
  let mockMainWindow: any;

  beforeEach(() => {
    // Mock UnifiedPipelineService
    mockUnifiedPipeline = new EventEmitter();
    mockUnifiedPipeline.startListening = jest.fn().mockResolvedValue(undefined);
    mockUnifiedPipeline.stopListening = jest.fn().mockResolvedValue(undefined);
    mockUnifiedPipeline.getHistory = jest.fn().mockReturnValue([]);
    mockUnifiedPipeline.clearHistory = jest.fn();
    mockUnifiedPipeline.getState = jest.fn().mockReturnValue({
      state: 'idle',
      sourceLanguage: 'en',
      targetLanguage: 'ja'
    });

    // Mock BrowserWindow
    mockMainWindow = {
      webContents: {
        send: jest.fn()
      }
    };

    gateway = new IPCGateway(mockUnifiedPipeline as any, mockMainWindow);
  });

  afterEach(() => {
    gateway.destroy();
  });

  describe('コマンド処理', () => {
    test('startListeningコマンドの処理', async () => {
      const command = {
        command: 'startListening' as const,
        params: {
          sourceLanguage: 'en',
          targetLanguage: 'ja',
          correlationId: 'test-123'
        }
      };

      const result = await gateway.handleCommand(command);

      expect(result.success).toBe(true);
      expect(mockUnifiedPipeline.startListening).toHaveBeenCalledWith(
        'en',
        'ja',
        'test-123'
      );
    });

    test('stopListeningコマンドの処理', async () => {
      const command = {
        command: 'stopListening' as const,
        params: {
          correlationId: 'test-123'
        }
      };

      const result = await gateway.handleCommand(command);

      expect(result.success).toBe(true);
      expect(mockUnifiedPipeline.stopListening).toHaveBeenCalledWith('test-123');
    });

    test('getHistoryコマンドの処理', async () => {
      const mockHistory = [
        { id: '1', text: 'Hello', translation: 'こんにちは' },
        { id: '2', text: 'World', translation: '世界' }
      ];
      mockUnifiedPipeline.getHistory.mockReturnValue(mockHistory);

      const command = {
        command: 'getHistory' as const,
        params: {}
      };

      const result = await gateway.handleCommand(command);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockHistory);
    });

    test('clearHistoryコマンドの処理', async () => {
      const command = {
        command: 'clearHistory' as const,
        params: {}
      };

      const result = await gateway.handleCommand(command);

      expect(result.success).toBe(true);
      expect(mockUnifiedPipeline.clearHistory).toHaveBeenCalled();
    });

    test('不正なコマンドの処理', async () => {
      const command = {
        command: 'invalidCommand' as any,
        params: {}
      };

      const result = await gateway.handleCommand(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown command');
    });
  });

  describe('イベント転送', () => {
    test('pipelineEventの転送', () => {
      const testEvent = {
        type: 'asr' as const,
        timestamp: Date.now(),
        correlationId: 'test-123',
        data: {
          text: 'Hello world',
          confidence: 0.9,
          isFinal: false,
          language: 'en'
        }
      };

      mockUnifiedPipeline.emit('pipelineEvent', testEvent);

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'univoice:event',
        testEvent
      );
    });

    test('複数のイベント転送', () => {
      const events = [
        {
          type: 'asr' as const,
          timestamp: Date.now(),
          correlationId: 'test-1',
          data: { text: 'First', confidence: 0.8, isFinal: false, language: 'en' }
        },
        {
          type: 'translation' as const,
          timestamp: Date.now(),
          correlationId: 'test-2',
          data: {
            originalText: 'Hello',
            translatedText: 'こんにちは',
            sourceLanguage: 'en',
            targetLanguage: 'ja',
            confidence: 0.9,
            isFinal: true
          }
        }
      ];

      events.forEach(event => {
        mockUnifiedPipeline.emit('pipelineEvent', event);
      });

      expect(mockMainWindow.webContents.send).toHaveBeenCalledTimes(2);
      expect(mockMainWindow.webContents.send).toHaveBeenNthCalledWith(
        1,
        'univoice:event',
        events[0]
      );
      expect(mockMainWindow.webContents.send).toHaveBeenNthCalledWith(
        2,
        'univoice:event',
        events[1]
      );
    });
  });

  describe('エラーハンドリング', () => {
    test('UnifiedPipelineServiceエラーの処理', async () => {
      const error = new Error('Pipeline error');
      mockUnifiedPipeline.startListening.mockRejectedValue(error);

      const command = {
        command: 'startListening' as const,
        params: {
          sourceLanguage: 'en',
          targetLanguage: 'ja',
          correlationId: 'test-123'
        }
      };

      const result = await gateway.handleCommand(command);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pipeline error');
    });

    test('パラメータ検証エラー', async () => {
      const command = {
        command: 'startListening' as const,
        params: {
          // sourceLanguageが欠けている
          targetLanguage: 'ja',
          correlationId: 'test-123'
        } as any
      };

      const result = await gateway.handleCommand(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    test('予期しないエラーの処理', async () => {
      // getHistoryで予期しないエラーを発生させる
      mockUnifiedPipeline.getHistory.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const command = {
        command: 'getHistory' as const,
        params: {}
      };

      const result = await gateway.handleCommand(command);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });
  });

  describe('型安全性', () => {
    test('Zodスキーマ検証', async () => {
      const validCommand = {
        command: 'startListening' as const,
        params: {
          sourceLanguage: 'en',
          targetLanguage: 'ja',
          correlationId: 'test-123'
        }
      };

      const result = await gateway.handleCommand(validCommand);
      expect(result.success).toBe(true);
    });

    test('不正な型のパラメータ', async () => {
      const invalidCommand = {
        command: 'startListening' as const,
        params: {
          sourceLanguage: 123, // 文字列であるべき
          targetLanguage: 'ja',
          correlationId: 'test-123'
        } as any
      };

      const result = await gateway.handleCommand(invalidCommand);
      expect(result.success).toBe(false);
    });
  });

  describe('相関ID処理', () => {
    test('相関IDが正しく伝播される', async () => {
      const correlationId = 'test-correlation-123';
      
      const command = {
        command: 'startListening' as const,
        params: {
          sourceLanguage: 'en',
          targetLanguage: 'ja',
          correlationId
        }
      };

      await gateway.handleCommand(command);

      expect(mockUnifiedPipeline.startListening).toHaveBeenCalledWith(
        'en',
        'ja',
        correlationId
      );
    });

    test('相関IDなしでも動作する', async () => {
      const command = {
        command: 'clearHistory' as const,
        params: {}
      };

      const result = await gateway.handleCommand(command);
      expect(result.success).toBe(true);
    });
  });

  describe('リソース管理', () => {
    test('destroyでリソースがクリーンアップされる', () => {
      const initialListenerCount = mockUnifiedPipeline.listenerCount('pipelineEvent');
      
      gateway.destroy();
      
      const finalListenerCount = mockUnifiedPipeline.listenerCount('pipelineEvent');
      expect(finalListenerCount).toBeLessThan(initialListenerCount);
    });

    test('destroy後のコマンド処理は失敗する', async () => {
      gateway.destroy();

      const command = {
        command: 'getHistory' as const,
        params: {}
      };

      const result = await gateway.handleCommand(command);
      expect(result.success).toBe(false);
      expect(result.error).toContain('destroyed');
    });
  });

  describe('パフォーマンス', () => {
    test('大量のイベント処理でもメモリリークしない', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // 大量のイベントを発生させる
      for (let i = 0; i < 10000; i++) {
        const event = {
          type: 'asr' as const,
          timestamp: Date.now(),
          correlationId: `test-${i}`,
          data: {
            text: `Text ${i}`,
            confidence: 0.8,
            isFinal: false,
            language: 'en'
          }
        };
        mockUnifiedPipeline.emit('pipelineEvent', event);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // メモリ増加が合理的な範囲内であることを確認（10MB以下）
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    test('並行コマンド処理', async () => {
      const commands = Array.from({ length: 100 }, (_, i) => ({
        command: 'getHistory' as const,
        params: {}
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        commands.map(cmd => gateway.handleCommand(cmd))
      );
      const endTime = Date.now();

      // すべてのコマンドが成功することを確認
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // 処理時間が合理的であることを確認（1秒以下）
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});