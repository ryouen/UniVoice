"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SegmentManager = void 0;
const events_1 = require("events");
const StreamCoalescer_1 = require("./StreamCoalescer");
const logger_1 = require("../../utils/logger");
class SegmentManager extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.coalescers = new Map();
        this.coalescerLastActivity = new Map();
        this.cleanupInterval = null;
        this.componentLogger = logger_1.logger.child('SegmentManager');
        // Metrics
        this.totalCoalescersCreated = 0;
        this.totalCoalescersDestroyed = 0;
        this.config = {
            debounceMs: config.debounceMs ?? 160,
            forceCommitMs: config.forceCommitMs ?? 1100,
            cleanupIntervalMs: config.cleanupIntervalMs ?? 30000, // 30 seconds
            maxInactiveMs: config.maxInactiveMs ?? 60000, // 1 minute
        };
        this.startCleanupInterval();
        this.componentLogger.info('SegmentManager initialized', {
            config: this.config,
        });
    }
    /**
     * Process incoming segment
     */
    processSegment(input) {
        const segmentKey = this.generateSegmentKey(input);
        const now = Date.now();
        // Get or create coalescer
        let coalescer = this.coalescers.get(segmentKey);
        if (!coalescer) {
            coalescer = this.createCoalescer(segmentKey);
        }
        // Update activity timestamp
        this.coalescerLastActivity.set(segmentKey, now);
        // Convert input to SegmentData
        const segmentData = {
            text: input.text,
            confidence: input.confidence ?? 1,
            isFinal: input.isFinal ?? false,
            metadata: {
                ...input.metadata,
                startMs: input.startMs,
                endMs: input.endMs,
            },
        };
        if (input.translation !== undefined) {
            segmentData.translation = input.translation;
        }
        // Add to coalescer
        coalescer.addSegment(segmentData);
        this.componentLogger.debug('Segment processed', {
            segmentKey,
            textLength: input.text.length,
            hasTranslation: !!input.translation,
            isFinal: input.isFinal,
            confidence: input.confidence,
        });
    }
    /**
     * Update translation for a specific segment
     */
    updateSegmentTranslation(segmentId, translation, isFinal) {
        // Find the coalescer that contains this segment
        let found = false;
        for (const [segmentKey, coalescer] of this.coalescers) {
            // Check if this coalescer's segment ID matches
            const currentSegment = coalescer.getCurrentSegment();
            if (currentSegment && currentSegment.metadata?.segmentId === segmentId) {
                // Update the translation
                const segmentData = {
                    ...currentSegment,
                    translation: translation,
                    isFinal: isFinal,
                };
                // Add updated segment data
                coalescer.addSegment(segmentData);
                found = true;
                this.componentLogger.debug('Updated segment translation', {
                    segmentKey,
                    segmentId,
                    translationLength: translation.length,
                    isFinal,
                });
                break;
            }
        }
        if (!found) {
            this.componentLogger.warn('Segment not found for translation update', {
                segmentId,
                activeCoalescers: this.coalescers.size,
            });
        }
    }
    /**
     * Force emit all active segments
     */
    forceEmitAll() {
        let emittedCount = 0;
        for (const [_segmentKey, coalescer] of this.coalescers) {
            coalescer.forceEmit();
            emittedCount++;
        }
        this.componentLogger.info('Force emitted all segments', {
            emittedCount,
            totalCoalescers: this.coalescers.size,
        });
    }
    /**
     * Get aggregated metrics from all coalescers
     */
    getMetrics() {
        const aggregatedMetrics = {
            suppressed_count: 0,
            emitted_count: 0,
            avg_hold_ms: 0,
            total_segments: 0,
            duplicate_suppressions: 0,
        };
        let totalHoldMs = 0;
        let totalEmissions = 0;
        for (const coalescer of this.coalescers.values()) {
            const metrics = coalescer.getMetrics();
            aggregatedMetrics.suppressed_count += metrics.suppressed_count;
            aggregatedMetrics.emitted_count += metrics.emitted_count;
            aggregatedMetrics.total_segments += metrics.total_segments;
            aggregatedMetrics.duplicate_suppressions += metrics.duplicate_suppressions;
            if (metrics.emitted_count > 0) {
                totalHoldMs += metrics.avg_hold_ms * metrics.emitted_count;
                totalEmissions += metrics.emitted_count;
            }
        }
        // Calculate overall average hold time
        aggregatedMetrics.avg_hold_ms = totalEmissions > 0 ? totalHoldMs / totalEmissions : 0;
        return {
            active_coalescers: this.coalescers.size,
            total_coalescers_created: this.totalCoalescersCreated,
            total_coalescers_destroyed: this.totalCoalescersDestroyed,
            aggregated_metrics: aggregatedMetrics,
        };
    }
    /**
     * Reset all coalescers
     */
    resetAll() {
        for (const coalescer of this.coalescers.values()) {
            coalescer.reset();
        }
        this.componentLogger.info('All coalescers reset', {
            coalescerCount: this.coalescers.size,
        });
    }
    /**
     * Destroy all coalescers and cleanup
     */
    destroy() {
        // Stop cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        // Destroy all coalescers
        for (const [segmentKey, coalescer] of this.coalescers) {
            this.destroyCoalescer(segmentKey, coalescer);
        }
        this.coalescers.clear();
        this.coalescerLastActivity.clear();
        this.removeAllListeners();
        this.componentLogger.info('SegmentManager destroyed', {
            finalMetrics: this.getMetrics(),
        });
    }
    /**
     * Generate segment key from input
     */
    generateSegmentKey(input) {
        // Use provided timestamps if available
        if (input.startMs !== undefined && input.endMs !== undefined) {
            return `${input.startMs}-${input.endMs}`;
        }
        // Generate based on current time and text hash
        const now = Date.now();
        const textHash = this.simpleHash(input.text);
        return `${now}-${textHash}`;
    }
    /**
     * Simple hash function for text
     */
    simpleHash(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    /**
     * Create new coalescer
     */
    createCoalescer(segmentKey) {
        const coalescer = new StreamCoalescer_1.StreamCoalescer(segmentKey, this.config.debounceMs, this.config.forceCommitMs);
        // Listen for coalesced segments
        coalescer.on('segment', (coalescedSegment) => {
            this.emit('coalescedSegment', coalescedSegment);
        });
        this.coalescers.set(segmentKey, coalescer);
        this.coalescerLastActivity.set(segmentKey, Date.now());
        this.totalCoalescersCreated++;
        this.componentLogger.debug('Coalescer created', {
            segmentKey,
            totalActive: this.coalescers.size,
            totalCreated: this.totalCoalescersCreated,
        });
        return coalescer;
    }
    /**
     * Destroy coalescer
     */
    destroyCoalescer(segmentKey, coalescer) {
        coalescer.destroy();
        this.coalescers.delete(segmentKey);
        this.coalescerLastActivity.delete(segmentKey);
        this.totalCoalescersDestroyed++;
        this.componentLogger.debug('Coalescer destroyed', {
            segmentKey,
            totalActive: this.coalescers.size,
            totalDestroyed: this.totalCoalescersDestroyed,
        });
    }
    /**
     * Start cleanup interval for inactive coalescers
     */
    startCleanupInterval() {
        this.cleanupInterval = setInterval(() => {
            this.cleanupInactiveCoalescers();
        }, this.config.cleanupIntervalMs);
    }
    /**
     * Cleanup inactive coalescers
     */
    cleanupInactiveCoalescers() {
        const now = Date.now();
        const inactiveKeys = [];
        for (const [segmentKey, lastActivity] of this.coalescerLastActivity) {
            if (now - lastActivity > this.config.maxInactiveMs) {
                inactiveKeys.push(segmentKey);
            }
        }
        let cleanedCount = 0;
        for (const segmentKey of inactiveKeys) {
            const coalescer = this.coalescers.get(segmentKey);
            if (coalescer) {
                // Force emit any pending content before cleanup
                coalescer.forceEmit();
                this.destroyCoalescer(segmentKey, coalescer);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            this.componentLogger.info('Inactive coalescers cleaned up', {
                cleanedCount,
                remainingActive: this.coalescers.size,
                maxInactiveMs: this.config.maxInactiveMs,
            });
        }
    }
}
exports.SegmentManager = SegmentManager;
