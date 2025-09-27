/**
 * useAudioCapture - Audio Capture Management Hook
 * 
 * Responsibilities:
 * - Manage audio worklet setup and teardown
 * - Handle microphone permissions
 * - Provide audio metrics
 * - Error handling for audio capture
 * 
 * This hook abstracts audio capture logic from the main pipeline
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseAudioCaptureOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
  onMetricsUpdate?: (metrics: AudioMetrics) => void;
}

interface AudioMetrics {
  volume: number;
  isSilent: boolean;
  duration: number;
}

interface UseAudioCaptureReturn {
  isCapturing: boolean;
  error: Error | null;
  audioMetrics: AudioMetrics | null;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
}

export function useAudioCapture(options: UseAudioCaptureOptions = {}): UseAudioCaptureReturn {
  const { enabled = true, onError, onMetricsUpdate } = options;
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('[useAudioCapture] Cleaning up audio resources');
    
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  // Start audio capture
  const startCapture = useCallback(async () => {
    if (!enabled || isCapturing) {
      console.warn('[useAudioCapture] Cannot start capture:', { enabled, isCapturing });
      return;
    }

    try {
      console.log('[useAudioCapture] Starting audio capture');
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000
        }
      });
      
      mediaStreamRef.current = stream;
      
      // Create audio context
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      // Load audio worklet
      try {
        await audioContext.audioWorklet.addModule('/audio-processor.js');
      } catch (workletError) {
        console.warn('[useAudioCapture] Failed to load worklet, continuing without it:', workletError);
      }
      
      // Create source node
      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      
      // Try to create worklet node (optional enhancement)
      if (audioContext.audioWorklet) {
        try {
          const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
          workletNodeRef.current = workletNode;
          
          // Connect nodes
          source.connect(workletNode);
          workletNode.connect(audioContext.destination);
          
          // Handle messages from worklet
          workletNode.port.onmessage = (event) => {
            if (event.data.type === 'metrics') {
              const metrics: AudioMetrics = {
                volume: event.data.volume,
                isSilent: event.data.isSilent,
                duration: event.data.duration
              };
              setAudioMetrics(metrics);
              if (onMetricsUpdate) {
                onMetricsUpdate(metrics);
              }
            } else if (event.data.type === 'audio') {
              // Send audio data to backend
              if (window.electron?.sendAudioChunk) {
                window.electron.sendAudioChunk(event.data.data.pcm16);
                // ログを削除 - 32ms毎に実行されるため
              } else {
                console.error('[useAudioCapture] window.electron.sendAudioChunk not available');
              }
            }
          };
        } catch (nodeError) {
          console.warn('[useAudioCapture] Failed to create worklet node:', nodeError);
        }
      }
      
      setIsCapturing(true);
      console.log('[useAudioCapture] Audio capture started successfully');
      
    } catch (err) {
      const captureError = err instanceof Error ? err : new Error('Failed to start audio capture');
      console.error('[useAudioCapture] Failed to start capture:', captureError);
      setError(captureError);
      setIsCapturing(false);
      
      if (onError) {
        onError(captureError);
      }
      
      cleanup();
    }
  }, [enabled, isCapturing, cleanup, onError, onMetricsUpdate]);

  // Stop audio capture
  const stopCapture = useCallback(() => {
    if (!isCapturing) {
      console.warn('[useAudioCapture] Cannot stop capture: not capturing');
      return;
    }

    console.log('[useAudioCapture] Stopping audio capture');
    cleanup();
    setIsCapturing(false);
    setAudioMetrics(null);
  }, [isCapturing, cleanup]);

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
    audioMetrics,
    startCapture,
    stopCapture
  };
}