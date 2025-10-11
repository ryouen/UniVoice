"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentenceCombiner = void 0;
class SentenceCombiner {
    constructor(onSentenceComplete, options = {}) {
        this.onSentenceComplete = onSentenceComplete;
        this.segments = [];
        this.lastSegmentTime = 0;
        this.timeoutTimer = null;
        this.options = {
            maxSegments: options.maxSegments ?? 10,
            timeoutMs: options.timeoutMs ?? 2000,
            minSegments: options.minSegments ?? 2
        };
        console.log('[SentenceCombiner] Initialized with options:', this.options);
    }
    /**
     * セグメントを追加
     */
    addSegment(segment) {
        // Finalでないセグメントはスキップ（既にリアルタイム表示で処理済み）
        if (!segment.isFinal) {
            return;
        }
        console.log('[SentenceCombiner] Adding final segment:', {
            id: segment.id,
            text: segment.text.substring(0, 50) + '...',
            currentBufferSize: this.segments.length
        });
        this.segments.push(segment);
        this.lastSegmentTime = Date.now();
        // タイムアウトタイマーをリセット
        this.resetTimeoutTimer();
        // 保存を優先：各finalセグメントを即座に出力
        // DEEP-THINK: 文末判定を待たずに保存することで、データ損失を防ぐ
        this.emitCombinedSentence();
    }
    /**
     * 結合されたテキストを取得
     */
    getCombinedText() {
        return this.segments
            .map(s => s.text.trim())
            .filter(text => text.length > 0)
            .join(' ');
    }
    // 文が完成したかチェック - 現在は即座に保存するため未使用
    // private isSentenceComplete(text: string): boolean {
    //   // 空文字列は未完成
    //   if (!text || text.trim().length === 0) {
    //     return false;
    //   }
    //   
    //   // 明らかに未完成のパターンがあれば false
    //   if (this.incompleteSentencePatterns.some(pattern => pattern.test(text))) {
    //     return false;
    //   }
    //   
    //   // 文末パターンに一致すれば完成
    //   return this.sentenceEndPatterns.some(pattern => pattern.test(text));
    // }
    // 確実に文末かチェック - 現在は即座に保存するため未使用
    // private isDefinitelySentenceEnd(text: string): boolean {
    //   // 疑問文、感嘆文、通常の文末（ピリオド・句点）は短くても文として成立
    //   // DEEP-THINK改善: ピリオドと句点を追加
    //   return /[？！?!。\.]\s*$/.test(text);
    // }
    /**
     * タイムアウトタイマーをリセット
     */
    resetTimeoutTimer() {
        if (this.timeoutTimer) {
            clearTimeout(this.timeoutTimer);
        }
        this.timeoutTimer = setTimeout(() => {
            if (this.segments.length > 0) {
                console.log('[SentenceCombiner] Timeout reached, emitting combined sentence');
                this.emitCombinedSentence();
            }
        }, this.options.timeoutMs);
    }
    /**
     * 結合された文を出力
     */
    emitCombinedSentence() {
        if (this.segments.length === 0) {
            return;
        }
        const combinedText = this.getCombinedText();
        if (!combinedText) {
            this.segments = [];
            return;
        }
        const combinedSentence = {
            id: `combined_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            segmentIds: this.segments.map(s => s.id),
            sourceText: combinedText,
            timestamp: this.segments[0].timestamp,
            endTimestamp: this.segments[this.segments.length - 1].timestamp,
            segmentCount: this.segments.length
        };
        console.log(`[SentenceCombiner] Emitting combined sentence: ${combinedSentence.segmentCount} segments`);
        // 【Phase 0-1】データフロー可視化ログ追加
        console.log('[DataFlow-4] Combined sentence created:', {
            combinedId: combinedSentence.id,
            segmentIds: combinedSentence.segmentIds,
            textLength: combinedSentence.sourceText.length,
            timestamp: Date.now()
        });
        // コールバックを呼び出し
        this.onSentenceComplete(combinedSentence);
        // バッファをクリア
        this.segments = [];
        // タイマーをクリア
        if (this.timeoutTimer) {
            clearTimeout(this.timeoutTimer);
            this.timeoutTimer = null;
        }
    }
    /**
     * 現在のバッファの状態を取得
     */
    getBufferStatus() {
        return {
            segmentCount: this.segments.length,
            combinedText: this.getCombinedText(),
            timeSinceLastSegment: this.lastSegmentTime ? Date.now() - this.lastSegmentTime : 0
        };
    }
    /**
     * 強制的に現在のバッファを出力（セッション終了時用）
     * DEEP-THINK追加: UnifiedPipelineServiceから呼ばれるが未実装だった
     */
    forceEmit() {
        if (this.timeoutTimer) {
            clearTimeout(this.timeoutTimer);
            this.timeoutTimer = null;
        }
        // セグメントがある場合は、条件を無視して強制的に出力
        if (this.segments.length > 0) {
            console.log('[SentenceCombiner] Force emit called with', this.segments.length, 'segments');
            this.emitCombinedSentence();
        }
    }
    /**
     * リソースのクリーンアップ
     */
    destroy() {
        if (this.timeoutTimer) {
            clearTimeout(this.timeoutTimer);
            this.timeoutTimer = null;
        }
        this.segments = [];
    }
}
exports.SentenceCombiner = SentenceCombiner;
