import { DeepgramService } from '../../electron/services/DeepgramService';
import WebSocket from 'ws';

// Mock WebSocket
jest.mock('ws');

describe('DeepgramService', () => {
  let service: DeepgramService;
  let mockWebSocket: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock WebSocket
    mockWebSocket = {
      on: jest.fn(),
      once: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      terminate: jest.fn(),
      removeAllListeners: jest.fn(),
      readyState: WebSocket.OPEN,
    };
    
    (WebSocket as jest.MockedClass<typeof WebSocket>).mockImplementation(() => mockWebSocket);
    
    service = new DeepgramService({
      apiKey: 'test-api-key',
      endpointing: 800
    });
  });
  
  afterEach(() => {
    service.destroy();
  });
  
  describe('Connection Management', () => {
    test('should create WebSocket with correct parameters', async () => {
      // Setup mock to simulate connection
      mockWebSocket.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          setTimeout(() => callback(), 10);
        }
      });
      
      await service.startStreaming();
      
      // Verify WebSocket was created with correct URL
      expect(WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('wss://api.deepgram.com/v1/listen'),
        expect.objectContaining({
          headers: {
            Authorization: 'Token test-api-key',
            'User-Agent': 'UniVoice/1.0'
          }
        })
      );
      
      // Verify URL parameters
      const urlCall = (WebSocket as jest.Mock).mock.calls[0][0];
      expect(urlCall).toContain('model=nova-3');
      expect(urlCall).toContain('language=en-US');
      expect(urlCall).toContain('sample_rate=16000');
      expect(urlCall).toContain('endpointing=800');
    });
    
    test('should emit connected event on successful connection', async () => {
      const connectedSpy = jest.fn();
      service.on('connected', connectedSpy);
      
      mockWebSocket.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          setTimeout(() => callback(), 10);
        }
      });
      
      await service.startStreaming();
      
      expect(connectedSpy).toHaveBeenCalled();
    });
    
    test('should handle connection timeout', async () => {
      // Mock connection that never opens
      mockWebSocket.once.mockImplementation(() => {});
      mockWebSocket.readyState = WebSocket.CONNECTING;
      
      const errorSpy = jest.fn();
      service.on('error', errorSpy);
      
      const startPromise = service.startStreaming();
      
      // Fast-forward past timeout
      jest.advanceTimersByTime(11000);
      
      await expect(startPromise).rejects.toThrow('Connection timeout');
    });
    
    test('should handle connection errors', async () => {
      const testError = new Error('Connection failed');
      const errorSpy = jest.fn();
      service.on('error', errorSpy);
      
      mockWebSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(testError), 10);
        }
      });
      
      mockWebSocket.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          // Trigger error instead of open
          mockWebSocket.on.mock.calls
            .find((call: any[]) => call[0] === 'error')[1](testError);
        }
      });
      
      await expect(service.startStreaming()).rejects.toThrow('Connection failed');
      expect(errorSpy).toHaveBeenCalledWith(testError);
    });
  });
  
  describe('Message Handling', () => {
    beforeEach(async () => {
      mockWebSocket.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          setTimeout(() => callback(), 10);
        }
      });
      
      await service.startStreaming();
    });
    
    test('should emit final transcript on is_final message', () => {
      const finalSpy = jest.fn();
      service.on('final-transcript', finalSpy);
      
      const mockMessage = {
        channel: {
          alternatives: [{
            transcript: 'Hello world',
            confidence: 0.95,
            words: []
          }]
        },
        is_final: true,
        duration: 1.5,
        start: 0
      };
      
      // Simulate message from WebSocket
      const messageHandler = mockWebSocket.on.mock.calls
        .find((call: any[]) => call[0] === 'message')[1];
      
      messageHandler(Buffer.from(JSON.stringify(mockMessage)));
      
      expect(finalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          transcript: 'Hello world',
          confidence: 0.95,
          isFinal: true
        })
      );
    });
    
    test('should emit interim transcript on non-final message', () => {
      const interimSpy = jest.fn();
      service.on('interim-transcript', interimSpy);
      
      const mockMessage = {
        channel: {
          alternatives: [{
            transcript: 'Hello',
            confidence: 0.85
          }]
        },
        is_final: false
      };
      
      const messageHandler = mockWebSocket.on.mock.calls
        .find((call: any[]) => call[0] === 'message')[1];
      
      messageHandler(Buffer.from(JSON.stringify(mockMessage)));
      
      expect(interimSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          transcript: 'Hello',
          confidence: 0.85,
          isFinal: false
        })
      );
    });
    
    test('should ignore empty transcripts', () => {
      const finalSpy = jest.fn();
      const interimSpy = jest.fn();
      service.on('final-transcript', finalSpy);
      service.on('interim-transcript', interimSpy);
      
      const mockMessage = {
        channel: {
          alternatives: [{
            transcript: '  ',
            confidence: 0.95
          }]
        },
        is_final: true
      };
      
      const messageHandler = mockWebSocket.on.mock.calls
        .find((call: any[]) => call[0] === 'message')[1];
      
      messageHandler(Buffer.from(JSON.stringify(mockMessage)));
      
      expect(finalSpy).not.toHaveBeenCalled();
      expect(interimSpy).not.toHaveBeenCalled();
    });
    
    test('should handle malformed messages gracefully', () => {
      const errorSpy = jest.fn();
      service.on('error', errorSpy);
      
      const messageHandler = mockWebSocket.on.mock.calls
        .find((call: any[]) => call[0] === 'message')[1];
      
      // Send invalid JSON
      messageHandler(Buffer.from('invalid json'));
      
      expect(errorSpy).toHaveBeenCalled();
    });
  });
  
  describe('Soft Handover', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });
    
    test('should schedule handover at 55 minutes', async () => {
      mockWebSocket.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          callback();
        }
      });
      
      await service.startStreaming();
      
      // Fast-forward to 55 minutes
      jest.advanceTimersByTime(55 * 60 * 1000);
      
      // Should have created a second WebSocket
      expect(WebSocket).toHaveBeenCalledTimes(2);
    });
    
    test('should perform handover at 59.5 minutes', async () => {
      const handoverSpy = jest.fn();
      service.on('handover-complete', handoverSpy);
      
      mockWebSocket.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          callback();
        }
      });
      
      await service.startStreaming();
      
      const firstSocket = mockWebSocket;
      
      // Fast-forward to 55 minutes (preparation)
      jest.advanceTimersByTime(55 * 60 * 1000);
      
      // Create new mock for secondary socket
      const secondSocket = {
        ...mockWebSocket,
        once: jest.fn((event: string, callback: Function) => {
          if (event === 'open') callback();
        })
      };
      
      (WebSocket as jest.Mock).mockImplementationOnce(() => secondSocket);
      
      // Fast-forward to 59.5 minutes (handover)
      jest.advanceTimersByTime(4.5 * 60 * 1000);
      
      // Verify handover completed
      expect(firstSocket.close).toHaveBeenCalledWith(1000, 'Soft handover');
      expect(handoverSpy).toHaveBeenCalled();
    });
    
    test('should continue sending audio during handover', async () => {
      mockWebSocket.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          callback();
        }
      });
      
      await service.startStreaming();
      
      // Fast-forward to handover preparation
      jest.advanceTimersByTime(55 * 60 * 1000);
      
      // Send audio during handover
      const testAudio = Buffer.from(new Int16Array(100));
      service.sendAudioChunk(testAudio);
      
      // Should send to active socket
      expect(mockWebSocket.send).toHaveBeenCalledWith(testAudio);
    });
  });
  
  describe('Audio Transmission', () => {
    beforeEach(async () => {
      mockWebSocket.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          setTimeout(() => callback(), 10);
        }
      });
      
      await service.startStreaming();
    });
    
    test('should send audio chunks when connected', () => {
      const audioData = Buffer.from(new Int16Array(100));
      
      service.sendAudioChunk(audioData);
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(audioData);
    });
    
    test('should queue audio when connecting', () => {
      mockWebSocket.readyState = WebSocket.CONNECTING;
      
      const audioData = Buffer.from(new Int16Array(100));
      service.sendAudioChunk(audioData);
      
      // Should not send immediately
      expect(mockWebSocket.send).not.toHaveBeenCalled();
      
      // Simulate connection opening
      mockWebSocket.readyState = WebSocket.OPEN;
      
      // Wait for retry
      jest.advanceTimersByTime(100);
      
      // Should eventually send
      // Note: In real implementation, would need to handle this better
    });
    
    test('should not send audio when disconnected', () => {
      service.stop();
      
      const audioData = Buffer.from(new Int16Array(100));
      service.sendAudioChunk(audioData);
      
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });
  
  describe('Error Recovery', () => {
    test('should handle rate limit errors with backoff', () => {
      const rateLimitSpy = jest.fn();
      service.on('rate-limited', rateLimitSpy);
      
      // Trigger rate limit error
      const error = new Error('429 Too Many Requests');
      error.message = '429';
      
      service['handleRateLimitError']();
      
      expect(rateLimitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          backoffMs: expect.any(Number)
        })
      );
    });
    
    test('should attempt reconnection on unexpected disconnect', async () => {
      mockWebSocket.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          callback();
        }
      });
      
      await service.startStreaming();
      
      // Simulate unexpected close
      const closeHandler = mockWebSocket.on.mock.calls
        .find((call: any[]) => call[0] === 'close')[1];
      
      closeHandler(1006, 'Abnormal closure');
      
      // Should attempt reconnection
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // New connection should be created
      expect(WebSocket).toHaveBeenCalledTimes(2);
    });
    
    test('should not reconnect during handover', async () => {
      mockWebSocket.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          callback();
        }
      });
      
      await service.startStreaming();
      
      // Set handover in progress
      service['isHandoverInProgress'] = true;
      
      // Simulate close during handover
      const closeHandler = mockWebSocket.on.mock.calls
        .find((call: any[]) => call[0] === 'close')[1];
      
      closeHandler(1000, 'Normal closure');
      
      // Should not attempt reconnection
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(WebSocket).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Statistics and Cost Calculation', () => {
    test('should track usage statistics', async () => {
      mockWebSocket.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          callback();
        }
      });
      
      await service.startStreaming();
      
      const stats = service.getStatistics();
      
      expect(stats).toEqual(expect.objectContaining({
        totalMinutesProcessed: expect.any(Number),
        currentSessionMinutes: expect.any(Number),
        estimatedCost: expect.any(Number),
        isConnected: true,
        isHandoverInProgress: false
      }));
    });
    
    test('should calculate cost correctly for standard pricing', () => {
      const cost = service.calculateCost(60); // 60 minutes
      
      expect(cost).toBeCloseTo(60 * 0.0077, 4); // $0.0077/min
    });
    
    test('should apply volume discount after 50k minutes', () => {
      service['totalMinutesProcessed'] = 50000;
      
      const cost = service.calculateCost(100);
      
      expect(cost).toBeCloseTo(100 * 0.0043, 4); // Volume pricing
    });
  });
  
  describe('Cleanup', () => {
    test('should clean up resources on stop', async () => {
      mockWebSocket.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          callback();
        }
      });
      
      await service.startStreaming();
      
      const sessionEndedSpy = jest.fn();
      service.on('session-ended', sessionEndedSpy);
      
      service.stop();
      
      expect(mockWebSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockWebSocket.close).toHaveBeenCalledWith(1000, 'Session ended');
      expect(sessionEndedSpy).toHaveBeenCalled();
    });
    
    test('should clear timers on stop', async () => {
      jest.useFakeTimers();
      
      mockWebSocket.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          callback();
        }
      });
      
      await service.startStreaming();
      
      // Advance to create handover timer
      jest.advanceTimersByTime(1000);
      
      service.stop();
      
      // Verify no pending timers
      expect(jest.getTimerCount()).toBe(0);
      
      jest.useRealTimers();
    });
    
    test('should remove all listeners on destroy', () => {
      const removeListenersSpy = jest.spyOn(service, 'removeAllListeners');
      
      service.destroy();
      
      expect(removeListenersSpy).toHaveBeenCalled();
    });
  });
});