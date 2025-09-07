/**
 * useUnifiedPipeline - New Architecture Hook
 * 
 * Responsibilities:
 * - Interface with new type-safe univoice API
 * - Manage pipeline state and events
 * - Provide clean interface for UI components
 * - Handle correlation IDs and error states
 * 
 * Key Changes from Original:
 * - Uses new univoice API instead of electronAPI
 * - Simplified state management (StreamCoalescer handles complexity)
 * - Type-safe event handling
 * - Removed complex smoothing utilities (handled by backend)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PipelineEvent } from '../../electron/services/ipc/contracts';

// Types for UI compatibility
interface Translation {
  id: string;
  original: string;
  japanese: string;
  timestamp: number;
  firstPaintMs: number;
  completeMs: number;
}

interface Summary {
  id: string;
  english: string;
  japanese: string;
  wordCount: number;
  timestamp: number;
  timeRange: {
    start: number;
    end: number;
  };
}

interface DisplaySegment {
  id: string;
  original: string;
  translation: string;
  status: 'active' | 'fading' | 'completed';
  opacity?: number;
}

interface PipelineState {
  status: 'idle' | 'starting' | 'running' | 'stopping' | 'stopped';
  currentSegmentId: string | null;
  wordCount: number;
  duration: number;
  startTime: number | null;
}

interface UseUnifiedPipelineOptions {
  sourceLanguage?: string;
  targetLanguage?: string;
  onError?: (error: string) => void;
  onStatusChange?: (status: string) => void;
}

export const useUnifiedPipeline = (options: UseUnifiedPipelineOptions = {}) => {
  const {
    sourceLanguage = 'en',
    targetLanguage = 'ja',
    onError,
    onStatusChange
  } = options;

  // State
  const [isRunning, setIsRunning] = useState(false);
  const [currentOriginal, setCurrentOriginal] = useState('');
  const [currentTranslation, setCurrentTranslation] = useState('');
  const [realtimeSegments, setRealtimeSegments] = useState<DisplaySegment[]>([]);
  const [history, setHistory] = useState<Translation[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [finalReport, setFinalReport] = useState<string | null>(null);
  const [state, setState] = useState<PipelineState>({
    status: 'idle',
    currentSegmentId: null,
    wordCount: 0,
    duration: 0,
    startTime: null
  });

  // Refs for cleanup and correlation
  const cleanupFunctions = useRef<(() => void)[]>([]);
  const currentCorrelationId = useRef<string | null>(null);
  const segmentBuffer = useRef<Map<string, { original?: string; translation?: string }>>(new Map());

  // Generate correlation ID
  const generateCorrelationId = useCallback(() => {
    return window.univoice?.generateCorrelationId() || `hook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Event handlers
  const handlePipelineEvent = useCallback((event: PipelineEvent) => {
    console.log('[useUnifiedPipeline] Event received:', event.type, event.correlationId);

    switch (event.type) {
      case 'asr':
        setCurrentOriginal(event.data.text);
        
        // Update realtime segments for multi-line display
        if (event.data.isFinal) {
          setRealtimeSegments(prev => {
            const updated = [...prev];
            const lastSegment = updated[updated.length - 1];
            
            if (lastSegment && lastSegment.status === 'active') {
              lastSegment.original = event.data.text;
              lastSegment.status = 'completed';
            } else {
              updated.push({
                id: `segment-${Date.now()}`,
                original: event.data.text,
                translation: '',
                status: 'completed'
              });
            }
            
            // Keep only last 3 segments
            return updated.slice(-3);
          });
        } else {
          setRealtimeSegments(prev => {
            const updated = [...prev];
            const lastSegment = updated[updated.length - 1];
            
            if (lastSegment && lastSegment.status === 'active') {
              lastSegment.original = event.data.text;
            } else {
              updated.push({
                id: `segment-${Date.now()}`,
                original: event.data.text,
                translation: '',
                status: 'active'
              });
            }
            
            return updated.slice(-3);
          });
        }
        break;

      case 'translation':
        setCurrentTranslation(event.data.translatedText);
        
        // Update realtime segments
        setRealtimeSegments(prev => {
          const updated = [...prev];
          const targetSegment = updated.find(seg => 
            seg.original === event.data.originalText || seg.status === 'active'
          );
          
          if (targetSegment) {
            targetSegment.translation = event.data.translatedText;
            if (event.data.isFinal) {
              targetSegment.status = 'completed';
            }
          }
          
          return updated;
        });

        // Add to history if final
        if (event.data.isFinal) {
          const translation: Translation = {
            id: `trans-${Date.now()}`,
            original: event.data.originalText,
            japanese: event.data.translatedText,
            timestamp: event.timestamp,
            firstPaintMs: 0, // Will be calculated by UI
            completeMs: Date.now()
          };
          
          setHistory(prev => [...prev, translation]);
          
          // Clear current display
          setCurrentOriginal('');
          setCurrentTranslation('');
        }
        break;

      case 'segment':
        // Handle coalesced segments from StreamCoalescer
        console.log('[useUnifiedPipeline] Segment event:', event.data);
        
        if (event.data.status === 'completed') {
          // Move to history
          const translation: Translation = {
            id: event.data.segmentId,
            original: event.data.text,
            japanese: event.data.translation || '',
            timestamp: event.timestamp,
            firstPaintMs: 0,
            completeMs: Date.now()
          };
          
          setHistory(prev => [...prev, translation]);
        }
        break;

      case 'status':
        const newStatus = event.data.state;
        setState(prev => ({
          ...prev,
          status: newStatus as PipelineState['status']
        }));
        
        setIsRunning(newStatus === 'listening' || newStatus === 'processing');
        
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
        break;

      case 'error':
        const errorMessage = event.data.message;
        setError(errorMessage);
        setIsRunning(false);
        setState(prev => ({ ...prev, status: 'idle' }));
        
        if (onError) {
          onError(errorMessage);
        }
        
        console.error('[useUnifiedPipeline] Pipeline error:', errorMessage);
        break;

      default:
        console.warn('[useUnifiedPipeline] Unknown event type:', event);
    }
  }, [onError, onStatusChange]);

  // Setup event listeners
  useEffect(() => {
    if (!window.univoice) {
      console.error('[useUnifiedPipeline] univoice API not available');
      setError('UniVoice API not available');
      return;
    }

    // Subscribe to pipeline events
    const unsubscribe = window.univoice.onPipelineEvent(handlePipelineEvent);
    cleanupFunctions.current.push(unsubscribe);

    // Cleanup on unmount
    return () => {
      cleanupFunctions.current.forEach(cleanup => cleanup());
      cleanupFunctions.current = [];
    };
  }, [handlePipelineEvent]);

  // Control functions
  const startFromMicrophone = useCallback(async () => {
    try {
      setError(null);
      setState(prev => ({ ...prev, status: 'starting' }));
      
      const correlationId = generateCorrelationId();
      currentCorrelationId.current = correlationId;
      
      console.log('[useUnifiedPipeline] Starting microphone with correlation:', correlationId);
      
      const result = await window.univoice.startListening({
        sourceLanguage,
        targetLanguage,
        correlationId
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to start listening');
      }
      
      // Start audio capture
      await startAudioCapture();
      
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to start microphone';
      setError(errorMsg);
      setState(prev => ({ ...prev, status: 'idle' }));
      console.error('[useUnifiedPipeline] Start failed:', err);
      
      if (onError) {
        onError(errorMsg);
      }
    }
  }, [sourceLanguage, targetLanguage, generateCorrelationId, onError]);

  const stop = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, status: 'stopping' }));
      
      if (currentCorrelationId.current) {
        const result = await window.univoice.stopListening({
          correlationId: currentCorrelationId.current
        });
        
        if (!result.success) {
          console.warn('[useUnifiedPipeline] Stop warning:', result.error);
        }
      }
      
      // Stop audio capture
      stopAudioCapture();
      
      setIsRunning(false);
      setState(prev => ({ ...prev, status: 'stopped' }));
      currentCorrelationId.current = null;
      
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to stop pipeline';
      setError(errorMsg);
      console.error('[useUnifiedPipeline] Stop failed:', err);
      
      if (onError) {
        onError(errorMsg);
      }
    }
  }, [onError]);

  const translateUserInput = useCallback(async (text: string, from: string = 'ja', to: string = 'en'): Promise<string> => {
    try {
      // For now, use a simple translation approach
      // In the future, this could be enhanced with the pipeline service
      console.log('[useUnifiedPipeline] Translating user input:', text);
      
      // Placeholder implementation - in real scenario, this would call the pipeline service
      if (from === 'ja' && to === 'en') {
        return `Could you explain more about "${text}"?`;
      } else if (from === 'en' && to === 'ja') {
        return `「${text}」について詳しく教えてください。`;
      }
      
      return `Translation: ${text}`;
      
    } catch (err: any) {
      const errorMsg = err.message || 'Translation failed';
      setError(errorMsg);
      console.error('[useUnifiedPipeline] User translation failed:', err);
      
      if (onError) {
        onError(errorMsg);
      }
      
      return '';
    }
  }, [onError]);

  // Audio capture functions
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const startAudioCapture = useCallback(async () => {
    try {
      console.log('[useUnifiedPipeline] Starting audio capture...');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          channelCount: 1, 
          sampleRate: 16000, 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: false
        }
      });
      
      mediaStreamRef.current = stream;
      
      // Setup Web Audio API
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = ctx;
      
      const source = ctx.createMediaStreamSource(stream);
      const frameSamples = 512; // 32ms @16k
      const processor = ctx.createScriptProcessor(frameSamples, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const input = e.inputBuffer.getChannelData(0) as Float32Array;
        
        // Convert Float32 [-1,1] to PCM16LE
        const buf = new ArrayBuffer(input.length * 2);
        const view = new DataView(buf);
        
        for (let i = 0; i < input.length; i++) {
          let s = Math.max(-1, Math.min(1, input[i]));
          view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        
        // Send to main process
        if (window.electron?.sendAudioChunk) {
          window.electron.sendAudioChunk(buf);
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      
      console.log('[useUnifiedPipeline] Audio capture started successfully');
      
    } catch (err: any) {
      console.error('[useUnifiedPipeline] Audio capture failed:', err);
      throw err;
    }
  }, []);

  const stopAudioCapture = useCallback(() => {
    try {
      console.log('[useUnifiedPipeline] Stopping audio capture...');
      
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
      console.log('[useUnifiedPipeline] Audio capture stopped');
      
    } catch (err: any) {
      console.error('[useUnifiedPipeline] Audio capture stop failed:', err);
    }
  }, []);

  // Clear functions
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const clearSummaries = useCallback(() => {
    setSummaries([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await window.univoice.clearHistory();
      clearHistory();
      clearSummaries();
      clearError();
      setCurrentOriginal('');
      setCurrentTranslation('');
      setRealtimeSegments([]);
    } catch (err: any) {
      console.error('[useUnifiedPipeline] Clear all failed:', err);
    }
  }, [clearHistory, clearSummaries, clearError]);

  return {
    // State
    isRunning,
    currentOriginal,
    currentTranslation,
    realtimeSegments,
    history,
    summaries,
    error,
    finalReport,
    state,
    
    // Control functions
    startFromMicrophone,
    stop,
    translateUserInput,
    
    // Clear functions
    clearHistory,
    clearSummaries,
    clearError,
    clearAll,
    
    // Legacy compatibility (for existing UI)
    startFromFile: startFromMicrophone, // Fallback to microphone
    groupedHistory: [], // Not used in new architecture
    refreshState: async () => {}, // Not needed in new architecture
  };
};