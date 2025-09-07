/**
 * DeepgramStreamAdapter Unit Tests
 */

import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { DeepgramStreamAdapter, DeepgramAdapterConfig, TranscriptResult, DeepgramError } from '../../electron/services/adapters/DeepgramStreamAdapter';

// Mock WebSocket
jest.mock('ws');
const MockWebSocket = WebSocket as jest.MockedClass<typeof WebSocket>;

// Mock Logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

describe('DeepgramStreamAdapter', () => {
  let adapter: DeepgramStreamAdapter;
  let mockWs: any;
  const config: DeepgramAdapterConfig = {
    apiKey: 'test-api-key',
    model: 'nova-3',
    interim: true,
    endpointing: 800,
    utteranceEndMs: 1000,
    smartFormat: false,
    noDelay: false,
    sampleRate: 16000,
    sourceLanguage: 'en'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock WebSocket instance
    mockWs = {
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN
    };
    
    MockWebSocket.mockImplementation(() => mockWs);
    
    adapter = new DeepgramStreamAdapter(config);
  });

  afterEach(() => {
    adapter.destroy();
  });

  describe('Connection', () => {
    it('should build correct WebSocket URL', async () => {
      const connectPromise = adapter.connect();
      
      // Trigger open event
      const openHandler = mockWs.on.mock.calls.find(call => call[0] === 'open')[1];
      openHandler();
      
      await connectPromise;
      
      const urlArg = MockWebSocket.mock.calls[0][0];
      expect(urlArg).toContain('wss://api.deepgram.com/v1/listen');
      expect(urlArg).toContain('model=nova-3');
      expect(urlArg).toContain('interim_results=true');
      expect(urlArg).toContain('endpointing=800');
      expect(urlArg).toContain('utterance_end_ms=1000');
      expect(urlArg).toContain('language=en');
      expect(urlArg).toContain('sample_rate=16000');
      expect(urlArg).toContain('punctuate=true');
    });

    it('should include optional parameters when configured', async () => {
      const configWithOptions = {
        ...config,
        smartFormat: true,
        noDelay: true
      };
      
      adapter = new DeepgramStreamAdapter(configWithOptions);
      const connectPromise = adapter.connect();
      
      // Trigger open event
      const openHandler = mockWs.on.mock.calls.find(call => call[0] === 'open')[1];
      openHandler();
      
      await connectPromise;
      
      const urlArg = MockWebSocket.mock.calls[0][0];
      expect(urlArg).toContain('smart_format=true');
      expect(urlArg).toContain('no_delay=true');
    });

    it('should emit connected event when WebSocket opens', async () => {
      const connectedSpy = jest.fn();
      adapter.on(DeepgramStreamAdapter.EVENTS.CONNECTED, connectedSpy);
      
      const connectPromise = adapter.connect();
      
      // Trigger open event
      const openHandler = mockWs.on.mock.calls.find(call => call[0] === 'open')[1];
      openHandler();
      
      await connectPromise;
      
      expect(connectedSpy).toHaveBeenCalledTimes(1);
      expect(adapter.isConnected()).toBe(true);
    });

    it('should reject connection if already connected', async () => {
      // First connection
      const connectPromise1 = adapter.connect();
      const openHandler = mockWs.on.mock.calls.find(call => call[0] === 'open')[1];
      openHandler();
      await connectPromise1;
      
      // Second connection should fail
      await expect(adapter.connect()).rejects.toThrow('Already connected to Deepgram');
    });
  });

  describe('Audio Sending', () => {
    beforeEach(async () => {
      // Connect first
      const connectPromise = adapter.connect();
      const openHandler = mockWs.on.mock.calls.find(call => call[0] === 'open')[1];
      openHandler();
      await connectPromise;
    });

    it('should send audio buffer when connected', () => {
      const buffer = Buffer.from([1, 2, 3, 4]);
      adapter.sendAudio(buffer);
      
      expect(mockWs.send).toHaveBeenCalledWith(buffer);
      
      const metrics = adapter.getConnectionMetrics();
      expect(metrics.bytesSent).toBe(4);
      expect(metrics.messagesSent).toBe(1);
    });

    it('should not send audio when disconnected', () => {
      adapter.disconnect();
      
      const buffer = Buffer.from([1, 2, 3, 4]);
      adapter.sendAudio(buffer);
      
      expect(mockWs.send).toHaveBeenCalledTimes(2); // Only disconnect messages
      expect(mockLogger.warn).toHaveBeenCalledWith('Cannot send audio - not connected');
    });

    it('should handle send errors', () => {
      const errorSpy = jest.fn();
      adapter.on(DeepgramStreamAdapter.EVENTS.ERROR, errorSpy);
      
      mockWs.send.mockImplementation(() => {
        throw new Error('Send failed');
      });
      
      const buffer = Buffer.from([1, 2, 3, 4]);
      adapter.sendAudio(buffer);
      
      expect(errorSpy).toHaveBeenCalledWith({
        code: 'SEND_ERROR',
        message: 'Failed to send audio data',
        recoverable: true
      });
    });
  });

  describe('Message Handling', () => {
    let messageHandler: (data: any) => void;

    beforeEach(async () => {
      // Connect and get message handler
      const connectPromise = adapter.connect();
      const openHandler = mockWs.on.mock.calls.find(call => call[0] === 'open')[1];
      openHandler();
      await connectPromise;
      
      messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
    });

    it('should emit transcript event for valid transcript message', () => {
      const transcriptSpy = jest.fn();
      adapter.on(DeepgramStreamAdapter.EVENTS.TRANSCRIPT, transcriptSpy);
      
      const message = {
        channel: {
          alternatives: [{
            transcript: 'Hello world',
            confidence: 0.95
          }]
        },
        is_final: false,
        start: 1.5,
        end: 2.0
      };
      
      messageHandler(Buffer.from(JSON.stringify(message)));
      
      expect(transcriptSpy).toHaveBeenCalledTimes(1);
      const result: TranscriptResult = transcriptSpy.mock.calls[0][0];
      
      expect(result).toMatchObject({
        text: 'Hello world',
        confidence: 0.95,
        isFinal: false,
        language: 'en',
        startMs: 1500,
        endMs: 2000
      });
      expect(result.id).toMatch(/^transcript-\d+-\w+$/);
    });

    it('should emit utteranceEnd event', () => {
      const utteranceEndSpy = jest.fn();
      adapter.on(DeepgramStreamAdapter.EVENTS.UTTERANCE_END, utteranceEndSpy);
      
      const message = {
        type: 'UtteranceEnd'
      };
      
      messageHandler(Buffer.from(JSON.stringify(message)));
      
      expect(utteranceEndSpy).toHaveBeenCalledWith(message);
    });

    it('should emit error event for error messages', () => {
      const errorSpy = jest.fn();
      adapter.on(DeepgramStreamAdapter.EVENTS.ERROR, errorSpy);
      
      const message = {
        type: 'Error',
        error: 'Invalid audio format'
      };
      
      messageHandler(Buffer.from(JSON.stringify(message)));
      
      expect(errorSpy).toHaveBeenCalledWith({
        code: 'DEEPGRAM_MESSAGE_ERROR',
        message: 'Invalid audio format',
        recoverable: true
      });
    });

    it('should emit metadata event', () => {
      const metadataSpy = jest.fn();
      adapter.on(DeepgramStreamAdapter.EVENTS.METADATA, metadataSpy);
      
      const message = {
        type: 'Metadata',
        model: 'nova-3',
        version: '1.0'
      };
      
      messageHandler(Buffer.from(JSON.stringify(message)));
      
      expect(metadataSpy).toHaveBeenCalledWith(message);
    });

    it('should handle parse errors gracefully', () => {
      const errorSpy = jest.fn();
      adapter.on(DeepgramStreamAdapter.EVENTS.ERROR, errorSpy);
      
      messageHandler(Buffer.from('invalid json'));
      
      expect(errorSpy).toHaveBeenCalledWith({
        code: 'PARSE_ERROR',
        message: 'Failed to parse message',
        recoverable: true
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to parse Deepgram message', expect.any(Object));
    });
  });

  describe('Disconnection', () => {
    beforeEach(async () => {
      // Connect first
      const connectPromise = adapter.connect();
      const openHandler = mockWs.on.mock.calls.find(call => call[0] === 'open')[1];
      openHandler();
      await connectPromise;
    });

    it('should send finalize and close messages on disconnect', () => {
      adapter.disconnect();
      
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'Finalize' }));
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'CloseStream' }));
      expect(mockWs.close).toHaveBeenCalled();
    });

    it('should emit disconnected event', () => {
      const disconnectedSpy = jest.fn();
      adapter.on(DeepgramStreamAdapter.EVENTS.DISCONNECTED, disconnectedSpy);
      
      adapter.disconnect();
      
      expect(disconnectedSpy).toHaveBeenCalledWith('Manual disconnect');
      expect(adapter.isConnected()).toBe(false);
    });

    it('should handle close events with different codes', () => {
      const disconnectedSpy = jest.fn();
      adapter.on(DeepgramStreamAdapter.EVENTS.DISCONNECTED, disconnectedSpy);
      
      const closeHandler = mockWs.on.mock.calls.find(call => call[0] === 'close')[1];
      
      // Normal closure
      closeHandler(1000, 'Normal closure');
      expect(disconnectedSpy).toHaveBeenCalledWith('Normal closure');
      
      // Error closure (would attempt reconnection)
      closeHandler(1006, 'Abnormal closure');
      // Note: In real test, we'd verify reconnection attempt
    });
  });

  describe('Error Handling', () => {
    it('should determine correct error codes', () => {
      const errorSpy = jest.fn();
      adapter.on(DeepgramStreamAdapter.EVENTS.ERROR, errorSpy);
      
      // Connect and get error handler
      adapter.connect().catch(() => {}); // Ignore rejection
      const errorHandler = mockWs.on.mock.calls.find(call => call[0] === 'error')[1];
      
      // Test different error codes
      errorHandler({ code: 4000 });
      expect(errorSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ code: 'BAD_REQUEST' })
      );
      
      errorHandler({ code: 4001 });
      expect(errorSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ code: 'UNAUTHORIZED' })
      );
      
      errorHandler({ message: '400 Bad Request' });
      expect(errorSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ code: 'INVALID_FORMAT' })
      );
    });
  });

  describe('Metrics', () => {
    it('should track connection metrics', async () => {
      // Connect
      const connectPromise = adapter.connect();
      const openHandler = mockWs.on.mock.calls.find(call => call[0] === 'open')[1];
      openHandler();
      await connectPromise;
      
      // Send audio
      const buffer = Buffer.from([1, 2, 3, 4, 5]);
      adapter.sendAudio(buffer);
      
      // Receive message
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
      const message = Buffer.from(JSON.stringify({ type: 'Metadata' }));
      messageHandler(message);
      
      const metrics = adapter.getConnectionMetrics();
      expect(metrics).toMatchObject({
        connected: true,
        bytesSent: 5,
        bytesReceived: message.length,
        messagesSent: 1,
        messagesReceived: 1
      });
      expect(metrics.connectionStartTime).toBeDefined();
      expect(metrics.lastActivityTime).toBeDefined();
    });
  });
});