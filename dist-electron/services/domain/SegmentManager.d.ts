import { EventEmitter } from 'events';
import { CoalescerMetrics } from './StreamCoalescer';
/**
 * SegmentManager - Manages multiple StreamCoalescers
 *
 * Responsibilities:
 * - Create and manage StreamCoalescer instances
 * - Generate segment keys (startMs-endMs format)
 * - Route segments to appropriate coalescers
 * - Cleanup inactive coalescers
 * - Aggregate metrics across all coalescers
 *
 * Key Features:
 * - Automatic coalescer lifecycle management
 * - Time-based segment key generation
 * - Configurable cleanup intervals
 * - Comprehensive metrics aggregation
 */
export interface SegmentManagerConfig {
    debounceMs?: number;
    forceCommitMs?: number;
    cleanupIntervalMs?: number;
    maxInactiveMs?: number;
}
export interface SegmentManagerMetrics {
    active_coalescers: number;
    total_coalescers_created: number;
    total_coalescers_destroyed: number;
    aggregated_metrics: CoalescerMetrics;
}
export interface SegmentInput {
    text: string;
    translation?: string;
    confidence: number;
    isFinal: boolean;
    startMs?: number;
    endMs?: number;
    metadata?: Record<string, unknown>;
}
export declare class SegmentManager extends EventEmitter {
    private coalescers;
    private coalescerLastActivity;
    private cleanupInterval;
    private config;
    private componentLogger;
    private totalCoalescersCreated;
    private totalCoalescersDestroyed;
    constructor(config?: SegmentManagerConfig);
    /**
     * Process incoming segment
     */
    processSegment(input: SegmentInput): void;
    /**
     * Update translation for a specific segment
     */
    updateSegmentTranslation(segmentId: string, translation: string, isFinal: boolean): void;
    /**
     * Force emit all active segments
     */
    forceEmitAll(): void;
    /**
     * Get aggregated metrics from all coalescers
     */
    getMetrics(): SegmentManagerMetrics;
    /**
     * Reset all coalescers
     */
    resetAll(): void;
    /**
     * Destroy all coalescers and cleanup
     */
    destroy(): void;
    /**
     * Generate segment key from input
     */
    private generateSegmentKey;
    /**
     * Simple hash function for text
     */
    private simpleHash;
    /**
     * Create new coalescer
     */
    private createCoalescer;
    /**
     * Destroy coalescer
     */
    private destroyCoalescer;
    /**
     * Start cleanup interval for inactive coalescers
     */
    private startCleanupInterval;
    /**
     * Cleanup inactive coalescers
     */
    private cleanupInactiveCoalescers;
}
