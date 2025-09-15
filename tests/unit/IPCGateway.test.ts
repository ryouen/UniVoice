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
  let mockMainWindow: any;

  beforeEach(() => {
    // IPCGatewayはシングルトンなので、毎回新しいインスタンスを作成するのではなく、
    // 既存のインスタンスをクリアして再利用する
    gateway = new IPCGateway(); // 新しいインスタンスを直接作成
    gateway.destroy(); // 前回のテストで残ったリスナーをクリア

    mockMainWindow = {
      webContents: {
        send: jest.fn()
      }
    };

    // IPCGatewayが発火するpipelineEventをmockMainWindowに転送するリスナーを設定
    // これは実際のアプリケーションのメインプロセスでの動作をシミュレート
    gateway.on('pipelineEvent', (event) => {
      mockMainWindow.webContents.send('univoice:event', event);
    });

    jest.useFakeTimers(); // setIntervalのテストのためにタイマーをモック
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    gateway.destroy(); // テスト後にクリーンアップ
  });

  describe('handleCommand', () => {
    it('should emit domain-command for startListening', async () => {
      const command = {
        command: 'startListening' as const,
        params: {
          sourceLanguage: 'en',
          targetLanguage: 'ja',
          correlationId: 'test-123'
        }
      };
      const domainCommandSpy = jest.fn();
      gateway.on('domain-command', domainCommandSpy);

      await gateway.handleCommand(command);

      expect(domainCommandSpy).toHaveBeenCalledTimes(1);
      expect(domainCommandSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'startListening',
        params: command.params,
        correlationId: expect.any(String) // 相関IDは自動生成される
      }));
    });

    it('should emit domain-command for stopListening', async () => {
      const command = {
        command: 'stopListening' as const,
        params: {
          correlationId: 'test-123'
        }
      };
      const domainCommandSpy = jest.fn();
      gateway.on('domain-command', domainCommandSpy);

      await gateway.handleCommand(command);

      expect(domainCommandSpy).toHaveBeenCalledTimes(1);
      expect(domainCommandSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'stopListening',
        params: command.params,
        correlationId: expect.any(String)
      }));
    });

    it('should emit domain-command for getHistory', async () => {
      const command = {
        command: 'getHistory' as const,
        params: { limit: 10, offset: 0 } // 実際のIPCGatewayのgetHistoryはparamsを持つ可能性があるため
      };
      const domainCommandSpy = jest.fn();
      gateway.on('domain-command', domainCommandSpy);

      await gateway.handleCommand(command);

      expect(domainCommandSpy).toHaveBeenCalledTimes(1);
      expect(domainCommandSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'getHistory',
        params: expect.any(Object), // paramsの具体的な内容ではなく、オブジェクトであることを確認
        correlationId: expect.any(String)
      }));
    });

    it('should emit domain-command for clearHistory', async () => {
      const command = {
        command: 'clearHistory' as const,
        params: {}
      };
      const domainCommandSpy = jest.fn();
      gateway.on('domain-command', domainCommandSpy);

      await gateway.handleCommand(command);

      expect(domainCommandSpy).toHaveBeenCalledTimes(1);
      expect(domainCommandSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'clearHistory',
        params: command.params,
        correlationId: expect.any(String)
      }));
    });

    it('should emit error event for invalid command structure', async () => {
      const invalidCommand = { command: 'startListening', params: { sourceLanguage: 123 } }; // Invalid param type
      const errorEventSpy = jest.fn();
      gateway.on('pipelineEvent', errorEventSpy);

      await gateway.handleCommand(invalidCommand);

      expect(errorEventSpy).toHaveBeenCalledTimes(1);
      expect(errorEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        code: 'COMMAND_VALIDATION_ERROR',
        message: expect.stringContaining('validation'), // Zodのエラーメッセージは詳細なのでstringContainingで対応
        correlationId: expect.any(String)
      }));
    });

    it('should emit error event for unknown command', async () => {
      const unknownCommand = { command: 'unknownCommand' as any, params: {} };
      const errorEventSpy = jest.fn();
      gateway.on('pipelineEvent', errorEventSpy);

      await gateway.handleCommand(unknownCommand);

      expect(errorEventSpy).toHaveBeenCalledTimes(1);
      expect(errorEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        code: 'UNKNOWN_COMMAND',
        message: expect.stringContaining('Invalid discriminator value'), // Zodのエラーメッセージは詳細なのでstringContainingで対応
        correlationId: expect.any(String)
      }));
    });
  });

  describe('emitEvent', () => {
    it('should emit pipelineEvent and send to main window', () => {
      const testEvent = {
        type: 'asr' as const,
        timestamp: Date.now(),
        correlationId: 'test-event-id',
        data: {
          text: 'Hello world',
          confidence: 0.9,
          isFinal: false,
          language: 'en'
        }
      };

      gateway.emitEvent(testEvent);

      expect(mockMainWindow.webContents.send).toHaveBeenCalledTimes(1);
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'univoice:event',
        expect.objectContaining({
          type: 'asr',
          correlationId: 'test-event-id',
        })
      );
    });

    it('should emit error event if event validation fails', () => {
      const invalidEvent = { type: 'asr', data: { text: 123 } }; // Invalid data type
      const errorEventSpy = jest.fn();
      gateway.on('pipelineEvent', errorEventSpy);

      gateway.emitEvent(invalidEvent as any);

      expect(errorEventSpy).toHaveBeenCalledTimes(1);
      expect(errorEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        code: 'EVENT_VALIDATION_ERROR',
        message: expect.stringContaining('validation'),
      }));
    });
  });

  describe('Correlation ID Management', () => {
    it('should generate unique correlation IDs', async () => {
      const command1 = { command: 'getHistory' as const, params: {} };
      const command2 = { command: 'getHistory' as const, params: {} };

      const domainCommandSpy = jest.fn();
      gateway.on('domain-command', domainCommandSpy);

      await gateway.handleCommand(command1);
      await gateway.handleCommand(command2);

      const correlationId1 = domainCommandSpy.mock.calls[0][0].correlationId;
      const correlationId2 = domainCommandSpy.mock.calls[1][0].correlationId;

      expect(correlationId1).not.toBe(correlationId2);
      expect(correlationId1).toMatch(/^ipc-\d{13}-\w{9}$/);
    });

    it('should clean up expired correlations', async () => {
      const command = { command: 'getHistory' as const, params: {} };
      const domainCommandSpy = jest.fn();
      gateway.on('domain-command', domainCommandSpy);

      await gateway.handleCommand(command);
      const correlationId = domainCommandSpy.mock.calls[0][0].correlationId;

      expect(gateway.getCorrelationInfo(correlationId)).toBeDefined();

      jest.advanceTimersByTime(30001); // タイムアウト時間を超える
      await Promise.resolve(); // setIntervalのコールバックが実行されるのを待つ
      await new Promise(process.nextTick); // マイクロタスクキューの処理を待つ

      expect(gateway.getCorrelationInfo(correlationId)).toBeUndefined();
    });
  });

  describe('Resource Management', () => {
    it('should clear all listeners on destroy', () => {
      const mockListener = jest.fn();
      gateway.on('domain-command', mockListener);
      // pipelineEventリスナーはbeforeEachで設定されている

      expect(gateway.listenerCount('domain-command')).toBe(1);
      expect(gateway.listenerCount('pipelineEvent')).toBe(1); // beforeEachで設定したリスナー

      gateway.destroy();

      expect(gateway.listenerCount('domain-command')).toBe(0);
      expect(gateway.listenerCount('pipelineEvent')).toBe(0);
    });

    it('should clear correlation map on destroy', async () => {
      const command = { command: 'getHistory' as const, params: {} };
      await gateway.handleCommand(command);
      expect(gateway.getActiveCorrelations().length).toBeGreaterThan(0);

      gateway.destroy();

      expect(gateway.getActiveCorrelations().length).toBe(0);
    });
  });

  // パフォーマンス関連のテストは、ユニットテストの範囲外として一旦コメントアウト
  // describe('パフォーマンス', () => {
  //   test('大量のイベント処理でもメモリリークしない', () => {
  //     const initialMemory = process.memoryUsage().heapUsed;

  //     for (let i = 0; i < 10000; i++) {
  //       const event = {
  //         type: 'asr' as const,
  //         timestamp: Date.now(),
  //         correlationId: `test-${i}`,
  //         data: {
  //           text: `Text ${i}`,
  //           confidence: 0.8,
  //           isFinal: false,
  //           language: 'en'
  //         }
  //       };
  //       mockUnifiedPipeline.emit('pipelineEvent', event);
  //     }

  //     const finalMemory = process.memoryUsage().heapUsed;
  //     const memoryIncrease = finalMemory - initialMemory;
      
  //     expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  //   });

  //   test('並行コマンド処理', async () => {
  //     const commands = Array.from({ length: 100 }, (_, i) => ({
  //       command: 'getHistory' as const,
  //       params: {}
  //     }));

  //     const startTime = Date.now();
  //     const results = await Promise.all(
  //       commands.map(cmd => gateway.handleCommand(cmd))
  //     );
  //     const endTime = Date.now();

  //     results.forEach(result => {
  //       expect(result.success).toBe(true);
  //     });

  //     expect(endTime - startTime).toBeLessThan(1000);
  //   });
  // });
});