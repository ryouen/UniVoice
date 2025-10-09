import { StreamCoalescer, SegmentData } from '../../electron/services/domain/StreamCoalescer';

describe('StreamCoalescer', () => {
  let coalescer: StreamCoalescer;
  let emittedSegments: any[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
    emittedSegments = [];
    coalescer = new StreamCoalescer('test-segment', 100, 500);
    coalescer.on('segment', (segment) => {
      emittedSegments.push(segment);
    });
  });

  afterEach(() => {
    coalescer.destroy();
    jest.useRealTimers();
  });

  describe('基本的な凝集機能', () => {
    it('句読点で即座にコミット', async () => {
      const segmentData: SegmentData = { text: 'こんにちは。', confidence: 0.9, isFinal: false };
      coalescer.addSegment(segmentData);
      await new Promise(process.nextTick);
      expect(emittedSegments).toHaveLength(1);
      expect(emittedSegments[0].data.text).toBe('こんにちは。');
    });

    it('finalフラグで即座にコミット', async () => {
      const segmentData: SegmentData = { text: 'Final segment', confidence: 0.9, isFinal: true };
      coalescer.addSegment(segmentData);
      await new Promise(process.nextTick);
      expect(emittedSegments).toHaveLength(1);
      expect(emittedSegments[0].data.text).toBe('Final segment');
    });
  });

  describe('デバウンス機能', () => {
    it('デバウンス時間内の更新は抑制され、最後の内容でコミットされる', async () => {
      coalescer.addSegment({ text: 'Hello', confidence: 0.8, isFinal: false });
      jest.advanceTimersByTime(50);\n      await Promise.resolve();
      coalescer.addSegment({ text: 'Hello world', confidence: 0.8, isFinal: false });

      expect(emittedSegments).toHaveLength(0);

      jest.advanceTimersByTime(101);\n      await Promise.resolve();
      await new Promise(process.nextTick);
      expect(emittedSegments).toHaveLength(1);
      expect(emittedSegments[0].data.text).toBe('Hello world');
    });

    it('強制コミット時間で確実にコミット', async () => {
      coalescer.addSegment({ text: 'Long running', confidence: 0.8, isFinal: false });
      jest.advanceTimersByTime(501);\n      await Promise.resolve();
      await new Promise(process.nextTick);
      expect(emittedSegments).toHaveLength(1);
      expect(emittedSegments[0].data.text).toBe('Long running');
    });
  });

  describe('メトリクス収集', () => {
    it('メトリクスが正しく収集される', async () => {
      coalescer.addSegment({ text: 'First', confidence: 0.8, isFinal: false });
      coalescer.addSegment({ text: 'Second.', confidence: 0.9, isFinal: false }); // Emits immediately

      await new Promise(process.nextTick);
      
      const metrics = coalescer.getMetrics();
      expect(metrics.total_segments).toBe(2);
      expect(metrics.emitted_count).toBe(1);
    });
  });
});


