import { EventEmitter } from 'events';
import { StreamCoalescer, CoalescedSegment, SegmentData, CoalescerMetrics } from './StreamCoalescer';
import { logger } from '../../utils/logger';

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

export class SegmentManager extends EventEmitter {
  private coalescers = new Map<string, StreamCoalescer>();
  private coalescerLastActivity = new Map<string, number>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private config: Required<SegmentManagerConfig>;
  private componentLogger = logger.child('SegmentManager');
  
  // Metrics
  private totalCoalescersCreated = 0;
  private totalCoalescersDestroyed = 0;

  constructor(config: SegmentManagerConfig = {}) {
    super();
    
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
  processSegment(input: SegmentInput): void {
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
    const segmentData: SegmentData = {
      text: input.text,
      translation: input.translation,
      confidence: input.confidence,
      isFinal: input.isFinal,
      metadata: {
        ...input.metadata,
        startMs: input.startMs,
        endMs: input.endMs,
      },
    };
    
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
   * Force emit all active segments
   */
  forceEmitAll(): void {
    let emittedCount = 0;
    
    for (const [segmentKey, coalescer] of this.coalescers) {
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
  getMetrics(): SegmentManagerMetrics {
    const aggregatedMetrics: CoalescerMetrics = {
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
  resetAll(): void {
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
  destroy(): void {
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
  private generateSegmentKey(input: SegmentInput): string {
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
  private simpleHash(text: string): number {
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
  private createCoalescer(segmentKey: string): StreamCoalescer {
    const coalescer = new StreamCoalescer(
      segmentKey,
      this.config.debounceMs,
      this.config.forceCommitMs
    );
    
    // Listen for coalesced segments
    coalescer.on('segment', (coalescedSegment: CoalescedSegment) => {
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
  private destroyCoalescer(segmentKey: string, coalescer: StreamCoalescer): void {
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
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveCoalescers();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Cleanup inactive coalescers
   */
  private cleanupInactiveCoalescers(): void {
    const now = Date.now();
    const inactiveKeys: string[] = [];
    
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