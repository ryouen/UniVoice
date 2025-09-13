import { EventEmitter } from 'events';
/**
 * StreamCoalescer - Intelligent text segment coalescing
 *
 * Responsibilities:
 * - Coalesce streaming text based on punctuation patterns
 * - Debounce rapid updates to reduce UI churn
 * - Force commit segments after timeout
 * - Track metrics for optimization
 *
 * Key Features:
 * - Punctuation-based coalescing (/[。．！!？?」]$/)
 * - 160ms debounce for rapid updates
 * - 1100ms force commit timeout
 * - Duplicate suppression
 * - Performance metrics collection
 */
export interface CoalescerMetrics {
    suppressed_count: number;
    emitted_count: number;
    avg_hold_ms: number;
    total_segments: number;
    duplicate_suppressions: number;
}
export interface SegmentData {
    text: string;
    translation?: string;
    confidence: number;
    isFinal: boolean;
    metadata?: Record<string, unknown>;
}
export interface CoalescedSegment {
    segmentId: string;
    data: SegmentData;
    timestamp: number;
    holdDuration: number;
}
export declare class StreamCoalescer extends EventEmitter {
    private segmentId;
    private currentText;
    private currentTranslation;
    private confidence;
    private isFinal;
    private metadata;
    private debounceTimer;
    private forceCommitTimer;
    private startTime;
    private lastEmittedText;
    private lastEmittedTranslation;
    private readonly DEBOUNCE_MS;
    private readonly FORCE_COMMIT_MS;
    private readonly PUNCTUATION_PATTERN;
    private metrics;
    private holdTimes;
    private componentLogger;
    constructor(segmentId: string, debounceMs?: number, forceCommitMs?: number);
    /**
     * Add new text segment to coalescer
     */
    addSegment(data: SegmentData): void;
    /**
     * Force immediate emission of current segment
     */
    forceEmit(): void;
    /**
     * Reset coalescer state
     */
    reset(): void;
    /**
     * Cleanup resources
     */
    destroy(): void;
    /**
     * Check if segment should be emitted immediately
     */
    private shouldEmitImmediately;
    /**
     * Check if current segment is duplicate of last emitted
     */
    private isDuplicate;
    /**
     * Emit current segment
     */
    private emitSegment;
    /**
     * Clear all active timers
     */
    private clearTimers;
    /**
     * Get current segment data
     */
    getCurrentSegment(): SegmentData | null;
    /**
     * Get current metrics
     */
    getMetrics(): CoalescerMetrics;
}
