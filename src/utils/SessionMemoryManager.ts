/**
 * SessionMemoryManager - セッション状態の永続化管理
 * 
 * LocalStorageを使用してセッション状態を管理
 * - 自動保存（60秒ごと）
 * - クラッシュリカバリー
 * - セッション履歴管理
 */

import type { Translation, Summary } from '../hooks/useUnifiedPipeline';
import type { BufferSegment } from './StreamingBuffer';

export interface SessionState {
  id: string;
  className: string;
  startTime: number;
  endTime?: number;
  sourceLanguage: string;
  targetLanguage: string;
  status: 'active' | 'paused' | 'completed';
  wordCount: number;
  duration: number; // milliseconds
  lastSaveTime: number;
}

export interface SessionData {
  state: SessionState;
  history: Translation[];
  summaries: Summary[];
  memos: SessionMemo[];
  bufferSegments?: BufferSegment[] | undefined;
}

export interface SessionMemo {
  id: string;
  timestamp: string;
  japanese: string;
  english: string;
}

interface SessionMemoryManagerOptions {
  autoSaveInterval?: number; // Default: 60 seconds
  maxSessions?: number; // Default: 50
  storagePrefix?: string; // Default: 'univoice_session_'
}

export class SessionMemoryManager {
  private currentSessionId: string | null = null;
  private autoSaveInterval: number;
  private maxSessions: number;
  private storagePrefix: string;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private pendingData: Partial<SessionData> = {};
  
  constructor(options: SessionMemoryManagerOptions = {}) {
    this.autoSaveInterval = options.autoSaveInterval ?? 60 * 1000; // 60 seconds
    this.maxSessions = options.maxSessions ?? 50;
    this.storagePrefix = options.storagePrefix ?? 'univoice_session_';
  }
  
  /**
   * Start a new session
   */
  startSession(config: {
    className: string;
    sourceLanguage: string;
    targetLanguage: string;
  }): string {
    const sessionId = this.generateSessionId();
    const now = Date.now();
    
    const state: SessionState = {
      id: sessionId,
      className: config.className,
      startTime: now,
      sourceLanguage: config.sourceLanguage,
      targetLanguage: config.targetLanguage,
      status: 'active',
      wordCount: 0,
      duration: 0,
      lastSaveTime: now
    };
    
    const sessionData: SessionData = {
      state,
      history: [],
      summaries: [],
      memos: []
    };
    
    this.currentSessionId = sessionId;
    this.saveSession(sessionData);
    this.startAutoSave();
    
    // Clean up old sessions
    this.cleanupOldSessions();
    
    return sessionId;
  }
  
  /**
   * Update current session state
   */
  updateSessionState(updates: Partial<SessionState>): void {
    if (!this.currentSessionId) return;
    
    const sessionData = this.loadSession(this.currentSessionId);
    if (sessionData) {
      sessionData.state = { ...sessionData.state, ...updates };
      this.pendingData.state = sessionData.state;
    }
  }
  
  /**
   * Add translation to history
   */
  addTranslation(translation: Translation): void {
    if (!this.currentSessionId) return;
    
    if (!this.pendingData.history) {
      const sessionData = this.loadSession(this.currentSessionId);
      this.pendingData.history = sessionData?.history || [];
    }
    
    this.pendingData.history.push(translation);
  }
  
  /**
   * Add summary
   */
  addSummary(summary: Summary): void {
    if (!this.currentSessionId) return;
    
    if (!this.pendingData.summaries) {
      const sessionData = this.loadSession(this.currentSessionId);
      this.pendingData.summaries = sessionData?.summaries || [];
    }
    
    this.pendingData.summaries.push(summary);
  }
  
  /**
   * Add memo
   */
  addMemo(memo: SessionMemo): void {
    if (!this.currentSessionId) return;
    
    if (!this.pendingData.memos) {
      const sessionData = this.loadSession(this.currentSessionId);
      this.pendingData.memos = sessionData?.memos || [];
    }
    
    this.pendingData.memos.push(memo);
  }
  
  /**
   * Update memos
   */
  updateMemos(memos: SessionMemo[]): void {
    if (!this.currentSessionId) return;
    this.pendingData.memos = memos;
  }
  
  /**
   * Save buffer segments
   */
  saveBufferSegments(segments: BufferSegment[]): void {
    if (!this.currentSessionId) return;
    this.pendingData.bufferSegments = segments;
  }
  
