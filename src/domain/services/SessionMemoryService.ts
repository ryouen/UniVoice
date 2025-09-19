/**
 * SessionMemoryService - Clean Architectureに準拠したセッション管理
 * 
 * 改善点：
 * - Result型によるエラーハンドリング
 * - StoragePortによる外部依存の注入
 * - イベントベースの通知システム
 * - テスト可能な設計
 */

import { Result } from '../Result';
import type { StoragePort } from '../ports/StoragePort';
import type { Translation, Summary } from '../../hooks/useUnifiedPipeline';
import type { BufferSegment } from '../../utils/StreamingBuffer';

// Domain Events
export type SessionEvent = 
  | { type: 'session_started'; sessionId: string; timestamp: number }
  | { type: 'session_saved'; sessionId: string; timestamp: number }
  | { type: 'session_completed'; sessionId: string; timestamp: number }
  | { type: 'session_error'; sessionId: string; error: Error; timestamp: number }
  | { type: 'storage_quota_exceeded'; sessionId: string; timestamp: number };

export interface SessionState {
  id: string;
  className: string;
  startTime: number;
  endTime?: number;
  sourceLanguage: string;
  targetLanguage: string;
  status: 'active' | 'paused' | 'completed';
  wordCount: number;
  duration: number;
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

interface SessionMemoryServiceOptions {
  storage: StoragePort;
  autoSaveInterval?: number;
  maxSessions?: number;
  storagePrefix?: string;
  onEvent?: (event: SessionEvent) => void;
}

export class SessionMemoryService {
  private readonly storage: StoragePort;
  private readonly autoSaveInterval: number;
  private readonly maxSessions: number;
  private readonly storagePrefix: string;
  private readonly onEvent: ((event: SessionEvent) => void) | undefined;
  
  private currentSessionId: string | null = null;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private pendingData: Partial<SessionData> = {};
  private isSaving: boolean = false;
  private saveQueue: Promise<Result<void>> = Promise.resolve(Result.ok(undefined));
  private dataCache: Map<string, SessionData> = new Map();
  
  constructor(options: SessionMemoryServiceOptions) {
    this.storage = options.storage;
    this.autoSaveInterval = options.autoSaveInterval ?? 60 * 1000;
    this.maxSessions = options.maxSessions ?? 50;
    this.storagePrefix = options.storagePrefix ?? 'univoice_session_';
    this.onEvent = options.onEvent;
  }
  
