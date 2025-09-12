/**
 * useSession - Custom hook for session management
 * 
 * Provides a React-friendly interface to SessionService
 * Handles state synchronization between backend and UI
 */

import { useState, useEffect, useCallback, useRef } from 'react';
// Define types locally to avoid build dependencies
interface SessionConfig {
  className: string;
  sourceLanguage: string;
  targetLanguage: string;
}

interface SessionState {
  id: string;
  className: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: 'idle' | 'active' | 'paused' | 'stopped';
  startTime: Date | null;
  endTime: Date | null;
  duration: number;
  lastAutoSave: Date | null;
}

interface UseSessionReturn {
  // State
  sessionState: SessionState | null;
  isActive: boolean;
  isPaused: boolean;
  recordingTime: number;
  autoSaveTime: Date | null;
  
  // Actions
  startSession: (config: SessionConfig) => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  stopSession: () => Promise<void>;
  
  // Utilities
  formatTime: (seconds: number) => string;
  error: string | null;
}

const initialState: SessionState = {
  id: '',
  className: '',
  sourceLanguage: 'en',
  targetLanguage: 'ja',
  status: 'idle',
  startTime: null,
  endTime: null,
  duration: 0,
  lastAutoSave: null
};

export function useSession(): UseSessionReturn {
  const [sessionState, setSessionState] = useState<SessionState>(initialState);
  const [recordingTime, setRecordingTime] = useState(0);
  const [autoSaveTime, setAutoSaveTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApiReady, setIsApiReady] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const correlationId = useRef<string>('');

  // Generate new correlation ID for this session
  useEffect(() => {
    correlationId.current = window.univoice?.generateCorrelationId?.() || 
                           `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Check if window.univoice is available
  useEffect(() => {
    let checkCount = 0;
    const checkAPI = setInterval(() => {
      if (window.univoice) {
        console.log('[useSession] UniVoice API is ready');
        console.log('[useSession] Available methods:', Object.keys(window.univoice));
        setIsApiReady(true);
        clearInterval(checkAPI);
      } else if (checkCount++ > 50) { // Try for 5 seconds
        console.warn('[useSession] UniVoice API not found after 5 seconds');
        console.warn('[useSession] This usually means the app is not running in Electron');
        console.warn('[useSession] window properties:', Object.keys(window).filter(k => k.includes('uni') || k.includes('electron')));
        clearInterval(checkAPI);
      } else {
        if (checkCount % 10 === 0) {
          console.log('[useSession] Still waiting for UniVoice API...', checkCount / 10, 'seconds');
        }
      }
    }, 100);

    return () => clearInterval(checkAPI);
  }, []);

  // Listen to session events from backend
  useEffect(() => {
    const handleSessionEvent = (event: any) => {
      switch (event.type) {
        case 'session:started':
          setSessionState(event.data);
          setError(null);
          break;
        case 'session:paused':
          setSessionState(event.data);
          break;
        case 'session:resumed':
          setSessionState(event.data);
          break;
        case 'session:stopped':
          setSessionState(event.data);
          break;
        case 'session:autoSaved':
          setAutoSaveTime(new Date(event.data.timestamp));
          break;
        case 'session:error':
          setError(event.data.error.message);
          break;
      }
    };

    // Register event listeners
    const cleanup = window.univoice?.onPipelineEvent?.(handleSessionEvent);

    return () => {
      cleanup?.();
    };
  }, []);

  // Update recording time
  useEffect(() => {
    if (sessionState.status === 'active' && sessionState.startTime) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(sessionState.startTime!).getTime()) / 1000);
        setRecordingTime(elapsed);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionState.status, sessionState.startTime]);

  // Actions
  const startSession = useCallback(async (config: SessionConfig) => {
    try {
      setError(null);
      
      // Wait for API to be available (up to 3 seconds)
      let apiReady = false;
      for (let i = 0; i < 30; i++) {
        if (window.univoice) {
          apiReady = true;
          break;
        }
        console.log(`[useSession] Waiting for API... attempt ${i + 1}/30`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!apiReady || !window.univoice) {
        console.error('[useSession] window.univoice is not available after 3 seconds');
        console.error('[useSession] window object:', window);
        console.error('[useSession] Available properties:', Object.keys(window));
        throw new Error('UniVoice API is not available. Please check that the app is running in Electron.');
      }

      console.log('[useSession] Starting session with config:', config);
      console.log('[useSession] Correlation ID:', correlationId.current);
      
      // Send command to backend via IPC
      const result = await window.univoice?.startListening?.({
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage,
        correlationId: correlationId.current
      });

      console.log('[useSession] Start result:', result);

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to start session');
      }

      // Update local state optimistically
      setSessionState({
        ...initialState,
        ...config,
        id: `${new Date().toISOString().slice(2, 10).replace(/-/g, '')}_${config.className}`,
        status: 'active',
        startTime: new Date()
      });
      
      setRecordingTime(0);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to start session';
      setError(errorMsg);
      console.error('[useSession] Start failed:', err);
      throw err;
    }
  }, []);

  const pauseSession = useCallback(async () => {
    try {
      setError(null);
      
      // For now, we'll stop the pipeline (no separate pause command)
      const result = await window.univoice?.stopListening?.({
        correlationId: correlationId.current
      });

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to pause session');
      }

      setSessionState((prev: SessionState) => ({
        ...prev,
        status: 'paused'
      }));
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to pause session';
      setError(errorMsg);
      console.error('[useSession] Pause failed:', err);
      throw err;
    }
  }, []);

  const resumeSession = useCallback(async () => {
    try {
      setError(null);
      
      // Resume by starting again with same config
      const result = await window.univoice?.startListening?.({
        sourceLanguage: sessionState.sourceLanguage,
        targetLanguage: sessionState.targetLanguage,
        correlationId: correlationId.current
      });

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to resume session');
      }

      setSessionState((prev: SessionState) => ({
        ...prev,
        status: 'active'
      }));
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to resume session';
      setError(errorMsg);
      console.error('[useSession] Resume failed:', err);
      throw err;
    }
  }, [sessionState.sourceLanguage, sessionState.targetLanguage]);

  const stopSession = useCallback(async () => {
    try {
      setError(null);
      
      const result = await window.univoice?.stopListening?.({
        correlationId: correlationId.current
      });

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to stop session');
      }

      setSessionState((prev: SessionState) => ({
        ...prev,
        status: 'stopped',
        endTime: new Date()
      }));
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to stop session';
      setError(errorMsg);
      console.error('[useSession] Stop failed:', err);
      throw err;
    }
  }, []);

  // Utilities
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    // State
    sessionState,
    isActive: sessionState.status === 'active',
    isPaused: sessionState.status === 'paused',
    recordingTime,
    autoSaveTime,
    
    // Actions
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    
    // Utilities
    formatTime,
    error
  };
}