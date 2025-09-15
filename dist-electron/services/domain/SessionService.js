"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
const events_1 = require("events");
const logger_1 = require("../../utils/logger");
class SessionService extends events_1.EventEmitter {
    constructor() {
        super();
        this.timerInterval = null;
        this.autoSaveInterval = null;
        this.state = this.createInitialState();
    }
    createInitialState() {
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
    async startSession(config) {
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
            logger_1.logger.info('[SessionService] Session started', { sessionId });
            this.emit('session:started', this.state);
            return this.state;
        }
        catch (error) {
            logger_1.logger.error('[SessionService] Failed to start session', { error });
            this.emit('session:error', { error: error });
            throw error;
        }
    }
    /**
     * Pause the current session
     */
    async pauseSession() {
        if (this.state.status !== 'active') {
            throw new Error('No active session to pause');
        }
        this.state.status = 'paused';
        this.stopDurationTimer();
        logger_1.logger.info('[SessionService] Session paused', { sessionId: this.state.id });
        this.emit('session:paused', this.state);
        return this.state;
    }
    /**
     * Resume a paused session
     */
    async resumeSession() {
        if (this.state.status !== 'paused') {
            throw new Error('No paused session to resume');
        }
        this.state.status = 'active';
        this.startDurationTimer();
        logger_1.logger.info('[SessionService] Session resumed', { sessionId: this.state.id });
        this.emit('session:resumed', this.state);
        return this.state;
    }
    /**
     * Stop the current session
     */
    async stopSession() {
        if (this.state.status === 'idle' || this.state.status === 'stopped') {
            throw new Error('No active session to stop');
        }
        this.state.status = 'stopped';
        this.state.endTime = new Date();
        this.stopDurationTimer();
        this.stopAutoSaveTimer();
        logger_1.logger.info('[SessionService] Session stopped', {
            sessionId: this.state.id,
            duration: this.state.duration
        });
        this.emit('session:stopped', this.state);
        return this.state;
    }
    /**
     * Get current session state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Get session metrics
     */
    getMetrics() {
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
    reset() {
        this.stopDurationTimer();
        this.stopAutoSaveTimer();
        this.state = this.createInitialState();
    }
    generateSessionId(className) {
        const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const timestamp = Date.now().toString(36);
        const cleanClassName = className.replace(/[^a-zA-Z0-9]/g, '_');
        return `${date}_${cleanClassName}_${timestamp}`;
    }
    startDurationTimer() {
        if (this.timerInterval)
            return;
        this.timerInterval = setInterval(() => {
            if (this.state.startTime) {
                const elapsed = Math.floor((Date.now() - this.state.startTime.getTime()) / 1000);
                this.state.duration = elapsed;
            }
        }, 1000);
    }
    stopDurationTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    startAutoSaveTimer() {
        if (this.autoSaveInterval)
            return;
        this.autoSaveInterval = setInterval(() => {
            this.state.lastAutoSave = new Date();
            this.emit('session:autoSaved', { timestamp: this.state.lastAutoSave });
        }, 60000); // 60 seconds
    }
    stopAutoSaveTimer() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
    /**
     * Cleanup resources
     */
    destroy() {
        this.stopDurationTimer();
        this.stopAutoSaveTimer();
        this.removeAllListeners();
    }
}
exports.SessionService = SessionService;
