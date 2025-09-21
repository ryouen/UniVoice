/**
 * useRealtimeTranscription Hook
 * 
 * Responsible for handling ASR (Automatic Speech Recognition) events
 * and managing real-time transcription display.
 * Follows Clean Architecture principles for separation of concerns.
 * 
 * @module hooks/useRealtimeTranscription
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { SyncedRealtimeDisplayManager } from '../utils/SyncedRealtimeDisplayManager';
import { IncrementalTextManager } from '../utils/IncrementalTextManager';
import { TranslationTimeoutManager } from '../utils/TranslationTimeoutManager';
import type { PipelineEvent } from '../shared/types/contracts';

/**
 * Segment information for tracking transcription segments
 */
interface SegmentInfo {
  id: string;
  originalText: string;
  timestamp: number;
  isFinal: boolean;
}

/**
 * Options for the real-time transcription hook
 */
interface UseRealtimeTranscriptionOptions {
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
  /** Callback when transcription is updated */
  onTranscriptionUpdate?: (text: string, isFinal: boolean, segmentId: string) => void;
  /** Callback when a segment is completed */
  onSegmentComplete?: (segmentId: string, text: string) => void;
  /** Callback when translation times out */
  onTranslationTimeout?: (segmentId: string, originalText: string) => void;
  /** Error handler callback */
  onError?: (error: Error) => void;
  /** Translation timeout in milliseconds (default: 7000) */
  translationTimeoutMs?: number;
}

/**
 * Return type for the real-time transcription hook
 */
interface UseRealtimeTranscriptionReturn {
  /** Current transcription text */
  currentTranscription: string;
  /** Segments waiting for translation */
  pendingSegments: Map<string, SegmentInfo>;
  /** Display manager instance */
  displayManager: SyncedRealtimeDisplayManager | null;
  /** Text manager instance */
  textManager: IncrementalTextManager | null;
  /** Handler for ASR events */
  handleASREvent: (event: PipelineEvent) => void;
  /** Clear current transcription */
  clearTranscription: () => void;
  /** Reset all managers */
  resetManagers: () => void;
  /** Update display pairs callback (for integration) */
  setDisplayPairsCallback: (callback: (pairs: any[]) => void) => void;
  /** Clear translation timeout for a specific segment */
  clearTranslationTimeout: (segmentId: string) => boolean;
}

/**
 * Hook for managing real-time transcription with ASR events
 * 
 * @param options Configuration options
 * @returns Real-time transcription controls and state
 */
