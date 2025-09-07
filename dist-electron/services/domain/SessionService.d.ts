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
    duration: number;
    lastAutoSave: Date | null;
}
export interface SessionMetrics {
    totalSegments: number;
    totalWords: number;
    averageSegmentLength: number;
}
export type SessionEvent = {
    type: 'session:started';
    data: SessionState;
} | {
    type: 'session:paused';
    data: SessionState;
} | {
    type: 'session:resumed';
    data: SessionState;
} | {
    type: 'session:stopped';
    data: SessionState;
} | {
    type: 'session:autoSaved';
    data: {
        timestamp: Date;
    };
} | {
    type: 'session:error';
    data: {
        error: Error;
    };
};
export declare class SessionService extends EventEmitter {
    private state;
    private timerInterval;
    private autoSaveInterval;
    constructor();
    private createInitialState;
    /**
     * Start a new session
     */
    startSession(config: SessionConfig): Promise<SessionState>;
    /**
     * Pause the current session
     */
    pauseSession(): Promise<SessionState>;
    /**
     * Resume a paused session
     */
    resumeSession(): Promise<SessionState>;
    /**
     * Stop the current session
     */
    stopSession(): Promise<SessionState>;
    /**
     * Get current session state
     */
    getState(): SessionState;
    /**
     * Get session metrics
     */
    getMetrics(): SessionMetrics;
    /**
     * Reset session to initial state
     */
    reset(): void;
    private generateSessionId;
    private startDurationTimer;
    private stopDurationTimer;
    private startAutoSaveTimer;
    private stopAutoSaveTimer;
    /**
     * Cleanup resources
     */
    destroy(): void;
}
