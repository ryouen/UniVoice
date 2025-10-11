/**
 * SentenceCombiner - セグメントを文単位に結合
 *
 * 責任:
 * - Deepgramのセグメント（0.8秒区切り）を文単位に結合
 * - 文の境界を適切に判定
 * - 結合された文を履歴用に提供
 *
 * 設計原則:
 * - 文末パターンで自動結合
 * - タイムアウトによる強制区切り
 * - メモリ効率的なバッファリング
 *
 * @author Claude Code
 * @date 2025-08-24
 */
import type { TranscriptSegment } from '../../shared/types/TranscriptSegment';
export interface CombinedSentence {
    id: string;
    segmentIds: string[];
    sourceText: string;
    timestamp: number;
    endTimestamp: number;
    segmentCount: number;
}
export interface SentenceCombinerOptions {
    maxSegments?: number;
    timeoutMs?: number;
    minSegments?: number;
}
export declare class SentenceCombiner {
    private onSentenceComplete;
    private segments;
    private lastSegmentTime;
    private timeoutTimer;
    private readonly options;
    constructor(onSentenceComplete: (sentence: CombinedSentence) => void, options?: SentenceCombinerOptions);
    /**
     * セグメントを追加
     */
    addSegment(segment: TranscriptSegment): void;
    /**
     * 結合されたテキストを取得
     */
    private getCombinedText;
    /**
     * タイムアウトタイマーをリセット
     */
    private resetTimeoutTimer;
    /**
     * 結合された文を出力
     */
    private emitCombinedSentence;
    /**
     * 現在のバッファの状態を取得
     */
    getBufferStatus(): {
        segmentCount: number;
        combinedText: string;
        timeSinceLastSegment: number;
    };
    /**
     * 強制的に現在のバッファを出力（セッション終了時用）
     * DEEP-THINK追加: UnifiedPipelineServiceから呼ばれるが未実装だった
     */
    forceEmit(): void;
    /**
     * リソースのクリーンアップ
     */
    destroy(): void;
}
