/**
 * useRealtimeTranscription - Real-time Transcription Management Hook
 * 
 * Responsibilities:
 * - Manage ASR (Automatic Speech Recognition) event handling
 * - Coordinate display manager for 3-line display
 * - Manage translation timeout logic
 * - Track pending segments
 * 
 * This hook encapsulates all real-time transcription display logic
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { SyncedRealtimeDisplayManager, SyncedDisplayPair } from '../utils/SyncedRealtimeDisplayManager';
import { TranslationTimeoutManager } from '../utils/TranslationTimeoutManager';
import type { PipelineEvent } from '../shared/types/contracts';

interface UseRealtimeTranscriptionOptions {
  enabled?: boolean;
  onSegmentComplete?: (segmentId: string, text: string) => void;
  onTranslationTimeout?: (segmentId: string, originalText: string) => void;
  onError?: (error: Error) => void;
}

interface UseRealtimeTranscriptionReturn {
  currentTranscription: string;
  pendingSegments: Map<string, { text: string; timestamp: number }>;
  displayManager: SyncedRealtimeDisplayManager | null;
  handleASREvent: (event: PipelineEvent) => void;
  clearTranscription: () => void;
  resetManagers: () => void;
  setDisplayPairsCallback: (callback: (pairs: SyncedDisplayPair[]) => void) => void;
  clearTranslationTimeout: (segmentId: string) => boolean;
}

export function useRealtimeTranscription(
  options: UseRealtimeTranscriptionOptions = {}
): UseRealtimeTranscriptionReturn {
  const { enabled = true, onSegmentComplete, onTranslationTimeout, onError } = options;
  
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [pendingSegments] = useState(() => new Map<string, { text: string; timestamp: number }>());
  
  const displayManagerRef = useRef<SyncedRealtimeDisplayManager | null>(null);
  const timeoutManagerRef = useRef<TranslationTimeoutManager | null>(null);
  const displayPairsCallbackRef = useRef<((pairs: SyncedDisplayPair[]) => void) | null>(null);

  // Initialize managers
  useEffect(() => {
    if (!enabled) return;

    console.log('[useRealtimeTranscription] Initializing managers');
    
    // Initialize display manager with callback
    if (!displayManagerRef.current && displayPairsCallbackRef.current) {
      displayManagerRef.current = new SyncedRealtimeDisplayManager(displayPairsCallbackRef.current);
    }
    
    
    // Initialize timeout manager
    if (!timeoutManagerRef.current) {
      timeoutManagerRef.current = new TranslationTimeoutManager();
    }
    
    return () => {
      console.log('[useRealtimeTranscription] Cleaning up managers');
      displayManagerRef.current = null;
      
      if (timeoutManagerRef.current) {
        timeoutManagerRef.current.clearAll();
        timeoutManagerRef.current = null;
      }
    };
  }, [enabled]);

  // Set display pairs callback
  const setDisplayPairsCallback = useCallback((callback: (pairs: SyncedDisplayPair[]) => void) => {
    displayPairsCallbackRef.current = callback;
    
    // If display manager doesn't exist yet, it will be created with this callback in useEffect
    // If it already exists, we need to recreate it with the new callback
    if (displayManagerRef.current) {
      displayManagerRef.current.destroy();
      displayManagerRef.current = new SyncedRealtimeDisplayManager(callback);
    }
  }, []);

  // Handle ASR events
  const handleASREvent = useCallback((event: PipelineEvent) => {
    console.log('[useRealtimeTranscription] handleASREvent called:', {
      enabled,
      eventType: event?.type,
      isASR: event?.type === 'asr',
      hasData: !!event?.data,
      timestamp: new Date().toISOString()
    });
    
    if (!enabled || event.type !== 'asr') {
      console.log('[useRealtimeTranscription] Skipping event:', {
        reason: !enabled ? 'disabled' : 'not ASR event',
        eventType: event?.type
      });
      return;
    }
    
    const { segmentId, text, isFinal } = event.data;
    
    console.log('[useRealtimeTranscription] ASR event received in frontend:', {
      segmentId,
      text: text?.substring(0, 50) + (text && text.length > 50 ? '...' : ''),
      textLength: text?.length || 0,
      isFinal,
      displayManagerExists: !!displayManagerRef.current
    });
    
    
    // Update display manager
    if (displayManagerRef.current) {
      if (isFinal) {
        // Update with final text
        displayManagerRef.current.updateOriginal(text, true, segmentId);
        
        // Clear pending segment
        pendingSegments.delete(segmentId);
        
        // Notify parent about segment completion
        if (onSegmentComplete && text) {
          onSegmentComplete(segmentId, text);
        }
        
        // Start translation timeout
        if (timeoutManagerRef.current && text) {
          timeoutManagerRef.current.startTimeout(segmentId, text, () => {
            console.log('[useRealtimeTranscription] Translation timeout for segment:', segmentId);
            
            const pendingSegment = pendingSegments.get(segmentId);
            if (pendingSegment && onTranslationTimeout) {
              onTranslationTimeout(segmentId, pendingSegment.text);
            }
            
            // Clean up
            pendingSegments.delete(segmentId);
          });
        }
      } else {
        // Update pending segment
        if (text) {
          pendingSegments.set(segmentId, { text, timestamp: Date.now() });
        }
        
        displayManagerRef.current.updateOriginal(text || '', false, segmentId);
      }
    }
  }, [enabled, onSegmentComplete, onTranslationTimeout, pendingSegments]);

  // Clear translation timeout
  const clearTranslationTimeout = useCallback((segmentId: string): boolean => {
    if (timeoutManagerRef.current) {
      return timeoutManagerRef.current.clearTimeout(segmentId);
    }
    return false;
  }, []);

  // Clear transcription
  const clearTranscription = useCallback(() => {
    setCurrentTranscription('');
    pendingSegments.clear();
    
    if (displayManagerRef.current) {
      displayManagerRef.current.reset();
    }
    
    
    if (timeoutManagerRef.current) {
      timeoutManagerRef.current.clearAll();
    }
  }, [pendingSegments]);

  // Reset managers
  const resetManagers = useCallback(() => {
    clearTranscription();
  }, [clearTranscription]);

  return {
    currentTranscription,
    pendingSegments,
    displayManager: displayManagerRef.current,
    handleASREvent,
    clearTranscription,
    resetManagers,
    setDisplayPairsCallback,
    clearTranslationTimeout
  };
}