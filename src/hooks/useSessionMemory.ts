/**
 * useSessionMemory - セッションメモリ管理フック
 * 
 * SessionMemoryServiceをReactで使用するためのフック
 * - セッション状態の管理
 * - 自動保存
 * - セッション履歴
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SessionMemoryService } from '../domain/services/SessionMemoryService';
import { LocalStorageAdapter } from '../domain/ports/StoragePort';
import { StreamingBuffer } from '../utils/StreamingBuffer';
import type { Translation, Summary } from './useUnifiedPipeline';
import type { SessionState, SessionMemo } from '../domain/services/SessionMemoryService';

export interface UseSessionMemoryReturn {
  // Session management
  startSession: (className: string, sourceLanguage: string, targetLanguage: string) => Promise<void>;
  completeSession: () => Promise<void>;
  pauseSession: () => void;
  resumeSession: () => void;
  
  // Data management
  addTranslation: (translation: Translation) => void;
  updateTranslation: (segmentId: string, updates: Partial<Translation>) => void;
  addSummary: (summary: Summary) => void;
  addMemo: (memo: SessionMemo) => void;
  updateMemos: (memos: SessionMemo[]) => void;
  
  // Session state
  sessionState: SessionState | null;
  isSessionActive: boolean;
  
  // Session history
  getAllSessions: () => Promise<SessionState[]>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  exportSession: (sessionId: string) => Promise<string | null>;
  getLatestSession: (className: string) => Promise<SessionState | null>;
  restoreSession: (sessionId: string) => Promise<void>;
  
  // Streaming buffer
  streamingBuffer: StreamingBuffer | null;
}

export function useSessionMemory(): UseSessionMemoryReturn {
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  const sessionServiceRef = useRef<SessionMemoryService | null>(null);
  const streamingBufferRef = useRef<StreamingBuffer | null>(null);
  
  // Initialize services
  useEffect(() => {
    if (!sessionServiceRef.current) {
      const storage = new LocalStorageAdapter();
      sessionServiceRef.current = new SessionMemoryService({
        storage,
        autoSaveInterval: 60 * 1000, // 60 seconds
        onEvent: (event) => {
          console.log('[useSessionMemory] Session event:', event);
          
          // Update local state based on events
          if (event.type === 'session_started') {
            setIsSessionActive(true);
          } else if (event.type === 'session_completed') {
            setIsSessionActive(false);
          } else if (event.type === 'session_saved') {
            console.log('[useSessionMemory] Session auto-saved');
          } else if (event.type === 'storage_quota_exceeded') {
            console.warn('[useSessionMemory] Storage quota exceeded');
            // TODO: Show user notification
          }
        }
      });
    }
    
    if (!streamingBufferRef.current) {
      streamingBufferRef.current = new StreamingBuffer({
        maxDurationMs: 180 * 60 * 1000, // 180 minutes
        compactionInterval: 5 * 60 * 1000 // 5 minutes
      });
    }
    
    return () => {
      if (sessionServiceRef.current) {
        sessionServiceRef.current.destroy();
        sessionServiceRef.current = null;
      }
      
      if (streamingBufferRef.current) {
        streamingBufferRef.current.destroy();
        streamingBufferRef.current = null;
      }
    };
  }, []);
  
  // Complete current session
  const completeSession = useCallback(async () => {
    if (!sessionServiceRef.current || !isSessionActive) return;
    
    try {
      const result = await sessionServiceRef.current.completeSession();
      
      if (result.success) {
        setSessionState(null);
        streamingBufferRef.current?.clear();
        setIsSessionActive(false);
      } else {
        console.error('[useSessionMemory] Failed to complete session:', result.error);
        // エラー発生時も状態をクリア
        setSessionState(null);
        setIsSessionActive(false);
      }
    } catch (error) {
      console.error('[useSessionMemory] Unexpected error completing session:', error);
      setSessionState(null);
      setIsSessionActive(false);
    }
  }, [isSessionActive]);
  
  // Start a new session
  const startSession = useCallback(async (className: string, sourceLanguage: string, targetLanguage: string) => {
    if (!sessionServiceRef.current) return;
    
    try {
      // 既存セッションの確認
      if (isSessionActive) {
        console.warn('[useSessionMemory] Session already active, completing previous session');
        await completeSession();
      }
      
      const result = await sessionServiceRef.current.startSession({
        className,
        sourceLanguage,
        targetLanguage
      });
      
      if (result.success) {
        const sessionResult = sessionServiceRef.current.getCurrentSession();
        if (sessionResult.success) {
          setSessionState(sessionResult.data.state);
        }
        
        // Clear streaming buffer for new session
        streamingBufferRef.current?.clear();
      } else {
        console.error('[useSessionMemory] Failed to start session:', result.error);
        // Errorをthrowせず、グレースフルに処理
        setSessionState(null);
        setIsSessionActive(false);
      }
    } catch (error) {
      console.error('[useSessionMemory] Unexpected error starting session:', error);
      setSessionState(null);
      setIsSessionActive(false);
    }
  }, [isSessionActive, completeSession]);
  
  // Pause/Resume session
  const pauseSession = useCallback(() => {
    if (!sessionServiceRef.current || !sessionState) return;
    
    sessionServiceRef.current.updateSessionState({ status: 'paused' });
    setSessionState({ ...sessionState, status: 'paused' });
  }, [sessionState]);
  
  const resumeSession = useCallback(() => {
    if (!sessionServiceRef.current || !sessionState) return;
    
    sessionServiceRef.current.updateSessionState({ status: 'active' });
    setSessionState({ ...sessionState, status: 'active' });
  }, [sessionState]);
  
  // Add translation
  const addTranslation = useCallback((translation: Translation) => {
    if (!sessionServiceRef.current || !isSessionActive) {
      console.log('[useSessionMemory] Cannot add translation - no active session');
      return;
    }
    
    try {
      // Add to session memory
      const result = sessionServiceRef.current.addTranslation(translation);
      if (!result.success) {
        console.error('[useSessionMemory] Failed to add translation:', result.error);
        return;
      }
      
      // Add to streaming buffer
      if (streamingBufferRef.current) {
        streamingBufferRef.current.addSegment({
          id: translation.id,
          timestamp: translation.timestamp,
          original: translation.sourceText,
          translation: translation.targetText,
          metadata: {
            wordCount: translation.sourceText.split(' ').length
          }
        });
      }
      
      // Update word count
      if (sessionState) {
        const newWordCount = sessionState.wordCount + translation.sourceText.split(' ').length;
        sessionServiceRef.current.updateSessionState({ wordCount: newWordCount });
        setSessionState({ ...sessionState, wordCount: newWordCount });
      }
    } catch (error) {
      console.error('[useSessionMemory] Error adding translation:', error);
    }
  }, [sessionState, isSessionActive]);
  
  // Update existing translation (for high-quality translation updates)
  const updateTranslation = useCallback((segmentId: string, updates: Partial<Translation>) => {
    if (!sessionServiceRef.current || !isSessionActive) {
      console.log('[useSessionMemory] Cannot update translation - no active session');
      return;
    }
    
    try {
      const result = sessionServiceRef.current.updateTranslation(segmentId, updates);
      if (!result.success) {
        console.error('[useSessionMemory] Failed to update translation:', result.error);
      } else {
        console.log('[useSessionMemory] Translation updated:', segmentId);
      }
    } catch (error) {
      console.error('[useSessionMemory] Error updating translation:', error);
    }
  }, [isSessionActive]);
  
  // Add summary
  const addSummary = useCallback((summary: Summary) => {
    if (!sessionServiceRef.current || !isSessionActive) {
      console.log('[useSessionMemory] Cannot add summary - no active session');
      return;
    }
    
    try {
      const result = sessionServiceRef.current.addSummary(summary);
      if (!result.success) {
        console.error('[useSessionMemory] Failed to add summary:', result.error);
      }
    } catch (error) {
      console.error('[useSessionMemory] Error adding summary:', error);
    }
  }, [isSessionActive]);
  
  // Memo management
  const addMemo = useCallback((memo: SessionMemo) => {
    if (!sessionServiceRef.current) return;
    
    const result = sessionServiceRef.current.addMemo(memo);
    if (!result.success) {
      console.error('[useSessionMemory] Failed to add memo:', result.error);
    }
  }, []);
  
  const updateMemos = useCallback((memos: SessionMemo[]) => {
    if (!sessionServiceRef.current) return;
    
    // Clear existing memos and add new ones
    memos.forEach(memo => {
      sessionServiceRef.current?.addMemo(memo);
    });
  }, []);
  
  // Session history management
  const getAllSessions = useCallback(async (): Promise<SessionState[]> => {
    if (!sessionServiceRef.current) return [];
    
    const result = await sessionServiceRef.current.getAllSessions();
    if (result.success) {
      return result.data;
    } else {
      console.error('[useSessionMemory] Failed to get sessions:', result.error);
      return [];
    }
  }, []);
  
  const loadSession = useCallback(async (sessionId: string) => {
    if (!sessionServiceRef.current) return;
    
    const result = await sessionServiceRef.current.loadSession(sessionId);
    if (result.success) {
      setSessionState(result.data.state);
      // TODO: Restore translations, summaries, etc.
    } else {
      console.error('[useSessionMemory] Failed to load session:', result.error);
      throw result.error;
    }
  }, []);
  
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!sessionServiceRef.current) return;
    
    // Note: deleteSession is not implemented in SessionMemoryService
    // We need to add this functionality
    console.warn('[useSessionMemory] deleteSession not implemented');
  }, []);
  
  const exportSession = useCallback(async (sessionId: string): Promise<string | null> => {
    if (!sessionServiceRef.current) return null;
    
    const result = await sessionServiceRef.current.exportSession(sessionId);
    if (result.success) {
      return result.data;
    } else {
      console.error('[useSessionMemory] Failed to export session:', result.error);
      return null;
    }
  }, []);
  
  // Get latest session for a class
  const getLatestSession = useCallback(async (className: string): Promise<SessionState | null> => {
    if (!sessionServiceRef.current) return null;
    
    try {
      const sessions = await getAllSessions();
      const classSessions = sessions
        .filter(s => s.className === className)
        .sort((a, b) => b.startTime - a.startTime);
      
      return classSessions[0] || null;
    } catch (error) {
      console.error('[useSessionMemory] Failed to get latest session:', error);
      return null;
    }
  }, [getAllSessions]);
  
  // Restore a session
  const restoreSession = useCallback(async (sessionId: string): Promise<void> => {
    await loadSession(sessionId);
  }, [loadSession]);
  
  // Update session duration periodically
  useEffect(() => {
    if (!isSessionActive || !sessionState) return;
    
    const interval = setInterval(() => {
      const duration = Date.now() - sessionState.startTime;
      sessionServiceRef.current?.updateSessionState({ duration });
      setSessionState(prev => prev ? { ...prev, duration } : null);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isSessionActive, sessionState?.startTime]);
  
  return {
    // Session management
    startSession,
    completeSession,
    pauseSession,
    resumeSession,
    
    // Data management
    addTranslation,
    updateTranslation,
    addSummary,
    addMemo,
    updateMemos,
    
    // Session state
    sessionState,
    isSessionActive,
    
    // Session history
    getAllSessions,
    loadSession,
    deleteSession,
    exportSession,
    getLatestSession,
    restoreSession,
    
    // Streaming buffer
    streamingBuffer: streamingBufferRef.current
  };
}