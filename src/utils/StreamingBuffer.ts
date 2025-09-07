/**
 * StreamingBuffer - 180分対応のストリーミングバッファ
 * 
 * 大学の授業（最大180分）に対応するための効率的なバッファリング
 * - メモリ効率的なリングバッファ実装
 * - タイムスタンプベースの管理
 * - セグメント単位での保存
 */

export interface BufferSegment {
  id: string;
  timestamp: number;
  original: string;
  translation: string;
  metadata?: {
    wordCount?: number;
    confidence?: number;
    language?: string;
  };
}

export interface BufferStats {
  totalSegments: number;
  totalDuration: number; // milliseconds
  memoryUsage: number; // bytes (estimated)
  oldestTimestamp: number;
  newestTimestamp: number;
}

interface StreamingBufferOptions {
  maxDurationMs?: number; // Default: 180 minutes
  maxSegments?: number; // Default: 10000
  compactionInterval?: number; // Default: 5 minutes
}

export class StreamingBuffer {
  private segments: Map<string, BufferSegment>;
  private segmentOrder: string[]; // Maintains insertion order
  private maxDurationMs: number;
  private maxSegments: number;
  private compactionInterval: number;
  private compactionTimer: NodeJS.Timeout | null = null;
  private startTime: number | null = null;
  
  constructor(options: StreamingBufferOptions = {}) {
    this.maxDurationMs = options.maxDurationMs ?? 180 * 60 * 1000; // 180 minutes
    this.maxSegments = options.maxSegments ?? 10000;
    this.compactionInterval = options.compactionInterval ?? 5 * 60 * 1000; // 5 minutes
    
    this.segments = new Map();
    this.segmentOrder = [];
    
    // Start periodic compaction
    this.startCompactionTimer();
  }
  
  /**
   * Add a new segment to the buffer
   */
  addSegment(segment: BufferSegment): void {
    if (!this.startTime) {
      this.startTime = segment.timestamp;
    }
    
    // Remove if already exists (update case)
    if (this.segments.has(segment.id)) {
      const index = this.segmentOrder.indexOf(segment.id);
      if (index > -1) {
        this.segmentOrder.splice(index, 1);
      }
    }
    
    // Add to buffer
    this.segments.set(segment.id, segment);
    this.segmentOrder.push(segment.id);
    
    // Check constraints
    this.enforceConstraints();
  }
  
  /**
   * Update an existing segment
   */
  updateSegment(id: string, updates: Partial<BufferSegment>): void {
    const segment = this.segments.get(id);
    if (segment) {
      this.segments.set(id, { ...segment, ...updates });
    }
  }
  
  /**
   * Get a segment by ID
   */
  getSegment(id: string): BufferSegment | undefined {
    return this.segments.get(id);
  }
  
  /**
   * Get segments within a time range
   */
  getSegmentsByTimeRange(startTime: number, endTime: number): BufferSegment[] {
    const result: BufferSegment[] = [];
    
    for (const id of this.segmentOrder) {
      const segment = this.segments.get(id);
      if (segment && segment.timestamp >= startTime && segment.timestamp <= endTime) {
        result.push(segment);
      }
    }
    
    return result;
  }
  
  /**
   * Get recent segments
   */
  getRecentSegments(count: number): BufferSegment[] {
    const startIndex = Math.max(0, this.segmentOrder.length - count);
    const recentIds = this.segmentOrder.slice(startIndex);
    
    return recentIds
      .map(id => this.segments.get(id))
      .filter((segment): segment is BufferSegment => segment !== undefined);
  }
  
  /**
   * Get all segments (for export)
   */
  getAllSegments(): BufferSegment[] {
    return this.segmentOrder
      .map(id => this.segments.get(id))
      .filter((segment): segment is BufferSegment => segment !== undefined);
  }
  
  /**
   * Get buffer statistics
   */
  getStats(): BufferStats {
    const segments = this.getAllSegments();
    
    if (segments.length === 0) {
      return {
        totalSegments: 0,
        totalDuration: 0,
        memoryUsage: 0,
        oldestTimestamp: 0,
        newestTimestamp: 0
      };
    }
    
    const oldestTimestamp = segments[0].timestamp;
    const newestTimestamp = segments[segments.length - 1].timestamp;
    
    // Estimate memory usage (rough approximation)
    const memoryUsage = segments.reduce((total, segment) => {
      const textSize = (segment.original.length + segment.translation.length) * 2; // 2 bytes per char
      const metadataSize = 100; // Rough estimate for metadata
      return total + textSize + metadataSize;
    }, 0);
    
    return {
      totalSegments: segments.length,
      totalDuration: newestTimestamp - oldestTimestamp,
      memoryUsage,
      oldestTimestamp,
      newestTimestamp
    };
  }
  
  /**
   * Clear the buffer
   */
  clear(): void {
    this.segments.clear();
    this.segmentOrder = [];
    this.startTime = null;
  }
  
  /**
   * Destroy the buffer and clean up resources
   */
  destroy(): void {
    if (this.compactionTimer) {
      clearInterval(this.compactionTimer);
      this.compactionTimer = null;
    }
    this.clear();
  }
  
  /**
   * Enforce buffer constraints (max duration and max segments)
   */
  private enforceConstraints(): void {
    const now = Date.now();
    
    // Remove old segments beyond max duration
    if (this.startTime) {
      const cutoffTime = now - this.maxDurationMs;
      
      while (this.segmentOrder.length > 0) {
        const oldestId = this.segmentOrder[0];
        const oldestSegment = this.segments.get(oldestId);
        
        if (oldestSegment && oldestSegment.timestamp < cutoffTime) {
          this.segments.delete(oldestId);
          this.segmentOrder.shift();
        } else {
          break;
        }
      }
    }
    
    // Remove excess segments beyond max count
    while (this.segmentOrder.length > this.maxSegments) {
      const oldestId = this.segmentOrder.shift();
      if (oldestId) {
        this.segments.delete(oldestId);
      }
    }
  }
  
  /**
   * Start periodic compaction timer
   */
  private startCompactionTimer(): void {
    this.compactionTimer = setInterval(() => {
      this.compact();
    }, this.compactionInterval);
  }
  
  /**
   * Compact the buffer to save memory
   */
  private compact(): void {
    // Re-enforce constraints
    this.enforceConstraints();
    
    // Additional compaction logic could be added here
    // For example: merging very short segments, removing duplicates, etc.
    
    // Log stats for monitoring
    const stats = this.getStats();
    console.log('[StreamingBuffer] Compaction complete:', {
      segments: stats.totalSegments,
      duration: Math.floor(stats.totalDuration / 1000 / 60) + ' minutes',
      memory: Math.floor(stats.memoryUsage / 1024) + ' KB'
    });
  }
  
  /**
   * Export buffer for persistence
   */
  export(): { segments: BufferSegment[], metadata: { startTime: number | null, exportTime: number } } {
    return {
      segments: this.getAllSegments(),
      metadata: {
        startTime: this.startTime,
        exportTime: Date.now()
      }
    };
  }
  
  /**
   * Import buffer from persistence
   */
  import(data: { segments: BufferSegment[], metadata: { startTime: number | null } }): void {
    this.clear();
    this.startTime = data.metadata.startTime;
    
    // Re-add all segments
    for (const segment of data.segments) {
      this.segments.set(segment.id, segment);
      this.segmentOrder.push(segment.id);
    }
  }
}