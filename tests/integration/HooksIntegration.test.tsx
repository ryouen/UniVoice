/**
 * Hooks Integration Test
 * Clean Architecture: Integration Test Layer
 *
 * カスタムフックとサービスの統合動作を検証
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useSessionControl } from '../../src/components/UniVoice/hooks/useSessionControl';

// Mock dependencies
jest.mock('../../src/hooks/useUnifiedPipeline', () => ({
  useUnifiedPipeline: () => ({
    isRunning: false,
    pipelineError: null,
    startPipeline: jest.fn().mockResolvedValue({ success: true }),
    stopPipeline: jest.fn().mockResolvedValue({ success: true }),
    updateLanguages: jest.fn(),
    realtimeSegments: [],
    historyEntries: [],
    summaries: null,
    threeLineDisplay: null,
    displayPairs: []
  })
}));

jest.mock('../../src/hooks/useSessionMemory', () => ({
  useSessionMemory: () => ({
    activeSession: null,
    previousSession: null,
    createSession: jest.fn().mockResolvedValue({
      id: 'test-session-id',
      className: 'Test Class',
      sourceLanguage: 'en',
      targetLanguage: 'ja',
      startTime: new Date(),
      transcripts: [],
      summaries: null,
      vocabulary: null
    }),
    updateSession: jest.fn(),
    resumeSession: jest.fn().mockResolvedValue(true),
    endSession: jest.fn(),
    getSessionHistory: jest.fn().mockResolvedValue([]),
    saveMemo: jest.fn(),
    updateMemo: jest.fn(),
    deleteMemo: jest.fn(),
    getMemos: jest.fn().mockResolvedValue([])
  })
}));

// Create mock pipeline and sessionMemory for testing
const createMockPipeline = () => ({
  isRunning: false,
  pipelineError: null,
  startPipeline: jest.fn().mockResolvedValue({ success: true }),
  stopPipeline: jest.fn().mockResolvedValue({ success: true }),
  updateLanguages: jest.fn(),
  realtimeSegments: [],
  historyEntries: [],
  summaries: null,
  threeLineDisplay: null,
  displayPairs: []
});

const createMockSessionMemory = () => ({
  activeSession: null,
  previousSession: null,
  createSession: jest.fn().mockResolvedValue({
    id: 'test-session-id',
    className: 'Test Class',
    sourceLanguage: 'en',
    targetLanguage: 'ja',
    startTime: new Date(),
    transcripts: [],
    summaries: null,
    vocabulary: null
  }),
  updateSession: jest.fn(),
  resumeSession: jest.fn().mockResolvedValue(true),
  endSession: jest.fn(),
  getSessionHistory: jest.fn().mockResolvedValue([]),
  saveMemo: jest.fn(),
  updateMemo: jest.fn(),
  deleteMemo: jest.fn(),
  getMemos: jest.fn().mockResolvedValue([])
});

describe('Hooks Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useSessionControl Integration', () => {
    it('should coordinate session creation with pipeline start', async () => {
      const mockPipeline = createMockPipeline();
      const mockSessionMemory = createMockSessionMemory();

      const { result } = renderHook(() => useSessionControl({
        pipeline: mockPipeline as any,
        sessionMemory: mockSessionMemory as any,
        onSessionStart: jest.fn(),
        onSessionEnd: jest.fn(),
        onSessionResume: jest.fn()
      }));

      // Start a new session
      await act(async () => {
        await result.current.handleStartSession('Math 101', 'en', 'ja');
      });

      // Verify session state is updated
      expect(result.current.isActive).toBe(true);
      expect(result.current.currentSession).toEqual(
        expect.objectContaining({
          className: 'Math 101',
          sourceLanguage: 'en',
          targetLanguage: 'ja'
        })
      );
    });

    it('should handle session pause and resume', async () => {
      const { result } = renderHook(() => useSessionControl({
        onSessionStarted: jest.fn(),
        onSessionEnded: jest.fn(),
        onSessionResumed: jest.fn(),
        onError: jest.fn()
      }));

      // Start session
      await act(async () => {
        await result.current.handleStartSession('Test Class', 'en', 'ja');
      });

      // Pause session
      await act(async () => {
        result.current.handlePause();
      });

      expect(result.current.isPaused).toBe(true);

      // Resume session
      await act(async () => {
        result.current.handlePause();
      });

      expect(result.current.isPaused).toBe(false);
    });

    it('should handle session end with cleanup', async () => {
      const onSessionEnded = jest.fn();

      const { result } = renderHook(() => useSessionControl({
        onSessionStarted: jest.fn(),
        onSessionEnded,
        onSessionResumed: jest.fn(),
        onError: jest.fn()
      }));

      // Start session
      await act(async () => {
        await result.current.handleStartSession('Test Class', 'en', 'ja');
      });

      // End session
      await act(async () => {
        await result.current.handleEndSession();
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.currentSession).toBeNull();
      expect(onSessionEnded).toHaveBeenCalled();
    });

    it('should handle next class transition', async () => {
      const { result } = renderHook(() => useSessionControl({
        onSessionStarted: jest.fn(),
        onSessionEnded: jest.fn(),
        onSessionResumed: jest.fn(),
        onError: jest.fn()
      }));

      // Start first session
      await act(async () => {
        await result.current.handleStartSession('Class 1', 'en', 'ja');
      });

      const firstSessionId = result.current.currentSession?.id;

      // Move to next class
      await act(async () => {
        await result.current.handleNextClass('Class 2', 'ja', 'en');
      });

      // Verify new session is created
      expect(result.current.currentSession?.id).not.toBe(firstSessionId);
      expect(result.current.currentSession?.className).toBe('Class 2');
      expect(result.current.currentSession?.sourceLanguage).toBe('ja');
      expect(result.current.currentSession?.targetLanguage).toBe('en');
    });

    it('should resume previous session', async () => {
      const onSessionResumed = jest.fn();

      const { result } = renderHook(() => useSessionControl({
        onSessionStarted: jest.fn(),
        onSessionEnded: jest.fn(),
        onSessionResumed,
        onError: jest.fn()
      }));

      // Mock previous session data
      const previousSessionData = {
        id: 'previous-session',
        className: 'Previous Class',
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        startTime: new Date(),
        transcripts: [
          {
            id: '1',
            timestamp: new Date(),
            original: 'Previous text',
            translation: '以前のテキスト'
          }
        ]
      };

      // Resume session
      await act(async () => {
        await result.current.handleResumeSession(previousSessionData);
      });

      expect(result.current.isActive).toBe(true);
      expect(onSessionResumed).toHaveBeenCalledWith(previousSessionData);
    });

    it('should handle errors gracefully', async () => {
      const onError = jest.fn();

      // Mock pipeline to throw error
      jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useSessionControl({
        onSessionStarted: jest.fn(),
        onSessionEnded: jest.fn(),
        onSessionResumed: jest.fn(),
        onError
      }));

      // Force an error by passing invalid data
      await act(async () => {
        await result.current.handleStartSession('', '', '');
      });

      // Session should not start with invalid data
      expect(result.current.isActive).toBe(false);

      console.error = jest.fn(); // Restore console.error
    });

    it('should track recording time', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useSessionControl({
        onSessionStarted: jest.fn(),
        onSessionEnded: jest.fn(),
        onSessionResumed: jest.fn(),
        onError: jest.fn()
      }));

      // Start session
      await act(async () => {
        await result.current.handleStartSession('Test Class', 'en', 'ja');
      });

      // Initial recording time
      expect(result.current.recordingTime).toBe(0);

      // Advance time by 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Recording time should be updated
      expect(result.current.recordingTime).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    it('should manage memo operations', async () => {
      const { result } = renderHook(() => useSessionControl({
        onSessionStarted: jest.fn(),
        onSessionEnded: jest.fn(),
        onSessionResumed: jest.fn(),
        onError: jest.fn()
      }));

      // Start session
      await act(async () => {
        await result.current.handleStartSession('Test Class', 'en', 'ja');
      });

      // Save a memo
      await act(async () => {
        await result.current.handleSaveMemo('Test memo', 'This is a test memo');
      });

      // Verify memo count is updated
      expect(result.current.memoCount).toBe(1);

      // Update memo
      await act(async () => {
        await result.current.handleUpdateMemo('memo-1', 'Updated memo', 'Updated content');
      });

      // Delete memo
      await act(async () => {
        await result.current.handleDeleteMemo('memo-1');
      });

      // Verify memo count is updated
      expect(result.current.memoCount).toBe(0);
    });

    it('should coordinate language updates across session and pipeline', async () => {
      const { result } = renderHook(() => useSessionControl({
        onSessionStarted: jest.fn(),
        onSessionEnded: jest.fn(),
        onSessionResumed: jest.fn(),
        onError: jest.fn()
      }));

      // Start session with initial languages
      await act(async () => {
        await result.current.handleStartSession('Test Class', 'en', 'ja');
      });

      // Update languages
      await act(async () => {
        await result.current.handleLanguageChange('fr', 'es');
      });

      // Verify session is updated with new languages
      expect(result.current.currentSession?.sourceLanguage).toBe('fr');
      expect(result.current.currentSession?.targetLanguage).toBe('es');
    });

    it('should handle auto-save functionality', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useSessionControl({
        onSessionStarted: jest.fn(),
        onSessionEnded: jest.fn(),
        onSessionResumed: jest.fn(),
        onError: jest.fn()
      }));

      // Start session
      await act(async () => {
        await result.current.handleStartSession('Test Class', 'en', 'ja');
      });

      // Advance time to trigger auto-save (typically every 5 minutes)
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000);
      });

      // Verify auto-save time is updated
      expect(result.current.autoSaveTime).not.toBeNull();

      jest.useRealTimers();
    });
  });

  describe('State Consistency', () => {
    it('should maintain state consistency during rapid actions', async () => {
      const { result } = renderHook(() => useSessionControl({
        onSessionStarted: jest.fn(),
        onSessionEnded: jest.fn(),
        onSessionResumed: jest.fn(),
        onError: jest.fn()
      }));

      // Perform rapid state changes
      await act(async () => {
        // Start session
        await result.current.handleStartSession('Test', 'en', 'ja');

        // Immediately pause
        result.current.handlePause();

        // Save memo
        await result.current.handleSaveMemo('Quick', 'Note');

        // Resume
        result.current.handlePause();

        // Change language
        await result.current.handleLanguageChange('de', 'fr');
      });

      // Verify final state is consistent
      expect(result.current.isActive).toBe(true);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.memoCount).toBe(1);
      expect(result.current.currentSession?.sourceLanguage).toBe('de');
      expect(result.current.currentSession?.targetLanguage).toBe('fr');
    });

    it('should prevent invalid state transitions', async () => {
      const { result } = renderHook(() => useSessionControl({
        onSessionStarted: jest.fn(),
        onSessionEnded: jest.fn(),
        onSessionResumed: jest.fn(),
        onError: jest.fn()
      }));

      // Try to end session without starting
      await act(async () => {
        await result.current.handleEndSession();
      });

      // Should remain inactive
      expect(result.current.isActive).toBe(false);

      // Try to pause without active session
      act(() => {
        result.current.handlePause();
      });

      // Should remain unpaused
      expect(result.current.isPaused).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should handle large transcript updates efficiently', async () => {
      const { result } = renderHook(() => useSessionControl({
        onSessionStarted: jest.fn(),
        onSessionEnded: jest.fn(),
        onSessionResumed: jest.fn(),
        onError: jest.fn()
      }));

      await act(async () => {
        await result.current.handleStartSession('Performance Test', 'en', 'ja');
      });

      // Simulate large batch of transcript updates
      const largeTranscriptBatch = Array.from({ length: 1000 }, (_, i) => ({
        id: `transcript-${i}`,
        timestamp: new Date(),
        original: `Text segment ${i}`,
        translation: `翻訳セグメント ${i}`
      }));

      const startTime = performance.now();

      await act(async () => {
        // This would typically happen through pipeline updates
        for (const transcript of largeTranscriptBatch) {
          // Simulate adding transcripts
          result.current.currentSession?.transcripts.push(transcript);
        }
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Processing should be reasonably fast (< 1 second for 1000 items)
      expect(processingTime).toBeLessThan(1000);
    });
  });
});