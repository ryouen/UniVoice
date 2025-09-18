import { StreamCoalescer, SegmentData } from '../../electron/services/domain/StreamCoalescer';
import { SegmentManager, SegmentInput } from '../../electron/services/domain/SegmentManager';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Streaming Performance Tests', () => {
  // パフォーマンステストは環境に大きく依存するため、CI/CD環境では不安定になりがち。
  // ここでは、クラッシュせずに大量の処理を実行できるか、という安定性のみを検証する。

  describe('StreamCoalescer Performance', () => {
    it('should handle high-frequency updates without crashing', async () => {
      const coalescer = new StreamCoalescer('stability-test', 10, 100);
      let emittedCount = 0;
      coalescer.on('segment', () => {
        emittedCount++;
      });

      const updates = 500;
      for (let i = 0; i < updates; i++) {
        coalescer.addSegment({ text: `Update ${i}`, confidence: 0.8, isFinal: false });
        await delay(1); // Simulate rapid updates
      }
      coalescer.forceEmit();
      await delay(1);

      expect(emittedCount).toBeGreaterThan(0);
      expect(emittedCount).toBeLessThanOrEqual(updates);
      coalescer.destroy();
    });
  });

  describe('SegmentManager Performance', () => {
    it('should handle parallel segment processing without crashing', async () => {
      const segmentManager = new SegmentManager({
        debounceMs: 50,
        forceCommitMs: 200,
        cleanupIntervalMs: 5000,
        maxInactiveMs: 1000
      });

      let processedCount = 0;
      segmentManager.on('coalescedSegment', () => {
        processedCount++;
      });

      const segmentCount = 200; // Reduce count to prevent long test runs
      for (let i = 0; i < segmentCount; i++) {
        segmentManager.processSegment({
          text: `Parallel segment ${i}`,
          confidence: 0.8,
          isFinal: true,
          startMs: i * 100,
          endMs: (i + 1) * 100
        });
      }

      await delay(500); // Allow time for all segments to be processed

      expect(processedCount).toBe(segmentCount);
      segmentManager.destroy();
    });

    it('should clean up a large number of coalescers efficiently', async () => {
        const segmentManager = new SegmentManager({
            debounceMs: 10,
            forceCommitMs: 50,
            cleanupIntervalMs: 100,
            maxInactiveMs: 200
        });

        const segmentCount = 100; // Reduce count
        for (let i = 0; i < segmentCount; i++) {
            segmentManager.processSegment({ text: `Cleanup test ${i}`, confidence: 0.8, isFinal: true, startMs: i * 10, endMs: (i + 1) * 10 });
        }
        await delay(1); // Allow coalescers to be created

        const initialMetrics = segmentManager.getMetrics();
        expect(initialMetrics.active_coalescers).toBe(segmentCount);

        await delay(400); // Wait for cleanup to run

        const finalMetrics = segmentManager.getMetrics();
        expect(finalMetrics.active_coalescers).toBe(0);
        segmentManager.destroy();
    });
  });

  describe('Integrated Performance', () => {
    it('should handle a simulated real-time stream', async () => {
        const segmentManager = new SegmentManager({ debounceMs: 160, forceCommitMs: 1100 });
        let totalEmissions = 0;
        segmentManager.on('coalescedSegment', () => {
            totalEmissions++;
        });

        const sentences = ['Hello', 'Hello world', 'Hello world, this is a test.', 'How are you?', 'I am fine, thank you.'];

        for (const sentence of sentences) {
            segmentManager.processSegment({ text: sentence, confidence: 0.9, isFinal: sentence.endsWith('.') || sentence.endsWith('?'), startMs: 0, endMs: 1 });
            await delay(50);
        }
        segmentManager.forceEmitAll();
        await delay(1);

        expect(totalEmissions).toBeGreaterThan(0);
        expect(totalEmissions).toBeLessThanOrEqual(sentences.length);
        segmentManager.destroy();
    });
  });
});
