import { DeepgramStreamAdapter, DeepgramAdapterConfig, TranscriptResult, DeepgramError } from '../../electron/services/adapters/DeepgramStreamAdapter';
import { createClient } from '@deepgram/sdk';
import { WebSocket } from 'ws';

// Mock @deepgram/sdk
const mockDeepgramConnection = {
  on: jest.fn(),
  send: jest.fn(),
  finish: jest.fn(),
  removeAllListeners: jest.fn(),
};

jest.mock('@deepgram/sdk', () => ({
  createClient: jest.fn(() => ({
    listen: {
      live: jest.fn(() => mockDeepgramConnection),
    },
  })),
}));

// Mock ws - Keep this for any direct WebSocket usage fallback
jest.mock('ws', () => ({
  WebSocket: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1, // WebSocket.OPEN
  })),
}));

const mockedCreateClient = createClient as jest.Mock;

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

  // Helper to trigger events on the mock connection
  const triggerDeepgramEvent = (event: string, ...args: any[]) => {
    const onCall = mockDeepgramConnection.on.mock.calls.find(call => call[0] === event);
    if (onCall && onCall[1]) {
      onCall[1](...args);
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new DeepgramStreamAdapter(mockConfig);
  });

  afterEach(() => {
    adapter.destroy();
  });

  describe('Connection', () => {
    it('should connect to Deepgram with correct parameters', async () => {
      const connectPromise = adapter.connect();
      
      expect(mockedCreateClient).toHaveBeenCalledWith('test-api-key');
      const liveMock = mockedCreateClient.mock.results[0].value.listen.live;
      expect(liveMock).toHaveBeenCalledWith({
        model: 'nova-3',
        language: 'en',
        interim_results: true,
        endpointing: 800,
        utterance_end_ms: 1000,
        smart_format: true,
        sample_rate: 16000,
      });

      triggerDeepgramEvent('open');
      await connectPromise;

      expect(adapter.isConnected()).toBe(true);
    });

    it('should emit connected event when connection opens', async () => {
      const mockConnected = jest.fn();
      adapter.on('connected', mockConnected);

      const connectPromise = adapter.connect();
      triggerDeepgramEvent('open');
      await connectPromise;

      expect(mockConnected).toHaveBeenCalledTimes(1);
    });
  });

  describe('Audio Sending', () => {
    beforeEach(async () => {
      const connectPromise = adapter.connect();
      triggerDeepgramEvent('open');
      await connectPromise;
    });

    it('should send audio buffer when connected', () => {
      const audioBuffer = Buffer.from('test audio');
      adapter.sendAudio(audioBuffer);

      expect(mockDeepgramConnection.send).toHaveBeenCalledTimes(1);
      expect(mockDeepgramConnection.send).toHaveBeenCalledWith(audioBuffer);
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      const connectPromise = adapter.connect();
      triggerDeepgramEvent('open');
      await connectPromise;
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
      triggerDeepgramEvent('transcript', deepgramMessage);

      expect(mockTranscript).toHaveBeenCalledTimes(1);
      expect(mockTranscript).toHaveBeenCalledWith(expect.objectContaining({
        text: 'Hello world',
      }));
    });
  });

  describe('Disconnection', () => {
    beforeEach(async () => {
      const connectPromise = adapter.connect();
      triggerDeepgramEvent('open');
      await connectPromise;
    });

    it('should call finish on disconnect', () => {
      adapter.disconnect();
      expect(mockDeepgramConnection.finish).toHaveBeenCalledTimes(1);
      expect(adapter.isConnected()).toBe(false);
    });
  });
});

