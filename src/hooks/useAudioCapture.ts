/**
 * useAudioCapture Hook
 * 
 * Responsible for managing audio capture from the user's microphone.
 * Follows Clean Architecture principles by depending on domain interfaces.
 * 
 * @module hooks/useAudioCapture
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AudioWorkletProcessor } from '../infrastructure/audio/AudioWorkletProcessor';
import type { 
  IAudioProcessor, 
  AudioProcessorMessage,
  AudioProcessorOptions 
} from '../types/audio-processor.types';

/**
 * Options for the audio capture hook
 */
interface UseAudioCaptureOptions {
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
  /** Error handler callback */
  onError?: (error: Error) => void;
  /** Custom audio constraints for getUserMedia */
  audioConstraints?: MediaStreamConstraints['audio'];
  /** Audio processor options */
  processorOptions?: Partial<AudioProcessorOptions>;
}

/**
 * Return type for the audio capture hook
 */
interface UseAudioCaptureReturn {
  /** Whether audio is currently being captured */
  isCapturing: boolean;
  /** Current error state */
  error: Error | null;
  /** Start audio capture */
  startCapture: () => Promise<void>;
  /** Stop audio capture */
  stopCapture: () => void;
  /** Audio metrics for debugging */
  audioMetrics: {
    sampleRate: number;
    frameCount: number;
  };
}

/**
 * Hook for managing audio capture with AudioWorklet
 * 
 * @param options Configuration options
 * @returns Audio capture controls and state
 */
export const useAudioCapture = (options: UseAudioCaptureOptions = {}): UseAudioCaptureReturn => {
  const {
    enabled = true,
    onError,
    audioConstraints = {
      channelCount: 1,
      sampleRate: 16000,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false
    },
    processorOptions = {
      targetSampleRate: 16000,
      bufferSize: 512,
      debug: false
    }
  } = options;

  // State management
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [audioMetrics, setAudioMetrics] = useState({
    sampleRate: 0,
    frameCount: 0
  });

  // References for cleanup
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<IAudioProcessor | null>(null);
  const frameCountRef = useRef(0);

  // Clear error when starting new capture
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Start capturing audio from the microphone
   */
  const startCapture = useCallback(async () => {
    // Prevent multiple captures
    if (!enabled || isCapturing) {
      console.warn('[useAudioCapture] Cannot start: already capturing or disabled');
      return;
    }

    // Check if already initialized
    if (audioContextRef.current || mediaStreamRef.current) {
      console.warn('[useAudioCapture] Audio capture already initialized');
      return;
    }

    try {
      clearError();
      console.log('[useAudioCapture] Starting audio capture...');

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });
      mediaStreamRef.current = stream;

      // Initialize Web Audio API
      const context = new AudioContext({ 
        sampleRate: typeof audioConstraints === 'object' 
          ? (audioConstraints.sampleRate as number) || 16000 
          : 16000 
      });
      audioContextRef.current = context;

      // Create audio source
      const source = context.createMediaStreamSource(stream);

      // Reset frame counter
      frameCountRef.current = 0;

      // Create AudioWorklet processor with message handler
      const processor = await AudioWorkletProcessor.create(
        context,
        source,
        (event: MessageEvent<AudioProcessorMessage>) => {
          const { type, data } = event.data;

          switch (type) {
            case 'initialized':
              console.log('[useAudioCapture] AudioWorklet initialized:', data);
              break;

            case 'audio':
              // Handle audio data
              const pcm16 = new Int16Array(data.pcm16);
              frameCountRef.current++;

              // Update metrics periodically
              if (frameCountRef.current % 50 === 1) {
                setAudioMetrics({
                  sampleRate: data.sampleRate,
                  frameCount: frameCountRef.current
                });

                console.log('[useAudioCapture] Audio processing:', {
                  frameCount: frameCountRef.current,
                  pcm16Length: pcm16.length,
                  sampleRate: data.sampleRate,
                  timestamp: data.timestamp
                });
              }

              // Send to Electron if available
              if (window.electron?.sendAudioChunk) {
                window.electron.sendAudioChunk(pcm16);
                
                if (frameCountRef.current % 50 === 1) {
                  console.log('[useAudioCapture] Sending audio chunk to main process');
                }
              } else {
                if (frameCountRef.current % 50 === 1) {
                  console.error('[useAudioCapture] Cannot send audio - Electron API not available');
                }
              }
              break;

            case 'error':
              console.error('[useAudioCapture] AudioWorklet error:', data);
              const processorError = new Error(`AudioWorklet error: ${data.message || 'Unknown error'}`);
              setError(processorError);
              if (onError) {
                onError(processorError);
              }
              break;
          }
        },
        processorOptions as AudioProcessorOptions
      );

      processorRef.current = processor;
      setIsCapturing(true);

      console.log('[useAudioCapture] Audio capture started successfully', {
        sampleRate: context.sampleRate,
        state: context.state
      });

    } catch (err) {
      const captureError = err instanceof Error ? err : new Error(String(err));
      console.error('[useAudioCapture] Failed to start audio capture:', captureError);
      
      setError(captureError);
      setIsCapturing(false);
      
      // Clean up any partial initialization
      stopCapture();
      
      if (onError) {
        onError(captureError);
      }
      
      throw captureError;
    }
  }, [enabled, isCapturing, audioConstraints, processorOptions, onError, clearError]);

  /**
   * Stop capturing audio and clean up resources
   */
  const stopCapture = useCallback(() => {
    try {
      console.log('[useAudioCapture] Stopping audio capture...');

      // Clean up AudioWorklet processor
      if (processorRef.current) {
        processorRef.current.destroy();
        processorRef.current = null;
      }

      // Close AudioContext
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Stop media stream tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      // Reset state
      setIsCapturing(false);
      frameCountRef.current = 0;
      setAudioMetrics({ sampleRate: 0, frameCount: 0 });

      console.log('[useAudioCapture] Audio capture stopped');

    } catch (err) {
      console.error('[useAudioCapture] Error during cleanup:', err);
      // Continue cleanup even if some operations fail
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isCapturing) {
        stopCapture();
      }
    };
  }, [isCapturing, stopCapture]);

  return {
    isCapturing,
    error,
    startCapture,
    stopCapture,
    audioMetrics
  };
};