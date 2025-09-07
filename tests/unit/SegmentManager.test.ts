import { SegmentManager, SegmentInput } from '../../electron/services/domain/SegmentManager';

describe('SegmentManager', () => {
  let segmentManager: SegmentManager;
  let coalescedSegments: any[] = [];

  beforeEach(() => {
    coalescedSegments = [];
    segmentManager = new SegmentManager({
      debounceMs: 50,
      forceCommitMs: 200,
      cleanupIntervalMs: 1000,
      maxInactiveMs: 500
    });

    // イベントリスナーを設定
    segmentManager.on('coalescedSegment', (segment) => {
      coalescedSegments.push(segment);
    });
  });

  afterEach(() => {
    segmentManager.destroy();
  });

  describe('セグメント処理', () => {
    test('基本的なセグメント処理', (done) => {
      const segmentInput: SegmentInput = {
        text: 'Hello world',
        confidence: 0.9,
        isFinal: false,
        startMs: 1000,
        endMs: 2000
      };

      segmentManager.processSegment(segmentInput);

      setTimeout(() => {
        expect(coalescedSegments).toHaveLength(1);
        expect(coalescedSegments[0].data.text).toBe('Hello world');
        expect(coalescedSegments[0].segmentId).toBe('1000-2000');
        done();
      }, 100);
    });

    test('複数セグメントの並行処理', (done) => {
      const segment1: SegmentInput = {
        text: 'First segment',
        confidence: 0.9,
        isFinal: true,
        startMs: 1000,
        endMs: 2000
      };

      const segment2: SegmentInput = {
        text: 'Second segment',
        confidence: 0.8,
        isFinal: true,
        startMs: 3000,
        endMs: 4000
      };

      segmentManager.processSegment(segment1);
      segmentManager.processSegment(segment2);

      setTimeout(() => {
        expect(coalescedSegments).toHaveLength(2);
        
        const firstSegment = coalescedSegments.find(s => s.segmentId === '1000-2000');
        const secondSegment = coalescedSegments.find(s => s.segmentId === '3000-4000');
        
        expect(firstSegment.data.text).toBe('First segment');
        expect(secondSegment.data.text).toBe('Second segment');
        done();
      }, 100);
    });

    test('タイムスタンプなしセグメントの処理', (done) => {
      const segmentInput: SegmentInput = {
        text: 'No timestamp segment',
        confidence: 0.8,
        isFinal: true
      };

      segmentManager.processSegment(segmentInput);

      setTimeout(() => {
        expect(coalescedSegments).toHaveLength(1);
        expect(coalescedSegments[0].data.text).toBe('No timestamp segment');
        // セグメントIDは時間ベースのハッシュになる
        expect(coalescedSegments[0].segmentId).toMatch(/^\d+-\d+$/);
        done();
      }, 100);
    });
  });

  describe('Coalescer管理', () => {
    test('同一セグメントキーの更新', (done) => {
      const segment1: SegmentInput = {
        text: 'Initial text',
        confidence: 0.8,
        isFinal: false,
        startMs: 1000,
        endMs: 2000
      };

      const segment2: SegmentInput = {
        text: 'Updated text',
        confidence: 0.9,
        isFinal: true,
        startMs: 1000,
        endMs: 2000
      };

      segmentManager.processSegment(segment1);
      
      setTimeout(() => {
        segmentManager.processSegment(segment2);
        
        setTimeout(() => {
          // 同一セグメントキーなので、最終的に2つのセグメント（interim + final）
          expect(coalescedSegments).toHaveLength(2);
          expect(coalescedSegments[1].data.text).toBe('Updated text');
          expect(coalescedSegments[1].data.isFinal).toBe(true);
          done();
        }, 100);
      }, 100);
    });

    test('メトリクス収集', () => {
      const segment1: SegmentInput = {
        text: 'First',
        confidence: 0.8,
        isFinal: true,
        startMs: 1000,
        endMs: 2000
      };

      const segment2: SegmentInput = {
        text: 'Second',
        confidence: 0.9,
        isFinal: true,
        startMs: 3000,
        endMs: 4000
      };

      segmentManager.processSegment(segment1);
      segmentManager.processSegment(segment2);

      const metrics = segmentManager.getMetrics();
      
      expect(metrics.active_coalescers).toBe(2);
      expect(metrics.total_coalescers_created).toBe(2);
      expect(metrics.aggregated_metrics.total_segments).toBe(2);
    });
  });

  describe('強制エミット機能', () => {
    test('forceEmitAllで全セグメントをエミット', () => {
      const segment1: SegmentInput = {
        text: 'Pending segment 1',
        confidence: 0.8,
        isFinal: false,
        startMs: 1000,
        endMs: 2000
      };

      const segment2: SegmentInput = {
        text: 'Pending segment 2',
        confidence: 0.8,
        isFinal: false,
        startMs: 3000,
        endMs: 4000
      };

      segmentManager.processSegment(segment1);
      segmentManager.processSegment(segment2);

      // 強制エミット
      segmentManager.forceEmitAll();

      expect(coalescedSegments).toHaveLength(2);
      expect(coalescedSegments[0].data.text).toBe('Pending segment 1');
      expect(coalescedSegments[1].data.text).toBe('Pending segment 2');
    });
  });

  describe('リセット機能', () => {
    test('resetAllで全Coalescerをリセット', (done) => {
      const segmentInput: SegmentInput = {
        text: 'Before reset',
        confidence: 0.8,
        isFinal: false,
        startMs: 1000,
        endMs: 2000
      };

      segmentManager.processSegment(segmentInput);
      segmentManager.resetAll();

      // リセット後は新しいセグメントが来ても前の状態は影響しない
      setTimeout(() => {
        const metrics = segmentManager.getMetrics();
        expect(metrics.active_coalescers).toBe(0); // リセットされた
        done();
      }, 100);
    });
  });

  describe('自動クリーンアップ', () => {
    test('非アクティブなCoalescerの自動削除', (done) => {
      const segmentInput: SegmentInput = {
        text: 'Will be cleaned up',
        confidence: 0.8,
        isFinal: true,
        startMs: 1000,
        endMs: 2000
      };

      segmentManager.processSegment(segmentInput);

      // 初期状態では1つのCoalescerが存在
      expect(segmentManager.getMetrics().active_coalescers).toBe(1);

      // クリーンアップ時間を待つ
      setTimeout(() => {
        const metrics = segmentManager.getMetrics();
        expect(metrics.total_coalescers_destroyed).toBeGreaterThan(0);
        done();
      }, 1200); // cleanupIntervalMs + maxInactiveMs より長く待つ
    });
  });

  describe('エラーハンドリング', () => {
    test('不正なセグメントデータでもクラッシュしない', () => {
      const invalidSegment = {
        text: '',
        confidence: -1,
        isFinal: false
      } as SegmentInput;

      expect(() => {
        segmentManager.processSegment(invalidSegment);
      }).not.toThrow();
    });

    test('大量のセグメント処理でもメモリリークしない', () => {
      const initialMetrics = segmentManager.getMetrics();

      // 大量のセグメントを処理
      for (let i = 0; i < 1000; i++) {
        const segment: SegmentInput = {
          text: `Segment ${i}`,
          confidence: 0.8,
          isFinal: true,
          startMs: i * 1000,
          endMs: (i + 1) * 1000
        };
        segmentManager.processSegment(segment);
      }

      const finalMetrics = segmentManager.getMetrics();
      
      // 大量のCoalescerが作成されていることを確認
      expect(finalMetrics.total_coalescers_created).toBe(1000);
      expect(finalMetrics.active_coalescers).toBe(1000);
    });
  });

  describe('翻訳付きセグメント', () => {
    test('翻訳付きセグメントの処理', (done) => {
      const segmentInput: SegmentInput = {
        text: 'Hello world',
        translation: 'こんにちは世界',
        confidence: 0.9,
        isFinal: true,
        startMs: 1000,
        endMs: 2000
      };

      segmentManager.processSegment(segmentInput);

      setTimeout(() => {
        expect(coalescedSegments).toHaveLength(1);
        expect(coalescedSegments[0].data.text).toBe('Hello world');
        expect(coalescedSegments[0].data.translation).toBe('こんにちは世界');
        done();
      }, 100);
    });
  });

  describe('メタデータ処理', () => {
    test('メタデータが正しく保持される', (done) => {
      const segmentInput: SegmentInput = {
        text: 'With metadata',
        confidence: 0.9,
        isFinal: true,
        startMs: 1000,
        endMs: 2000,
        metadata: {
          speaker: 'user1',
          language: 'en'
        }
      };

      segmentManager.processSegment(segmentInput);

      setTimeout(() => {
        expect(coalescedSegments).toHaveLength(1);
        expect(coalescedSegments[0].data.metadata).toEqual({
          speaker: 'user1',
          language: 'en',
          startMs: 1000,
          endMs: 2000
        });
        done();
      }, 100);
    });
  });
});