import { StreamCoalescer, SegmentData } from '../../electron/services/domain/StreamCoalescer';
import { SegmentManager, SegmentInput } from '../../electron/services/domain/SegmentManager';

describe('Streaming Performance Tests', () => {
  describe('StreamCoalescer Performance', () => {
    test('First Paint Time < 1000ms', (done) => {
      const startTime = performance.now();
      let firstPaintTime: number | undefined;

      const coalescer = new StreamCoalescer('perf-test', 160, 1100);
      
      coalescer.on('segment', () => {
        if (!firstPaintTime) {
          firstPaintTime = performance.now() - startTime;
        }
      });

      // 模擬ストリーミングデータ
      const chunks = [
        'Hello',
        'Hello world',
        'Hello world, how',
        'Hello world, how are',
        'Hello world, how are you?'
      ];

      let index = 0;
      const sendChunk = () => {
        if (index < chunks.length) {
          const segmentData: SegmentData = {
            text: chunks[index],
            confidence: 0.8,
            isFinal: index === chunks.length - 1
          };
          coalescer.addSegment(segmentData);
          index++;
          setTimeout(sendChunk, 50); // 50ms間隔でチャンク送信
        }
      };

      sendChunk();

      setTimeout(() => {
        expect(firstPaintTime).toBeDefined();
        expect(firstPaintTime!).toBeLessThan(1000);
        coalescer.destroy();
        done();
      }, 1500);
    });

    test('UI更新頻度削減率 > 50%', (done) => {
      let updateCount = 0;
      const coalescer = new StreamCoalescer('reduction-test', 160, 1100);
      
      coalescer.on('segment', () => {
        updateCount++;
      });

      // 100回の微小更新をシミュレート
      const totalUpdates = 100;
      for (let i = 0; i < totalUpdates; i++) {
        const segmentData: SegmentData = {
          text: `Progressive text update ${i}`,
          confidence: 0.8,
          isFinal: false
        };
        coalescer.addSegment(segmentData);
      }

      // 最後に句読点付きで終了
      const finalSegment: SegmentData = {
        text: 'Final text with punctuation.',
        confidence: 0.9,
        isFinal: true
      };
      coalescer.addSegment(finalSegment);

      setTimeout(() => {
        const reductionRate = (totalUpdates - updateCount) / totalUpdates;
        expect(reductionRate).toBeGreaterThan(0.5);
        expect(updateCount).toBeLessThan(totalUpdates / 2);
        coalescer.destroy();
        done();
      }, 2000);
    });

    test('大量セグメント処理でのメモリ効率', () => {
      const coalescer = new StreamCoalescer('memory-test', 50, 200);
      const segmentCount = 10000;
      
      const startMemory = process.memoryUsage().heapUsed;
      
      // 大量のセグメントを処理
      for (let i = 0; i < segmentCount; i++) {
        const segmentData: SegmentData = {
          text: `Memory test segment ${i}`,
          confidence: 0.8,
          isFinal: i % 100 === 99 // 100個に1つをfinalに
        };
        coalescer.addSegment(segmentData);
      }

      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = endMemory - startMemory;
      
      // メモリ増加量が500MB以下であることを確認
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024);
      
      const metrics = coalescer.getMetrics();
      expect(metrics.total_segments).toBe(segmentCount);
      expect(metrics.emitted_count).toBeGreaterThan(0);
      
      coalescer.destroy();
    });

    test('高頻度更新での安定性', (done) => {
      const coalescer = new StreamCoalescer('stability-test', 10, 100);
      let emittedCount = 0;
      let errorCount = 0;

      coalescer.on('segment', () => {
        emittedCount++;
      });

      coalescer.on('error', () => {
        errorCount++;
      });

      // 1ms間隔で1000回更新
      let updateCount = 0;
      const maxUpdates = 1000;
      
      const rapidUpdate = () => {
        if (updateCount < maxUpdates) {
          try {
            const segmentData: SegmentData = {
              text: `Rapid update ${updateCount}`,
              confidence: 0.8,
              isFinal: false
            };
            coalescer.addSegment(segmentData);
            updateCount++;
            setTimeout(rapidUpdate, 1);
          } catch (error) {
            errorCount++;
          }
        }
      };

      rapidUpdate();

      setTimeout(() => {
        expect(errorCount).toBe(0);
        expect(emittedCount).toBeGreaterThan(0);
        expect(emittedCount).toBeLessThan(maxUpdates); // 凝集により削減されている
        coalescer.destroy();
        done();
      }, 2000);
    });
  });

  describe('SegmentManager Performance', () => {
    test('複数セグメント並行処理のスループット', (done) => {
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

      const startTime = performance.now();
      const segmentCount = 1000;

      // 1000個のセグメントを並行処理
      for (let i = 0; i < segmentCount; i++) {
        const segmentInput: SegmentInput = {
          text: `Parallel segment ${i}`,
          confidence: 0.8,
          isFinal: true,
          startMs: i * 100,
          endMs: (i + 1) * 100
        };
        segmentManager.processSegment(segmentInput);
      }

      setTimeout(() => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        const throughput = processedCount / (duration / 1000); // segments per second

        expect(processedCount).toBe(segmentCount);
        expect(throughput).toBeGreaterThan(100); // 100 segments/sec以上
        expect(duration).toBeLessThan(5000); // 5秒以内で完了

        segmentManager.destroy();
        done();
      }, 1000);
    });

    test('Coalescerクリーンアップの効率性', (done) => {
      const segmentManager = new SegmentManager({
        debounceMs: 10,
        forceCommitMs: 50,
        cleanupIntervalMs: 100,
        maxInactiveMs: 200
      });

      // 大量のセグメントを作成してクリーンアップをテスト
      for (let i = 0; i < 500; i++) {
        const segmentInput: SegmentInput = {
          text: `Cleanup test ${i}`,
          confidence: 0.8,
          isFinal: true,
          startMs: i * 10,
          endMs: (i + 1) * 10
        };
        segmentManager.processSegment(segmentInput);
      }

      const initialMetrics = segmentManager.getMetrics();
      expect(initialMetrics.active_coalescers).toBe(500);

      // クリーンアップを待つ
      setTimeout(() => {
        const finalMetrics = segmentManager.getMetrics();
        
        // クリーンアップが実行されていることを確認
        expect(finalMetrics.total_coalescers_destroyed).toBeGreaterThan(0);
        expect(finalMetrics.active_coalescers).toBeLessThan(initialMetrics.active_coalescers);

        segmentManager.destroy();
        done();
      }, 1000);
    });

    test('メトリクス集計のパフォーマンス', () => {
      const segmentManager = new SegmentManager();
      
      // 大量のセグメントを処理
      for (let i = 0; i < 5000; i++) {
        const segmentInput: SegmentInput = {
          text: `Metrics test ${i}`,
          confidence: 0.8,
          isFinal: i % 10 === 9,
          startMs: i * 10,
          endMs: (i + 1) * 10
        };
        segmentManager.processSegment(segmentInput);
      }

      // メトリクス取得のパフォーマンスを測定
      const startTime = performance.now();
      const metrics = segmentManager.getMetrics();
      const endTime = performance.now();
      
      const metricsTime = endTime - startTime;
      
      // メトリクス取得が100ms以内で完了することを確認
      expect(metricsTime).toBeLessThan(100);
      expect(metrics.active_coalescers).toBe(5000);
      expect(metrics.aggregated_metrics.total_segments).toBe(5000);

      segmentManager.destroy();
    });
  });

  describe('統合パフォーマンス', () => {
    test('リアルタイムストリーミングシミュレーション', (done) => {
      const segmentManager = new SegmentManager({
        debounceMs: 160,
        forceCommitMs: 1100,
        cleanupIntervalMs: 10000,
        maxInactiveMs: 5000
      });

      let totalEmissions = 0;
      let firstEmissionTime: number | undefined;
      const startTime = performance.now();

      segmentManager.on('coalescedSegment', () => {
        totalEmissions++;
        if (!firstEmissionTime) {
          firstEmissionTime = performance.now() - startTime;
        }
      });

      // リアルタイムストリーミングをシミュレート
      const sentences = [
        'Hello',
        'Hello world',
        'Hello world, this',
        'Hello world, this is',
        'Hello world, this is a',
        'Hello world, this is a test.',
        'How',
        'How are',
        'How are you',
        'How are you today?',
        'I',
        'I am',
        'I am fine',
        'I am fine, thank',
        'I am fine, thank you.'
      ];

      let index = 0;
      const streamInterval = setInterval(() => {
        if (index < sentences.length) {
          const segmentInput: SegmentInput = {
            text: sentences[index],
            confidence: 0.8 + Math.random() * 0.2,
            isFinal: sentences[index].endsWith('.') || sentences[index].endsWith('?'),
            startMs: index * 500,
            endMs: (index + 1) * 500
          };
          segmentManager.processSegment(segmentInput);
          index++;
        } else {
          clearInterval(streamInterval);
        }
      }, 100); // 100ms間隔でストリーミング

      setTimeout(() => {
        const endTime = performance.now();
        const totalTime = endTime - startTime;

        // パフォーマンス指標の確認
        expect(firstEmissionTime).toBeDefined();
        expect(firstEmissionTime!).toBeLessThan(1000); // First Paint Time < 1s
        expect(totalEmissions).toBeGreaterThan(0);
        expect(totalEmissions).toBeLessThan(sentences.length); // UI更新削減
        expect(totalTime).toBeLessThan(5000); // 全体処理時間 < 5s

        const metrics = segmentManager.getMetrics();
        expect(metrics.aggregated_metrics.avg_hold_ms).toBeGreaterThan(0);
        expect(metrics.aggregated_metrics.suppressed_count).toBeGreaterThan(0);

        segmentManager.destroy();
        done();
      }, 3000);
    });

    test('エラー率測定', (done) => {
      const segmentManager = new SegmentManager();
      let successCount = 0;
      let errorCount = 0;

      segmentManager.on('coalescedSegment', () => {
        successCount++;
      });

      // 一部不正なデータを含むセグメントを処理
      const totalSegments = 1000;
      for (let i = 0; i < totalSegments; i++) {
        try {
          const segmentInput: SegmentInput = {
            text: i % 100 === 0 ? '' : `Test segment ${i}`, // 100個に1つは空文字
            confidence: i % 50 === 0 ? -1 : 0.8, // 50個に1つは不正な信頼度
            isFinal: i % 10 === 9,
            startMs: i * 10,
            endMs: (i + 1) * 10
          };
          segmentManager.processSegment(segmentInput);
        } catch (error) {
          errorCount++;
        }
      }

      setTimeout(() => {
        const errorRate = errorCount / totalSegments;
        
        // エラー率が1%以下であることを確認
        expect(errorRate).toBeLessThan(0.01);
        expect(successCount).toBeGreaterThan(totalSegments * 0.9);

        segmentManager.destroy();
        done();
      }, 1000);
    });
  });
});