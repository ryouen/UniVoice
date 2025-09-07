/**
 * Test duplicate prevention in useUnifiedPipeline
 */

import { renderHook, act } from '@testing-library/react';
import { useUnifiedPipeline } from '../../src/hooks/useUnifiedPipeline';

// Mock window.univoice and window.electron
global.window = {
  ...global.window,
  univoice: {
    onPipelineEvent: jest.fn(() => () => {}),
    generateCorrelationId: jest.fn(() => 'test-correlation-id'),
    startListening: jest.fn(() => Promise.resolve({ success: true })),
    stopListening: jest.fn(() => Promise.resolve({ success: true })),
    clearHistory: jest.fn(() => Promise.resolve()),
    generateVocabulary: jest.fn(() => Promise.resolve({ success: true })),
    generateFinalReport: jest.fn(() => Promise.resolve({ success: true }))
  },
  electron: {
    on: jest.fn(),
    removeListener: jest.fn(),
    sendAudioChunk: jest.fn()
  }
} as any;

describe('useUnifiedPipeline duplicate prevention', () => {
  let eventHandlers: { [key: string]: Function[] } = {};
  
  beforeEach(() => {
    // Reset event handlers
    eventHandlers = {};
    
    // Mock electron.on to capture event handlers
    (window.electron.on as jest.Mock).mockImplementation((event: string, handler: Function) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    });
    
    // Mock electron.removeListener
    (window.electron.removeListener as jest.Mock).mockImplementation((event: string, handler: Function) => {
      if (eventHandlers[event]) {
        eventHandlers[event] = eventHandlers[event].filter(h => h !== handler);
      }
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('should prevent duplicate entries in history when translationComplete is fired multiple times', () => {
    const { result } = renderHook(() => useUnifiedPipeline());
    
    // Initial state check
    expect(result.current.history).toHaveLength(0);
    
    // Create a translation object
    const translation = {
      id: 'segment-123-xyz',
      original: 'Hello world',
      japanese: 'こんにちは世界',
      timestamp: Date.now(),
      firstPaintMs: 100,
      completeMs: 200
    };
    
    // Simulate translationComplete event
    act(() => {
      const handlers = eventHandlers['translation-complete'] || [];
      handlers.forEach(handler => handler({}, translation));
    });
    
    // Check that translation was added
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].id).toBe('segment-123-xyz');
    
    // Simulate duplicate translationComplete event
    act(() => {
      const handlers = eventHandlers['translation-complete'] || [];
      handlers.forEach(handler => handler({}, translation));
    });
    
    // Check that duplicate was not added
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].id).toBe('segment-123-xyz');
  });
  
  it('should handle multiple different translations correctly', () => {
    const { result } = renderHook(() => useUnifiedPipeline());
    
    const translation1 = {
      id: 'segment-001',
      original: 'First sentence',
      japanese: '最初の文',
      timestamp: Date.now(),
      firstPaintMs: 100,
      completeMs: 200
    };
    
    const translation2 = {
      id: 'segment-002',
      original: 'Second sentence',
      japanese: '二番目の文',
      timestamp: Date.now() + 1000,
      firstPaintMs: 150,
      completeMs: 250
    };
    
    // Add first translation
    act(() => {
      const handlers = eventHandlers['translation-complete'] || [];
      handlers.forEach(handler => handler({}, translation1));
    });
    
    expect(result.current.history).toHaveLength(1);
    
    // Add second translation
    act(() => {
      const handlers = eventHandlers['translation-complete'] || [];
      handlers.forEach(handler => handler({}, translation2));
    });
    
    expect(result.current.history).toHaveLength(2);
    expect(result.current.history[0].id).toBe('segment-001');
    expect(result.current.history[1].id).toBe('segment-002');
  });
  
  it('should clear duplicate tracking sets on clearAll', async () => {
    const { result } = renderHook(() => useUnifiedPipeline());
    
    const translation = {
      id: 'segment-456',
      original: 'Test sentence',
      japanese: 'テスト文',
      timestamp: Date.now(),
      firstPaintMs: 100,
      completeMs: 200
    };
    
    // Add translation
    act(() => {
      const handlers = eventHandlers['translation-complete'] || [];
      handlers.forEach(handler => handler({}, translation));
    });
    
    expect(result.current.history).toHaveLength(1);
    
    // Clear all
    await act(async () => {
      await result.current.clearAll();
    });
    
    expect(result.current.history).toHaveLength(0);
    
    // Add same translation again (should work after clearAll)
    act(() => {
      const handlers = eventHandlers['translation-complete'] || [];
      handlers.forEach(handler => handler({}, translation));
    });
    
    expect(result.current.history).toHaveLength(1);
  });
});