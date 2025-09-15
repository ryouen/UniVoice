import { DeepgramStreamAdapter, DeepgramAdapterConfig, TranscriptResult, DeepgramError } from '../../electron/services/adapters/DeepgramStreamAdapter';
import { WebSocket } from 'ws';

// WebSocketのモック
const mockWsSend = jest.fn();
const mockWsClose = jest.fn();
let mockWsInstance: any = null;
let mockWsOnHandlers: { [event: string]: Function[] } = {};

// WebSocketクラス自体をモック
jest.mock('ws', () => ({
  WebSocket: jest.fn().mockImplementation((url: string, options: any) => {
    mockWsInstance = {
      url,
      options,
      send: mockWsSend,
      close: mockWsClose,
      readyState: WebSocket.OPEN, // デフォルトでOPEN状態をシミュレート
      on: jest.fn((event: string, handler: Function) => {
        if (!mockWsOnHandlers[event]) {
          mockWsOnHandlers[event] = [];
        }
        mockWsOnHandlers[event].push(handler);
      }),
      // テストからイベントを発火させるためのヘルパー
      _emit: (event: string, ...args: any[]) => {
        mockWsOnHandlers[event]?.forEach(handler => handler(...args));
      },
      // readyStateを動的に変更できるようにする
      _setReadyState: (state: number) => {
        mockWsInstance.readyState = state;
      },
    };
    return mockWsInstance;
  }),
}));

