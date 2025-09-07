import { StreamCoalescer, SegmentData } from '../../electron/services/domain/StreamCoalescer';

describe('StreamCoalescer', () => {
  let coalescer: StreamCoalescer;
  let emittedSegments: any[] = [];

  beforeEach(() => {
    emittedSegments = [];
    coalescer = new StreamCoalescer('test-segment', 100, 500); // 短い時間でテスト
    
    // イベントリスナーを設定
    coalescer.on('segment', (segment) => {
      emittedSegments.push(segment);
    });
  });

  afterEach(() => {
    coalescer.destroy();
  });

  describe('基本的な凝集機能', () => {
    test('句読点で即座にコミット', (done) => {
      const segmentData: SegmentData = {
        text: 'こんにちは。',
        confidence: 0.9,
        isFinal: false
      };

      coalescer.addSegment(segmentData);

      // 即座にコミットされることを確認
      setTimeout(() => {
        expect(emittedSegments).toHaveLength(1);
        expect(emittedSegments[0].data.text).toBe('こんにちは。');
        done();
      }, 10);
    });

    test('英語の句読点でも即座にコミット', (done) => {
      const segmentData: SegmentData = {
        text: 'Hello world!',
        confidence: 0.9,
        isFinal: false
      };

      coalescer.addSegment(segmentData);

      setTimeout(() => {
        expect(emittedSegments).toHaveLength(1);
        expect(emittedSegments[0].data.text).toBe('Hello world!');
        done();
      }, 10);
    });

    test('finalフラグで即座にコミット', (done) => {
      const segmentData: SegmentData = {
        text: 'Final segment',
        confidence: 0.9,
        isFinal: true
      };

      coalescer.addSegment(segmentData);

      setTimeout(() => {
        expect(emittedSegments).toHaveLength(1);
        expect(emittedSegments[0].data.text).toBe('Final segment');
        expect(emittedSegments[0].data.isFinal).toBe(true);
        done();
      }, 10);
    });
  });

  describe('デバウンス機能', () => {
    test('デバウンス時間内の更新は抑制される', (done) => {
      const segmentData1: SegmentData = {
        text: 'Hello',
        confidence: 0.8,
        isFinal: false
      };

      const segmentData2: SegmentData = {
        text: 'Hello world',
        confidence: 0.8,
        isFinal: false
      };

      coalescer.addSegment(segmentData1);
      
      // デバウンス時間内に追加
      setTimeout(() => {
        coalescer.addSegment(segmentData2);
      }, 50);

      // デバウンス時間後に確認
      setTimeout(() => {
        expect(emittedSegments).toHaveLength(1);
        expect(emittedSegments[0].data.text).toBe('Hello world');
        done();
      }, 200);
    });

    test('強制コミット時間で確実にコミット', (done) => {
      const segmentData: SegmentData = {
        text: 'Long running segment',
        confidence: 0.8,
        isFinal: false
      };

      coalescer.addSegment(segmentData);

      // 強制コミット時間後に確認
      setTimeout(() => {
        expect(emittedSegments).toHaveLength(1);
        expect(emittedSegments[0].data.text).toBe('Long running segment');
        done();
      }, 600);
    });
  });

  describe('重複抑制機能', () => {
    test('同一内容の重複は抑制される', (done) => {
      const segmentData1: SegmentData = {
        text: 'Same text',
        confidence: 0.8,
        isFinal: false
      };

      const segmentData2: SegmentData = {
        text: 'Same text',
        confidence: 0.8,
        isFinal: false
      };

      coalescer.addSegment(segmentData1);
      
      // デバウンス後に同じ内容を追加
      setTimeout(() => {
        coalescer.addSegment(segmentData2);
        
        // さらに待って確認
        setTimeout(() => {
          expect(emittedSegments).toHaveLength(1);
          expect(emittedSegments[0].data.text).toBe('Same text');
          done();
        }, 150);
      }, 150);
    });

    test('翻訳付きセグメントの重複も抑制される', (done) => {
      const segmentData1: SegmentData = {
        text: 'Hello',
        translation: 'こんにちは',
        confidence: 0.8,
        isFinal: false
      };

      const segmentData2: SegmentData = {
        text: 'Hello',
        translation: 'こんにちは',
        confidence: 0.8,
        isFinal: false
      };

      coalescer.addSegment(segmentData1);
      
      setTimeout(() => {
        coalescer.addSegment(segmentData2);
        
        setTimeout(() => {
          expect(emittedSegments).toHaveLength(1);
          expect(emittedSegments[0].data.text).toBe('Hello');
          expect(emittedSegments[0].data.translation).toBe('こんにちは');
          done();
        }, 150);
      }, 150);
    });
  });

  describe('メトリクス収集', () => {
    test('メトリクスが正しく収集される', (done) => {
      const segmentData1: SegmentData = {
        text: 'First',
        confidence: 0.8,
        isFinal: false
      };

      const segmentData2: SegmentData = {
        text: 'Second。',
        confidence: 0.9,
        isFinal: false
      };

      coalescer.addSegment(segmentData1);
      coalescer.addSegment(segmentData2); // 句読点で即座にコミット

      setTimeout(() => {
        const metrics = coalescer.getMetrics();
        
        expect(metrics.total_segments).toBe(2);
        expect(metrics.emitted_count).toBe(1); // 句読点のもののみ
        expect(metrics.avg_hold_ms).toBeGreaterThan(0);
        done();
      }, 150);
    });

    test('重複抑制がメトリクスに反映される', (done) => {
      const segmentData1: SegmentData = {
        text: 'Same',
        confidence: 0.8,
        isFinal: false
      };

      const segmentData2: SegmentData = {
        text: 'Same',
        confidence: 0.8,
        isFinal: false
      };

      coalescer.addSegment(segmentData1);
      
      setTimeout(() => {
        coalescer.addSegment(segmentData2);
        
        setTimeout(() => {
          const metrics = coalescer.getMetrics();
          expect(metrics.duplicate_suppressions).toBe(1);
          done();
        }, 150);
      }, 150);
    });
  });

  describe('強制エミット機能', () => {
    test('forceEmitで即座にコミット', () => {
      const segmentData: SegmentData = {
        text: 'Force emit test',
        confidence: 0.8,
        isFinal: false
      };

      coalescer.addSegment(segmentData);
      coalescer.forceEmit();

      expect(emittedSegments).toHaveLength(1);
      expect(emittedSegments[0].data.text).toBe('Force emit test');
    });

    test('空の状態でforceEmitしても何も起こらない', () => {
      coalescer.forceEmit();
      expect(emittedSegments).toHaveLength(0);
    });
  });

  describe('リセット機能', () => {
    test('resetで状態がクリアされる', (done) => {
      const segmentData: SegmentData = {
        text: 'Before reset',
        confidence: 0.8,
        isFinal: false
      };

      coalescer.addSegment(segmentData);
      coalescer.reset();

      // リセット後は何もエミットされない
      setTimeout(() => {
        expect(emittedSegments).toHaveLength(0);
        done();
      }, 150);
    });
  });

  describe('エラーハンドリング', () => {
    test('不正なデータでもクラッシュしない', () => {
      const invalidData = {
        text: '',
        confidence: -1,
        isFinal: false
      } as SegmentData;

      expect(() => {
        coalescer.addSegment(invalidData);
      }).not.toThrow();
    });

    test('非常に長いテキストでも処理できる', (done) => {
      const longText = 'A'.repeat(10000);
      const segmentData: SegmentData = {
        text: longText,
        confidence: 0.8,
        isFinal: true
      };

      coalescer.addSegment(segmentData);

      setTimeout(() => {
        expect(emittedSegments).toHaveLength(1);
        expect(emittedSegments[0].data.text).toBe(longText);
        done();
      }, 10);
    });
  });
});