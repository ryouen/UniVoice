"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamCoalescer = void 0;
const events_1 = require("events");
const logger_1 = require("../../utils/logger");
class StreamCoalescer extends events_1.EventEmitter {
    constructor(segmentId, debounceMs = 160, forceCommitMs = 1100) {
        super();
        this.currentText = '';
        this.currentTranslation = '';
        this.confidence = 0;
        this.isFinal = false;
        this.metadata = {};
        this.debounceTimer = null;
        this.forceCommitTimer = null;
        this.startTime = 0;
        this.lastEmittedText = '';
        this.lastEmittedTranslation = '';
        this.PUNCTUATION_PATTERN = /[。．！!？?」]$/;
        // Metrics
        this.metrics = {
            suppressed_count: 0,
            emitted_count: 0,
            avg_hold_ms: 0,
            total_segments: 0,
            duplicate_suppressions: 0,
        };
        this.holdTimes = [];
        this.componentLogger = logger_1.logger.child('StreamCoalescer');
        this.segmentId = segmentId;
        this.DEBOUNCE_MS = debounceMs;
        this.FORCE_COMMIT_MS = forceCommitMs;
        this.componentLogger.debug('StreamCoalescer created', {
            segmentId,
            debounceMs,
            forceCommitMs,
        });
    }
    /**
     * Add new text segment to coalescer
     */
    addSegment(data) {
        const startTime = Date.now();
        // Initialize timing if this is the first segment
        if (this.startTime === 0) {
            this.startTime = startTime;
        }
        // Update current state
        this.currentText = data.text;
        this.currentTranslation = data.translation || '';
        this.confidence = data.confidence;
        this.isFinal = data.isFinal;
        this.metadata = data.metadata || {};
        this.componentLogger.debug('Segment added', {
            segmentId: this.segmentId,
            textLength: data.text.length,
            hasTranslation: !!data.translation,
            isFinal: data.isFinal,
            confidence: data.confidence,
        });
        // Check for immediate emission conditions
        if (this.shouldEmitImmediately(data)) {
            this.emitSegment('immediate');
            return;
        }
        // Check for duplicate content
        if (this.isDuplicate(data)) {
            this.metrics.duplicate_suppressions++;
            this.componentLogger.debug('Duplicate segment suppressed', {
                segmentId: this.segmentId,
                text: data.text.substring(0, 50) + '...',
            });
            return;
        }
        // Clear existing timers
        this.clearTimers();
        // Set debounce timer
        this.debounceTimer = setTimeout(() => {
            this.emitSegment('debounce');
        }, this.DEBOUNCE_MS);
        // Set force commit timer if not already set
        if (!this.forceCommitTimer) {
            this.forceCommitTimer = setTimeout(() => {
                this.emitSegment('force_commit');
            }, this.FORCE_COMMIT_MS);
        }
        this.metrics.total_segments++;
    }
    /**
     * Force immediate emission of current segment
     */
    forceEmit() {
        if (this.currentText) {
            this.emitSegment('force');
        }
    }
    /**
     * Reset coalescer state
     */
    reset() {
        this.clearTimers();
        this.currentText = '';
        this.currentTranslation = '';
        this.confidence = 0;
        this.isFinal = false;
        this.metadata = {};
        this.startTime = 0;
        this.lastEmittedText = '';
        this.lastEmittedTranslation = '';
        this.componentLogger.debug('StreamCoalescer reset', {
            segmentId: this.segmentId,
        });
    }
    /**
     * Cleanup resources
     */
    destroy() {
        this.clearTimers();
        this.removeAllListeners();
        this.componentLogger.debug('StreamCoalescer destroyed', {
            segmentId: this.segmentId,
            finalMetrics: this.getMetrics(),
        });
    }
    /**
     * Check if segment should be emitted immediately
     */
    shouldEmitImmediately(data) {
        // Emit immediately if final
        if (data.isFinal) {
            return true;
        }
        // Emit immediately if ends with punctuation
        if (this.PUNCTUATION_PATTERN.test(data.text.trim())) {
            return true;
        }
        return false;
    }
    /**
     * Check if current segment is duplicate of last emitted
     */
    isDuplicate(data) {
        return (data.text === this.lastEmittedText &&
            (data.translation || '') === this.lastEmittedTranslation);
    }
    /**
     * Emit current segment
     */
    emitSegment(reason) {
        if (!this.currentText) {
            return;
        }
        const now = Date.now();
        const holdDuration = this.startTime > 0 ? now - this.startTime : 0;
        // Track hold time
        this.holdTimes.push(holdDuration);
        if (this.holdTimes.length > 100) {
            this.holdTimes = this.holdTimes.slice(-50); // Keep last 50 entries
        }
        const coalescedSegment = {
            segmentId: this.segmentId,
            data: {
                text: this.currentText,
                translation: this.currentTranslation,
                confidence: this.confidence,
                isFinal: this.isFinal,
                metadata: this.metadata,
            },
            timestamp: now,
            holdDuration,
        };
        // Update metrics
        this.metrics.emitted_count++;
        if (reason === 'debounce' || reason === 'force_commit') {
            this.metrics.suppressed_count += Math.max(0, this.metrics.total_segments - this.metrics.emitted_count);
        }
        // Update last emitted state
        this.lastEmittedText = this.currentText;
        this.lastEmittedTranslation = this.currentTranslation;
        this.componentLogger.info('Segment emitted', {
            segmentId: this.segmentId,
            reason,
            holdDuration,
            textLength: this.currentText.length,
            hasTranslation: !!this.currentTranslation,
            confidence: this.confidence,
            isFinal: this.isFinal,
        });
        // Emit event
        this.emit('segment', coalescedSegment);
        // Clear timers and reset for next segment
        this.clearTimers();
        this.startTime = 0;
    }
    /**
     * Clear all active timers
     */
    clearTimers() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        if (this.forceCommitTimer) {
            clearTimeout(this.forceCommitTimer);
            this.forceCommitTimer = null;
        }
    }
    /**
     * Get current segment data
     */
    getCurrentSegment() {
        if (!this.currentText) {
            return null;
        }
        return {
            text: this.currentText,
            translation: this.currentTranslation,
            confidence: this.confidence,
            isFinal: this.isFinal,
            metadata: this.metadata,
        };
    }
    /**
     * Get current metrics
     */
    getMetrics() {
        // Calculate average hold time
        const avgHoldMs = this.holdTimes.length > 0
            ? this.holdTimes.reduce((sum, time) => sum + time, 0) / this.holdTimes.length
            : 0;
        return {
            ...this.metrics,
            avg_hold_ms: avgHoldMs,
        };
    }
}
exports.StreamCoalescer = StreamCoalescer;