describe('DeepgramStreamAdapter', () => {
  let adapter: DeepgramStreamAdapter;
  const mockConfig: DeepgramAdapterConfig = {
    apiKey: 'test-api-key',
    model: 'nova-3',
    interim: true,
    endpointing: 800,
    utteranceEndMs: 1000,
    smartFormat: true,
    noDelay: false,
    sampleRate: 16000,
    sourceLanguage: 'en',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockWsOnHandlers = {}; // 各テストでハンドラをリセット
    adapter = new DeepgramStreamAdapter(mockConfig);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    // adapter.destroy(); // テスト内で明示的にdisconnect/destroyを呼ぶ
  });

  // ヘルパー関数：WebSocketのopenイベントを発火させる
  const triggerWsOpen = () => {
    mockWsInstance._emit('open');
  };

  // ヘルパー関数：WebSocketのmessageイベントを発火させる
  const triggerWsMessage = (message: any) => {
    mockWsInstance._emit('message', Buffer.from(JSON.stringify(message)));
  };

  // ヘルパー関数：WebSocketのerrorイベントを発火させる
  const triggerWsError = (error: any) => {
    mockWsInstance._emit('error', error);
  };

  // ヘルパー関数：WebSocketのcloseイベントを発火させる
  const triggerWsClose = (code: number, reason: string) => {
    mockWsInstance._emit('close', code, Buffer.from(reason));
  };

  describe('Connection', () => {
    it('should connect to Deepgram with correct URL and headers', async () => {
      const connectPromise = adapter.connect();

      expect(WebSocket).toHaveBeenCalledTimes(1);
      const calledUrl = (WebSocket as jest.Mock).mock.calls[0][0];
      const calledOptions = (WebSocket as jest.Mock).mock.calls[0][1];

      expect(calledUrl).toContain('wss://api.deepgram.com/v1/listen');
      expect(calledUrl).toContain('model=nova-3');
      expect(calledUrl).toContain('interim_results=true');
      expect(calledUrl).toContain('endpointing=800');
      expect(calledUrl).toContain('utterance_end_ms=1000');
      expect(calledUrl).toContain('smart_format=true');
      expect(calledUrl).not.toContain('no_delay'); // no_delayはsmart_formatと競合するため含まれない
      expect(calledUrl).toContain('sample_rate=16000');
      expect(calledUrl).toContain('language=en');

      expect(calledOptions.headers.Authorization).toBe(`Token ${mockConfig.apiKey}`);

      triggerWsOpen(); // WebSocketのopenイベントを発火
      await connectPromise; // connect()が解決するのを待つ

      expect(adapter.isConnected()).toBe(true);
      adapter.destroy();
    });

    it('should emit connected event when WebSocket opens', async () => {
      const mockConnected = jest.fn();
      adapter.on('connected', mockConnected);

      const connectPromise = adapter.connect();
      triggerWsOpen();
      await connectPromise;

      expect(mockConnected).toHaveBeenCalledTimes(1);
      adapter.destroy();
    });

    it('should reject connection if already connected', async () => {
      const connectPromise1 = adapter.connect();
      triggerWsOpen();
      await connectPromise1;

      await expect(adapter.connect()).rejects.toThrow('Already connected to Deepgram');
      adapter.destroy();
    });

    it('should handle multilingual language parameter for nova-3', async () => {
      const multiLangConfig = { ...mockConfig, sourceLanguage: 'ja' };
      const multiLangAdapter = new DeepgramStreamAdapter(multiLangConfig);
      const connectPromise = multiLangAdapter.connect();

      triggerWsOpen();
      await connectPromise;

      const calledUrl = (WebSocket as jest.Mock).mock.calls[0][0];
      expect(calledUrl).toContain('language=multi');
      expect(calledUrl).not.toContain('language=ja');
      multiLangAdapter.destroy();
    });
  });

  describe('Audio Sending', () => {
    beforeEach(async () => {
      await adapter.connect();
      triggerWsOpen();
    });

    it('should send audio buffer when connected', () => {
      const audioBuffer = Buffer.from('test audio');
      adapter.sendAudio(audioBuffer);

      expect(mockWsSend).toHaveBeenCalledTimes(1);
      expect(mockWsSend).toHaveBeenCalledWith(audioBuffer);
    });

    it('should not send audio when disconnected', () => {
      adapter.disconnect();
      mockWsSend.mockClear(); // disconnectでsendが呼ばれる可能性があるのでクリア

      const audioBuffer = Buffer.from('test audio');
      adapter.sendAudio(audioBuffer);

      expect(mockWsSend).not.toHaveBeenCalled();
    });

    it('should handle send errors', () => {
      const mockError = jest.fn();
      adapter.on('error', mockError);

      mockWsSend.mockImplementationOnce(() => {
        throw new Error('Send failed');
      });

      const audioBuffer = Buffer.from('test audio');
      adapter.sendAudio(audioBuffer);

      expect(mockError).toHaveBeenCalledTimes(1);
      expect(mockError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'UNKNOWN_ERROR',
        message: 'Failed to send audio data',
        recoverable: true,
      }));
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await adapter.connect();
      triggerWsOpen();
    });

    it('should emit transcript event for valid transcript message', () => {
      const mockTranscript = jest.fn();
      adapter.on('transcript', mockTranscript);

      const deepgramMessage = {
        type: 'Results',
        is_final: true,
        channel: {
          alternatives: [{
            transcript: 'Hello world',
            confidence: 0.9,
            language: 'en',
          }],
        },
      };
      triggerWsMessage(deepgramMessage);

      expect(mockTranscript).toHaveBeenCalledTimes(1);
      expect(mockTranscript).toHaveBeenCalledWith(expect.objectContaining<TranscriptResult>({
        text: 'Hello world',
        confidence: 0.9,
        isFinal: true,
        language: 'en',
      }));
    });

    it('should emit utteranceEnd event', () => {
      const mockUtteranceEnd = jest.fn();
      adapter.on('utteranceEnd', mockUtteranceEnd);

      const deepgramMessage = {
        type: 'UtteranceEnd',
        // ... other utterance end data
      };
      triggerWsMessage(deepgramMessage);

      expect(mockUtteranceEnd).toHaveBeenCalledTimes(1);
      expect(mockUtteranceEnd).toHaveBeenCalledWith(deepgramMessage);
    });

    it('should emit error event for error messages', () => {
      const mockError = jest.fn();
      adapter.on('error', mockError);

      const deepgramMessage = {
        type: 'Error',
        message: 'Deepgram internal error',
      };
      triggerWsMessage(deepgramMessage);

      expect(mockError).toHaveBeenCalledTimes(1);
      expect(mockError).toHaveBeenCalledWith(expect.objectContaining<DeepgramError>({
        code: 'DEEPGRAM_MESSAGE_ERROR',
        message: 'Deepgram internal error',
        recoverable: true,
      }));
    });

    it('should emit metadata event', () => {
      const mockMetadata = jest.fn();
      adapter.on('metadata', mockMetadata);

      const deepgramMessage = {
        type: 'Metadata',
        // ... other metadata
      };
      triggerWsMessage(deepgramMessage);

      expect(mockMetadata).toHaveBeenCalledTimes(1);
      expect(mockMetadata).toHaveBeenCalledWith(deepgramMessage);
    });

    it('should handle parse errors gracefully', () => {
      const mockError = jest.fn();
      adapter.on('error', mockError);

      // 不正なJSONを送信
      mockWsInstance._emit('message', Buffer.from('invalid json'));

      expect(mockError).toHaveBeenCalledTimes(1);
      expect(mockError).toHaveBeenCalledWith(expect.objectContaining<DeepgramError>({
        code: 'PARSE_ERROR',
        message: 'Failed to parse message',
        recoverable: true,
      }));
    });
  });

  describe('Disconnection', () => {
    beforeEach(async () => {
      await adapter.connect();
      triggerWsOpen();
    });

    it('should send finalize and close messages on disconnect', () => {
      adapter.disconnect();

      expect(mockWsSend).toHaveBeenCalledWith(Buffer.from(JSON.stringify({ type: 'Finalize' })));
      expect(mockWsSend).toHaveBeenCalledWith(Buffer.from(JSON.stringify({ type: 'CloseStream' })));
      expect(mockWsClose).toHaveBeenCalledTimes(1);
      expect(adapter.isConnected()).toBe(false);
    });

    it('should emit disconnected event', () => {
      const mockDisconnected = jest.fn();
      adapter.on('disconnected', mockDisconnected);

      adapter.disconnect();

      expect(mockDisconnected).toHaveBeenCalledTimes(1);
      expect(mockDisconnected).toHaveBeenCalledWith('Manual disconnect');
    });

    it('should handle close events with different codes', () => {
      const mockDisconnected = jest.fn();
      adapter.on('disconnected', mockDisconnected);

      triggerWsClose(1006, 'Abnormal closure'); // 異常終了をシミュレート

      expect(mockDisconnected).toHaveBeenCalledTimes(1);
      expect(mockDisconnected).toHaveBeenCalledWith('Abnormal closure');
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should emit error event for WebSocket errors', () => {
      const mockError = jest.fn();
      adapter.on('error', mockError);

      const wsError = new Error('WebSocket connection error');
      (wsError as any).code = 'ECONNREFUSED'; // 例としてエラーコードを追加
      triggerWsError(wsError);

      expect(mockError).toHaveBeenCalledTimes(1);
      expect(mockError).toHaveBeenCalledWith(expect.objectContaining<DeepgramError>({
        code: 'UNKNOWN_ERROR',
        message: 'WebSocket connection error',
        recoverable: true,
      }));
    });
  });

  describe('Metrics', () => {
    it('should track connection metrics', async () => {
      await adapter.connect();
      triggerWsOpen();

      adapter.sendAudio(Buffer.from('audio1'));
      triggerWsMessage({
        type: 'Results',
        is_final: true,
        channel: { alternatives: [{ transcript: 'test', confidence: 0.9 }] },
      });

      const metrics = adapter.getConnectionMetrics();
      expect(metrics.connected).toBe(true);
      expect(metrics.bytesSent).toBe(6); // 'audio1'のバイト数
      expect(metrics.messagesSent).toBe(1);
      expect(metrics.messagesReceived).toBe(1);
      expect(metrics.connectionStartTime).toBeDefined();
      expect(metrics.lastActivityTime).toBeDefined();

      adapter.disconnect();
      expect(adapter.getConnectionMetrics().connected).toBe(false);
      expect(adapter.getConnectionMetrics().connectionEndTime).toBeDefined();
    });
  });

  describe('KeepAlive', () => {
    it('should send initial silence frame after 9 seconds if no audio is sent', async () => {
      const connectPromise = adapter.connect();
      triggerWsOpen();
      await connectPromise;

      expect(mockWsSend).not.toHaveBeenCalled();

      jest.advanceTimersByTime(9000); // 9秒進める

      expect(mockWsSend).toHaveBeenCalledTimes(1);
      expect(mockWsSend.mock.calls[0][0].length).toBeGreaterThan(0); // サイレンスフレームが送られたことを確認
      expect(adapter['audioStarted']).toBe(true);
    });

    it('should send KeepAlive message periodically', async () => {
      const connectPromise = adapter.connect();
      triggerWsOpen();
      await connectPromise;

      mockWsSend.mockClear(); // 初期サイレンスフレームの呼び出しをクリア

      jest.advanceTimersByTime(5000); // 5秒進める
      expect(mockWsSend).toHaveBeenCalledTimes(1);
      expect(mockWsSend).toHaveBeenCalledWith(Buffer.from(JSON.stringify({ type: 'KeepAlive' })));

      jest.advanceTimersByTime(5000); // さらに5秒進める
      expect(mockWsSend).toHaveBeenCalledTimes(2);
      expect(mockWsSend).toHaveBeenCalledWith(Buffer.from(JSON.stringify({ type: 'KeepAlive' })));
    });

    it('should stop KeepAlive on disconnect', async () => {
      const connectPromise = adapter.connect();
      triggerWsOpen();
      await connectPromise;

      jest.advanceTimersByTime(5000); // KeepAliveを一度発火させる
      expect(mockWsSend).toHaveBeenCalledTimes(1);

      adapter.disconnect();
      mockWsSend.mockClear();

      jest.advanceTimersByTime(10000); // さらに10秒進める
      expect(mockWsSend).not.toHaveBeenCalled(); // KeepAliveが停止していることを確認
    });
  });
});