export const useRealtimeTranscription = (options: UseRealtimeTranscriptionOptions = {}): UseRealtimeTranscriptionReturn => {
  const {
    enabled = true,
    onTranscriptionUpdate,
    onSegmentComplete,
    onTranslationTimeout,
    onError,
    translationTimeoutMs = 7000
  } = options;

  // State management
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [pendingSegments] = useState<Map<string, SegmentInfo>>(new Map());

  // Manager references
  const displayManagerRef = useRef<SyncedRealtimeDisplayManager | null>(null);
  const textManagerRef = useRef<IncrementalTextManager | null>(null);
  const timeoutManagerRef = useRef<TranslationTimeoutManager | null>(null);

  // Callback for display pairs update
  const displayPairsCallbackRef = useRef<(pairs: any[]) => void>(() => {});

  /**
   * Set the callback for display pairs updates
   */
  const setDisplayPairsCallback = useCallback((callback: (pairs: any[]) => void) => {
    displayPairsCallbackRef.current = callback;
    
    // Update display manager if it exists
    if (displayManagerRef.current) {
      displayManagerRef.current = new SyncedRealtimeDisplayManager(callback);
    }
  }, []);

  /**
   * Initialize managers
   */
  useEffect(() => {
    if (!enabled) return;

    // Initialize SyncedRealtimeDisplayManager
    if (!displayManagerRef.current) {
      displayManagerRef.current = new SyncedRealtimeDisplayManager(
        (pairs) => {
          console.log('[useRealtimeTranscription] Display manager update:', {
            pairCount: pairs.length,
            pairs: pairs.map(p => ({
              id: p.id,
              originalLength: p.original.text.length,
              translationLength: p.translation.text.length,
              isFinal: p.original.isFinal
            }))
          });
          displayPairsCallbackRef.current(pairs);
        }
      );
    }

    // Initialize IncrementalTextManager
    if (!textManagerRef.current) {
      textManagerRef.current = new IncrementalTextManager(
        (text, isStable) => {
          console.log('[useRealtimeTranscription] Text manager update:', {
            textLength: text?.length,
            isStable,
            preview: text?.substring(0, 50) + '...'
          });
          setCurrentTranscription(text);
        },
        800 // 0.8秒で確定
      );
    }

    // Initialize TranslationTimeoutManager
    if (!timeoutManagerRef.current) {
      timeoutManagerRef.current = new TranslationTimeoutManager({
        defaultTimeout: translationTimeoutMs
      });
    }

    // Cleanup on unmount
    return () => {
      if (displayManagerRef.current) {
        displayManagerRef.current = null;
      }
      if (textManagerRef.current) {
        textManagerRef.current.reset();
        textManagerRef.current = null;
      }
      if (timeoutManagerRef.current) {
        timeoutManagerRef.current.destroy();
        timeoutManagerRef.current = null;
      }
    };
  }, [enabled, translationTimeoutMs]);

  /**
   * Handle ASR event
   */
  const handleASREvent = useCallback((event: PipelineEvent) => {
    if (!enabled || event.type !== 'asr') return;

    console.log('[useRealtimeTranscription] ASR event received:', {
      text: event.data.text?.substring(0, 50) + '...',
      isFinal: event.data.isFinal,
      segmentId: event.data.segmentId
    });

    // Special logging for final results
    if (event.data.isFinal) {
      console.log('[useRealtimeTranscription] Final ASR result:', {
        segmentId: event.data.segmentId,
        textLength: event.data.text?.length,
        text: event.data.text
      });
    }

    // Update display manager
    if (displayManagerRef.current) {
      displayManagerRef.current.updateOriginal(
        event.data.text,
        event.data.isFinal,
        event.data.segmentId || `interim_${Date.now()}`
      );

      // Track segment for translation pairing
      if (event.data.isFinal && event.data.segmentId) {
        const segmentInfo: SegmentInfo = {
          id: event.data.segmentId,
          originalText: event.data.text,
          timestamp: Date.now(),
          isFinal: true
        };

        pendingSegments.set(event.data.segmentId, segmentInfo);

        // Start translation timeout
        if (timeoutManagerRef.current) {
          timeoutManagerRef.current.startTimeout(
            event.data.segmentId,
            event.data.text,
            (timedOutSegmentId) => {
              console.log('[useRealtimeTranscription] Translation timeout for segment:', timedOutSegmentId);
              console.log('🔴 [TIMEOUT DEBUG] Timeout fired for segment:', timedOutSegmentId);
              handleTranslationTimeout(timedOutSegmentId);
            }
          );
          console.log('🔴 [TIMEOUT DEBUG] Started timeout for segment:', event.data.segmentId);
        }

        // Callback for segment completion
        if (onSegmentComplete) {
          onSegmentComplete(event.data.segmentId, event.data.text);
        }
      }
    }

    // Update text manager
    if (textManagerRef.current) {
      textManagerRef.current.update(event.data.text);
    }

    // Callback for transcription update
    if (onTranscriptionUpdate) {
      onTranscriptionUpdate(
        event.data.text,
        event.data.isFinal,
        event.data.segmentId || ''
      );
    }
  }, [enabled, onTranscriptionUpdate, onSegmentComplete]);

  /**
   * Handle translation timeout
   */
  const handleTranslationTimeout = useCallback((segmentId: string) => {
    const segment = pendingSegments.get(segmentId);
    if (!segment) {
      console.warn('[useRealtimeTranscription] Timeout for unknown segment:', segmentId);
      return;
    }

    // Mark as timeout in display manager
    if (displayManagerRef.current) {
      displayManagerRef.current.updateTranslation('[翻訳タイムアウト]', segmentId);
      displayManagerRef.current.completeTranslation(segmentId);
    }

    // Remove from pending segments
    pendingSegments.delete(segmentId);

    // Callback for timeout
    if (onTranslationTimeout) {
      onTranslationTimeout(segmentId, segment.originalText);
    }

    console.log('[useRealtimeTranscription] Translation timeout handled:', segmentId);
  }, [pendingSegments, onTranslationTimeout]);

  /**
   * Clear current transcription
   */
  const clearTranscription = useCallback(() => {
    setCurrentTranscription('');
    if (textManagerRef.current) {
      textManagerRef.current.reset();
    }
    pendingSegments.clear();
    console.log('[useRealtimeTranscription] Transcription cleared');
  }, [pendingSegments]);

  /**
   * Reset all managers
   */
  const resetManagers = useCallback(() => {
    if (displayManagerRef.current) {
      displayManagerRef.current.reset();
    }
    if (textManagerRef.current) {
      textManagerRef.current.reset();
    }
    if (timeoutManagerRef.current) {
      timeoutManagerRef.current.clearAll();
    }
    pendingSegments.clear();
    setCurrentTranscription('');
    console.log('[useRealtimeTranscription] All managers reset');
  }, [pendingSegments]);

  /**
   * Clear translation timeout for a specific segment
   * Called when translation is received to prevent timeout
   */
  const clearTranslationTimeout = useCallback((segmentId: string): boolean => {
    if (!timeoutManagerRef.current) {
      console.warn('[useRealtimeTranscription] TimeoutManager not initialized');
      return false;
    }

    const cleared = timeoutManagerRef.current.clearTimeout(segmentId);
    if (cleared) {
      console.log('[useRealtimeTranscription] Translation timeout cleared for segment:', segmentId);
      console.log('🔴 [TIMEOUT DEBUG] Successfully cleared timeout for:', segmentId);
    } else {
      console.log('🔴 [TIMEOUT DEBUG] Failed to clear timeout for:', segmentId);
    }
    return cleared;
  }, []);

  return {
    currentTranscription,
    pendingSegments,
    displayManager: displayManagerRef.current,
    textManager: textManagerRef.current,
    handleASREvent,
    clearTranscription,
    resetManagers,
    setDisplayPairsCallback,
    clearTranslationTimeout
  };
};