  /**
   * Start a new session
   */
  async startSession(config: {
    className: string;
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<Result<string>> {
    try {
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
      
      const saveResult = await this.saveSession(sessionData);
      if (!saveResult.success) {
        return saveResult;
      }
      
      this.currentSessionId = sessionId;
      this.startAutoSave();
      
      // Clean up old sessions
      await this.cleanupOldSessions();
      
      this.emitEvent({
        type: 'session_started',
        sessionId,
        timestamp: now
      });
      
      return Result.ok(sessionId);
      
    } catch (error) {
      const err = new Error('Failed to start session');
      (err as any).cause = error;
      return Result.error(err);
    }
  }
  
  /**
   * Update current session state
   */
  updateSessionState(updates: Partial<SessionState>): Result<void> {
    if (!this.currentSessionId) {
      return Result.error(new Error('No active session'));
    }
    
    if (!this.pendingData.state) {
      const sessionResult = this.loadSessionSync(this.currentSessionId);
      if (!sessionResult.success) {
        return Result.error(sessionResult.error);
      }
      this.pendingData.state = sessionResult.data.state;
    }
    
    this.pendingData.state = { ...this.pendingData.state, ...updates };
    return Result.ok(undefined);
  }
  
  /**
   * Add translation to history with memory optimization
   */
  addTranslation(translation: Translation): Result<void> {
    if (!this.currentSessionId) {
      return Result.error(new Error('No active session'));
    }
    
    if (!this.pendingData.history) {
      const sessionResult = this.loadSessionSync(this.currentSessionId);
      this.pendingData.history = sessionResult.success ? sessionResult.data.history : [];
    }
    
    this.pendingData.history.push(translation);
    
    // メモリ最適化: 保留データが大きくなりすぎたら保存
    if (this.pendingData.history.length > 100) {
      this.triggerAsyncSave();
    }
    
    return Result.ok(undefined);
  }
  
  /**
   * Update existing translation (for high-quality translation updates)
   */
  updateTranslation(segmentId: string, updates: Partial<Translation>): Result<void> {
    if (!this.currentSessionId) {
      return Result.error(new Error('No active session'));
    }
    
    if (!this.pendingData.history) {
      const sessionResult = this.loadSessionSync(this.currentSessionId);
      this.pendingData.history = sessionResult.success ? sessionResult.data.history : [];
    }
    
    const index = this.pendingData.history.findIndex(t => t.id === segmentId);
    if (index === -1) {
      return Result.error(new Error(`Translation not found: ${segmentId}`));
    }
    
    this.pendingData.history[index] = {
      ...this.pendingData.history[index],
      ...updates,
      id: segmentId // Ensure id is preserved
    };
    
    // Trigger async save for important updates
    if (updates.japanese) {
      this.triggerAsyncSave();
    }
    
    return Result.ok(undefined);
  }
  
  /**
   * Add summary
   */
  addSummary(summary: Summary): Result<void> {
    if (!this.currentSessionId) {
      return Result.error(new Error('No active session'));
    }
    
    if (!this.pendingData.summaries) {
      const sessionResult = this.loadSessionSync(this.currentSessionId);
      this.pendingData.summaries = sessionResult.success ? sessionResult.data.summaries : [];
    }
    
    this.pendingData.summaries.push(summary);
    return Result.ok(undefined);
  }
  
  /**
   * Add memo
   */
  addMemo(memo: SessionMemo): Result<void> {
    if (!this.currentSessionId) {
      return Result.error(new Error('No active session'));
    }
    
    if (!this.pendingData.memos) {
      const sessionResult = this.loadSessionSync(this.currentSessionId);
      this.pendingData.memos = sessionResult.success ? sessionResult.data.memos : [];
    }
    
    this.pendingData.memos.push(memo);
    return Result.ok(undefined);
  }
  
  /**
   * Get current session data
   */
  getCurrentSession(): Result<SessionData> {
    if (!this.currentSessionId) {
      return Result.error(new Error('No active session'));
    }
    
    const savedResult = this.loadSessionSync(this.currentSessionId);
    if (!savedResult.success) {
      return savedResult;
    }
    
    // Merge pending data with saved data
    const mergedData: SessionData = {
      state: this.pendingData.state || savedResult.data.state,
      history: this.pendingData.history || savedResult.data.history,
      summaries: this.pendingData.summaries || savedResult.data.summaries,
      memos: this.pendingData.memos || savedResult.data.memos,
      bufferSegments: this.pendingData.bufferSegments || savedResult.data.bufferSegments || undefined
    };
    
    return Result.ok(mergedData);
  }
  
  /**
   * Complete current session
   */
  async completeSession(): Promise<Result<void>> {
    if (!this.currentSessionId) {
      return Result.error(new Error('No active session'));
    }
    
    const now = Date.now();
    const startTime = this.pendingData.state?.startTime || now;
    
    this.updateSessionState({
      status: 'completed',
      endTime: now,
      duration: now - startTime
    });
    
    const saveResult = await this.saveCurrentSession();
    if (!saveResult.success) {
      return saveResult;
    }
    
    this.stopAutoSave();
    
    this.emitEvent({
      type: 'session_completed',
      sessionId: this.currentSessionId,
      timestamp: now
    });
    
    this.currentSessionId = null;
    this.pendingData = {};
    
    return Result.ok(undefined);
  }
  
  /**
   * Get all sessions
   */
  async getAllSessions(): Promise<Result<SessionState[]>> {
    try {
      const keys = await this.storage.getAllKeys();
      const sessionKeys = keys.filter(key => key.startsWith(this.storagePrefix));
      
      const sessions: SessionState[] = [];
      
      for (const key of sessionKeys) {
        const sessionId = key.replace(this.storagePrefix, '');
        const loadResult = await this.loadSession(sessionId);
        
        if (loadResult.success) {
          sessions.push(loadResult.data.state);
        }
      }
      
      // Sort by start time (newest first)
      sessions.sort((a, b) => b.startTime - a.startTime);
      
      return Result.ok(sessions);
      
    } catch (error) {
      const err = new Error('Failed to get all sessions');
      (err as any).cause = error;
      return Result.error(err);
    }
  }
  
  /**
   * Load a specific session
   */
  async loadSession(sessionId: string): Promise<Result<SessionData>> {
    try {
      const key = this.storagePrefix + sessionId;
      const data = await this.storage.getItem(key);
      
      if (!data) {
        return Result.error(new Error(`Session not found: ${sessionId}`));
      }
      
      const sessionData = JSON.parse(data) as SessionData;
      return Result.ok(sessionData);
      
    } catch (error) {
      const err = new Error(`Failed to load session: ${sessionId}`);
      (err as any).cause = error;
      return Result.error(err);
    }
  }
  
  /**
   * Export session data
   */
  async exportSession(sessionId: string): Promise<Result<string>> {
    const loadResult = await this.loadSession(sessionId);
    
    if (!loadResult.success) {
      return loadResult;
    }
    
    try {
      const json = JSON.stringify(loadResult.data, null, 2);
      return Result.ok(json);
    } catch (error) {
      const err = new Error('Failed to export session');
      (err as any).cause = error;
      return Result.error(err);
    }
  }
  
  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    this.stopAutoSave();
    
    if (this.currentSessionId) {
      await this.saveCurrentSession();
    }
    
    // クリーンアップ
    this.dataCache.clear();
    this.pendingData = {};
  }
  
  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    this.stopAutoSave();
    
    this.autoSaveTimer = setInterval(async () => {
      await this.saveCurrentSession();
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
   * Save current session with race condition protection
   */
  private async saveCurrentSession(): Promise<Result<void>> {
    if (!this.currentSessionId) {
      return Result.error(new Error('No active session'));
    }
    
    // 競合状態の防止
    if (this.isSaving) {
      console.log('[SessionMemoryService] Save already in progress, queueing...');
      return Result.ok(undefined);
    }
    
    this.isSaving = true;
    
    try {
      const sessionResult = this.getCurrentSession();
      if (!sessionResult.success) {
        return sessionResult;
      }
      
      sessionResult.data.state.lastSaveTime = Date.now();
      
      // キャッシュを更新
      this.dataCache.set(this.currentSessionId, sessionResult.data);
      
      const saveResult = await this.saveSession(sessionResult.data);
      if (saveResult.success) {
        // 保存成功後、pendingDataをクリア
        this.pendingData = {};
        
        this.emitEvent({
          type: 'session_saved',
          sessionId: this.currentSessionId,
          timestamp: Date.now()
        });
      }
      
      return saveResult;
    } finally {
      this.isSaving = false;
    }
  }
  
  /**
   * Save session data
   */
  private async saveSession(data: SessionData): Promise<Result<void>> {
    try {
      const key = this.storagePrefix + data.state.id;
      await this.storage.setItem(key, JSON.stringify(data));
      return Result.ok(undefined);
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('quota')) {
        this.emitEvent({
          type: 'storage_quota_exceeded',
          sessionId: data.state.id,
          timestamp: Date.now()
        });
        
        // Try cleanup and retry
        const cleanupResult = await this.cleanupOldSessions(true);
        if (cleanupResult.success) {
          try {
            const key = this.storagePrefix + data.state.id;
            await this.storage.setItem(key, JSON.stringify(data));
            return Result.ok(undefined);
          } catch (retryError) {
            const err = new Error('Failed to save after cleanup');
            (err as any).cause = retryError;
            return Result.error(err);
          }
        }
      }
      
      const err = new Error('Failed to save session');
      (err as any).cause = error;
      return Result.error(err);
    }
  }
  
  /**
   * Clean up old sessions
   */
  private async cleanupOldSessions(force: boolean = false): Promise<Result<void>> {
    try {
      const sessionsResult = await this.getAllSessions();
      if (!sessionsResult.success) {
        return sessionsResult;
      }
      
      const sessions = sessionsResult.data;
      
      if (sessions.length > this.maxSessions || force) {
        // Keep only the most recent sessions
        const sessionsToDelete = sessions.slice(this.maxSessions - 1);
        
        for (const session of sessionsToDelete) {
          if (session.id !== this.currentSessionId) {
            const key = this.storagePrefix + session.id;
            await this.storage.removeItem(key);
          }
        }
      }
      
      return Result.ok(undefined);
      
    } catch (error) {
      const err = new Error('Failed to cleanup old sessions');
      (err as any).cause = error;
      return Result.error(err);
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
  
  /**
   * Emit event
   */
  private emitEvent(event: SessionEvent): void {
    if (this.onEvent) {
      this.onEvent(event);
    }
  }
  
  /**
   * Load session with caching for performance
   */
  private loadSessionSync(sessionId: string): Result<SessionData> {
    // キャッシュから取得
    const cached = this.dataCache.get(sessionId);
    if (cached) {
      return Result.ok(cached);
    }
    
    try {
      const key = this.storagePrefix + sessionId;
      const data = localStorage.getItem(key);
      
      if (!data) {
        return Result.error(new Error(`Session not found: ${sessionId}`));
      }
      
      const sessionData = JSON.parse(data) as SessionData;
      
      // キャッシュに保存（メモリ使用量を制限）
      if (this.dataCache.size > 5) {
        const firstKey = this.dataCache.keys().next().value;
        if (firstKey) {
          this.dataCache.delete(firstKey);
        }
      }
      this.dataCache.set(sessionId, sessionData);
      
      return Result.ok(sessionData);
      
    } catch (error) {
      const err = new Error(`Failed to load session: ${sessionId}`);
      (err as any).cause = error;
      return Result.error(err);
    }
  }
  
  /**
   * Trigger async save to avoid blocking
   */
  private triggerAsyncSave(): void {
    this.saveQueue = this.saveQueue.then(async () => {
      const result = await this.saveCurrentSession();
      return result;
    }).catch(error => {
      console.error('[SessionMemoryService] Async save failed:', error);
      this.emitEvent({
        type: 'session_error',
        sessionId: this.currentSessionId || 'unknown',
        error,
        timestamp: Date.now()
      });
      return Result.error(error);
    });
  }
}