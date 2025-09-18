import { SegmentManager, SegmentInput } from '../../electron/services/domain/SegmentManager';

// Helper function for async delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('SegmentManager', () => {
  let segmentManager: SegmentManager;
  let coalescedSegments: any[] = [];

  beforeEach(() => {
    coalescedSegments = [];
    // Use short, predictable timings for tests
    segmentManager = new SegmentManager({
      debounceMs: 20,
      forceCommitMs: 50,
      cleanupIntervalMs: 100,
      maxInactiveMs: 60
    });

    segmentManager.on('coalescedSegment', (segment) => {
      coalescedSegments.push(segment);
    });
  });

  afterEach(() => {
    segmentManager.destroy();
  });

  describe('セグメント処理', () => {
    it('基本的なセグメント処理', async () => {
      const segmentInput: SegmentInput = { text: 'Hello world', confidence: 0.9, isFinal: true, startMs: 1000, endMs: 2000 };
      segmentManager.processSegment(segmentInput);
      await delay(1); // Allow coalescer to be created and process the segment
      expect(coalescedSegments).toHaveLength(1);
      expect(coalescedSegments[0].data.text).toBe('Hello world');
    });

    it('複数セグメントの並行処理', async () => {
      const segment1: SegmentInput = { text: 'First', confidence: 0.9, isFinal: true, startMs: 1000, endMs: 2000 };
      const segment2: SegmentInput = { text: 'Second', confidence: 0.8, isFinal: true, startMs: 3000, endMs: 4000 };

      segmentManager.processSegment(segment1);
      segmentManager.processSegment(segment2);
      await delay(1);

      expect(coalescedSegments).toHaveLength(2);
    });
  });

  describe('Coalescer管理', () => {
    it('メトリクス収集', async () => {
      const segment1: SegmentInput = { text: 'First', confidence: 0.8, isFinal: false, startMs: 1000, endMs: 2000 };
      const segment2: SegmentInput = { text: 'Second', confidence: 0.9, isFinal: false, startMs: 3000, endMs: 4000 };

      segmentManager.processSegment(segment1);
      segmentManager.processSegment(segment2);
      await delay(1);

      const metrics = segmentManager.getMetrics();
      expect(metrics.active_coalescers).toBe(2);
      expect(metrics.total_coalescers_created).toBe(2);
      expect(metrics.aggregated_metrics.total_segments).toBe(2);
    });

    it('自動クリーンアップ', async () => {
      const segmentInput: SegmentInput = { text: 'Will be cleaned up', confidence: 0.8, isFinal: true, startMs: 1000, endMs: 2000 };
  
      segmentManager.processSegment(segmentInput);
      await delay(1);
      expect(segmentManager.getMetrics().active_coalescers).toBe(1);
  
      await delay(200); // Wait for cleanup interval + inactive time
  
      const metrics = segmentManager.getMetrics();
      expect(metrics.active_coalescers).toBe(0);
      expect(metrics.total_coalescers_destroyed).toBe(1);
    });
  });
});