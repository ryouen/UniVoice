/**
 * SessionService - Domain Service for Session Management
 * 
 * Responsibilities:
 * - Session lifecycle management (start, pause, stop)
 * - Recording time tracking
 * - Session metadata management
 * - Auto-save coordination
 * 
 * This service is UI-agnostic and focuses on business logic
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';

// Domain Models
export interface SessionConfig {
  className: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface SessionState {
  id: string;
  className: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: 'idle' | 'active' | 'paused' | 'stopped';
  startTime: Date | null;
  endTime: Date | null;
  duration: number; // seconds
  lastAutoSave: Date | null;
}

export interface SessionMetrics {
  totalSegments: number;
  totalWords: number;
  averageSegmentLength: number;
}

// Events
export type SessionEvent = 
  | { type: 'session:started'; data: SessionState }
  | { type: 'session:paused'; data: SessionState }
  | { type: 'session:resumed'; data: SessionState }
  | { type: 'session:stopped'; data: SessionState }
  | { type: 'session:autoSaved'; data: { timestamp: Date } }
  | { type: 'session:error'; data: { error: Error } };

export class SessionService extends EventEmitter {
  private state: SessionState;
  private timerInterval: NodeJS.Timeout | null = null;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    super();
    this.state = this.createInitialState();
  }

  private createInitialState(): SessionState {
    return {
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
  }

  /**
   * Start a new session
   */
  async startSession(config: SessionConfig): Promise<SessionState> {
    try {
      if (this.state.status === 'active') {
        throw new Error('Session already active');
      }

      const sessionId = this.generateSessionId(config.className);
      
      this.state = {
        ...this.state,
        id: sessionId,
        className: config.className,
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage,
        status: 'active',
        startTime: new Date(),
        endTime: null,
        duration: 0
      };

      // Start duration timer
      this.startDurationTimer();
      
      // Start auto-save timer (60 seconds)
      this.startAutoSaveTimer();

      logger.info('[SessionService] Session started', { sessionId });
      this.emit('session:started', this.state);

      return this.state;
    } catch (error) {
      logger.error('[SessionService] Failed to start session', { error });
      this.emit('session:error', { error: error as Error });
      throw error;
    }
  }

  /**
   * Pause the current session
   */
  async pauseSession(): Promise<SessionState> {
    if (this.state.status !== 'active') {
      throw new Error('No active session to pause');
    }

    this.state.status = 'paused';
    this.stopDurationTimer();

    logger.info('[SessionService] Session paused', { sessionId: this.state.id });
    this.emit('session:paused', this.state);

    return this.state;
  }

  /**
   * Resume a paused session
   */
  async resumeSession(): Promise<SessionState> {
    if (this.state.status !== 'paused') {
      throw new Error('No paused session to resume');
    }

    this.state.status = 'active';
    this.startDurationTimer();

    logger.info('[SessionService] Session resumed', { sessionId: this.state.id });
    this.emit('session:resumed', this.state);

    return this.state;
  }

  /**
   * Stop the current session
   */
  async stopSession(): Promise<SessionState> {
    if (this.state.status === 'idle' || this.state.status === 'stopped') {
      throw new Error('No active session to stop');
    }

    this.state.status = 'stopped';
    this.state.endTime = new Date();
    
    this.stopDurationTimer();
    this.stopAutoSaveTimer();

    logger.info('[SessionService] Session stopped', { 
      sessionId: this.state.id,
      duration: this.state.duration 
    });
    this.emit('session:stopped', this.state);

    return this.state;
  }

  /**
   * Get current session state
   */
  getState(): SessionState {
    return { ...this.state };
  }

  /**
   * Get session metrics
   */
  getMetrics(): SessionMetrics {
    // This will be populated by other services
    return {
      totalSegments: 0,
      totalWords: 0,
      averageSegmentLength: 0
    };
  }

  /**
   * Reset session to initial state
   */
  reset(): void {
    this.stopDurationTimer();
    this.stopAutoSaveTimer();
    this.state = this.createInitialState();
  }

  private generateSessionId(className: string): string {
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const timestamp = Date.now().toString(36);
    const cleanClassName = className.replace(/[^a-zA-Z0-9]/g, '_');
    return `${date}_${cleanClassName}_${timestamp}`;
  }

  private startDurationTimer(): void {
    if (this.timerInterval) return;

    this.timerInterval = setInterval(() => {
      if (this.state.startTime) {
        const elapsed = Math.floor((Date.now() - this.state.startTime.getTime()) / 1000);
        this.state.duration = elapsed;
      }
    }, 1000);
  }

  private stopDurationTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private startAutoSaveTimer(): void {
    if (this.autoSaveInterval) return;

    this.autoSaveInterval = setInterval(() => {
      this.state.lastAutoSave = new Date();
      this.emit('session:autoSaved', { timestamp: this.state.lastAutoSave });
    }, 60000); // 60 seconds
  }

  private stopAutoSaveTimer(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopDurationTimer();
    this.stopAutoSaveTimer();
    this.removeAllListeners();
  }
}