  /**
   * Get current session data
   */
  getCurrentSession(): SessionData | null {
    if (!this.currentSessionId) return null;
    
    const savedData = this.loadSession(this.currentSessionId);
    if (!savedData) return null;
    
    // Merge pending data with saved data
    return {
      state: this.pendingData.state || savedData.state,
      history: this.pendingData.history || savedData.history,
      summaries: this.pendingData.summaries || savedData.summaries,
      memos: this.pendingData.memos || savedData.memos,
      bufferSegments: this.pendingData.bufferSegments || savedData.bufferSegments || undefined
    };
  }
  
  /**
   * Complete current session
   */
  completeSession(): void {
    if (!this.currentSessionId) return;
    
    const now = Date.now();
    this.updateSessionState({
      status: 'completed',
      endTime: now,
      duration: now - (this.pendingData.state?.startTime || now)
    });
    
    this.saveCurrentSession();
    this.stopAutoSave();
    this.currentSessionId = null;
    this.pendingData = {};
  }
  
  /**
   * Pause current session
   */
  pauseSession(): void {
    this.updateSessionState({ status: 'paused' });
    this.saveCurrentSession();
  }
  
  /**
   * Resume current session
   */
  resumeSession(): void {
    this.updateSessionState({ status: 'active' });
  }
  
  /**
   * Get all sessions
   */
  getAllSessions(): SessionState[] {
    const sessions: SessionState[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.storagePrefix)) {
        try {
          const data = this.loadSession(key.replace(this.storagePrefix, ''));
          if (data) {
            sessions.push(data.state);
          }
        } catch (error) {
          console.error('[SessionMemoryManager] Failed to load session:', key, error);
        }
      }
    }
    
    return sessions.sort((a, b) => b.startTime - a.startTime);
  }
  
  /**
   * Load a specific session
   */
  loadSession(sessionId: string): SessionData | null {
    try {
      const key = this.storagePrefix + sessionId;
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[SessionMemoryManager] Failed to load session:', sessionId, error);
    }
    return null;
  }
  
  /**
   * Delete a session
   */
  deleteSession(sessionId: string): void {
    const key = this.storagePrefix + sessionId;
    localStorage.removeItem(key);
  }
  
  /**
   * Export session data
   */
  exportSession(sessionId: string): string | null {
    const data = this.loadSession(sessionId);
    if (data) {
      return JSON.stringify(data, null, 2);
    }
    return null;
  }
  
  /**
   * Import session data
   */
  importSession(jsonData: string): string | null {
    try {
      const data = JSON.parse(jsonData) as SessionData;
      if (data.state && data.state.id) {
        this.saveSession(data);
        return data.state.id;
      }
    } catch (error) {
      console.error('[SessionMemoryManager] Failed to import session:', error);
    }
    return null;
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAutoSave();
    this.saveCurrentSession();
  }
  
  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    this.stopAutoSave();
    
    this.autoSaveTimer = setInterval(() => {
      this.saveCurrentSession();
    }, this.autoSaveInterval);
  }
  
  /**
   * Stop auto-save timer
   */
  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
  
  /**
   * Save current session
   */
  private saveCurrentSession(): void {
    if (!this.currentSessionId) return;
    
    const sessionData = this.getCurrentSession();
    if (sessionData) {
      sessionData.state.lastSaveTime = Date.now();
      this.saveSession(sessionData);
      console.log('[SessionMemoryManager] Auto-saved session:', this.currentSessionId);
    }
  }
  
  /**
   * Save session data
   */
  private saveSession(data: SessionData): void {
    try {
      const key = this.storagePrefix + data.state.id;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('[SessionMemoryManager] Failed to save session:', error);
      
      // If storage is full, try to clean up old sessions
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.cleanupOldSessions(true);
        
        // Retry save
        try {
          const key = this.storagePrefix + data.state.id;
          localStorage.setItem(key, JSON.stringify(data));
        } catch (retryError) {
          console.error('[SessionMemoryManager] Failed to save after cleanup:', retryError);
        }
      }
    }
  }
  
  /**
   * Clean up old sessions
   */
  private cleanupOldSessions(force: boolean = false): void {
    const sessions = this.getAllSessions();
    
    if (sessions.length > this.maxSessions || force) {
      // Keep only the most recent sessions
      const sessionsToKeep = sessions.slice(0, this.maxSessions - 1);
      const sessionIdsToKeep = new Set(sessionsToKeep.map(s => s.id));
      
      // Delete old sessions
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.storagePrefix)) {
          const sessionId = key.replace(this.storagePrefix, '');
          if (!sessionIdsToKeep.has(sessionId) && sessionId !== this.currentSessionId) {
            localStorage.removeItem(key);
            console.log('[SessionMemoryManager] Removed old session:', sessionId);
          }
        }
      }
    }
  }
  
  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}_${random}`;
  }
}