/**
 * StreamingBuffer - リアルタイムストリーミングデータのバッファリング
 * 
 * 用途:
 * - 長時間のストリーミングセッションのデータ管理
 * - メモリ効率的なセグメント管理
 * - 定期的なコンパクション
 */

export interface BufferSegment {
  id: string;
  timestamp: number;
  original: string;
  translation: string;
  metadata?: {
    wordCount?: number;
    [key: string]: any;
  };
}

interface StreamingBufferOptions {
  maxDurationMs?: number;      // バッファの最大保持時間
  maxSegments?: number;        // 最大セグメント数
  compactionInterval?: number; // コンパクション間隔
}

export class StreamingBuffer {
  private segments: BufferSegment[] = [];
  private readonly maxDurationMs: number;
  private readonly maxSegments: number;
  private readonly compactionInterval: number;
  private compactionTimer: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();

  constructor(options: StreamingBufferOptions = {}) {
    this.maxDurationMs = options.maxDurationMs ?? 3 * 60 * 60 * 1000; // 3時間
    this.maxSegments = options.maxSegments ?? 10000;
    this.compactionInterval = options.compactionInterval ?? 5 * 60 * 1000; // 5分

    this.startCompaction();
  }

  /**
   * セグメントを追加
   */
  addSegment(segment: BufferSegment): void {
    this.segments.push(segment);

    // 即座のサイズ制限チェック
    if (this.segments.length > this.maxSegments) {
      const removeCount = Math.floor(this.maxSegments * 0.1); // 10%削除
      this.segments.splice(0, removeCount);
    }
  }

  /**
   * 現在のセグメントを取得
   */
  getSegments(): BufferSegment[] {
    return [...this.segments];
  }

  /**
   * 時間範囲でセグメントを取得
   */
  getSegmentsByTimeRange(startTime: number, endTime: number): BufferSegment[] {
    return this.segments.filter(
      segment => segment.timestamp >= startTime && segment.timestamp <= endTime
    );
  }

  /**
   * 最後のNセグメントを取得
   */
  getLastSegments(count: number): BufferSegment[] {
    return this.segments.slice(-count);
  }

  /**
   * バッファをクリア
   */
  clear(): void {
    this.segments = [];
    this.startTime = Date.now();
  }

  /**
   * 統計情報を取得
   */
  getStats() {
    const totalWordCount = this.segments.reduce(
      (sum, segment) => sum + (segment.metadata?.wordCount || 0),
      0
    );

    return {
      segmentCount: this.segments.length,
      totalWordCount,
      duration: Date.now() - this.startTime,
      oldestTimestamp: this.segments[0]?.timestamp,
      newestTimestamp: this.segments[this.segments.length - 1]?.timestamp
    };
  }

  /**
   * バッファの破棄
   */
  destroy(): void {
    this.stopCompaction();
    this.clear();
  }

  /**
   * コンパクション開始
   */
  private startCompaction(): void {
    this.stopCompaction();

    this.compactionTimer = setInterval(() => {
      this.compact();
    }, this.compactionInterval);
  }

  /**
   * コンパクション停止
   */
  private stopCompaction(): void {
    if (this.compactionTimer) {
      clearInterval(this.compactionTimer);
      this.compactionTimer = null;
    }
  }

  /**
   * バッファのコンパクション
   */
  private compact(): void {
    const now = Date.now();
    const cutoffTime = now - this.maxDurationMs;

    // 古いセグメントを削除
    const beforeCount = this.segments.length;
    this.segments = this.segments.filter(
      segment => segment.timestamp > cutoffTime
    );

    const removed = beforeCount - this.segments.length;
    if (removed > 0) {
      console.log(`[StreamingBuffer] Compacted: removed ${removed} old segments`);
    }
  }
}