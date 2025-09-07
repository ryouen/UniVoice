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
        // 文末パターン（確実なもののみ）
        this.sentenceEndPatterns = [
            // 日本語
            /[。．]\s*$/, // 句点
            /[！？]\s*$/, // 感嘆符・疑問符
            // 英語
            /[.!?]\s*$/, // 文末記号
            /\.\)?\s*$/, // 括弧付きピリオド
            /[.!?]['"]?\s*$/, // 引用符付き文末
        ];
        // 文の途中を示すパターン
        this.incompleteSentencePatterns = [
            /[,、]\s*$/, // カンマ
            /\s+(and|or|but)\s*$/i, // 接続詞
            /\s+(は|が|を|に|で|と|の)\s*$/, // 日本語助詞
        ];
        this.options = {
            maxSegments: options.maxSegments || 10,
            timeoutMs: options.timeoutMs || 2000,
            minSegments: options.minSegments || 2
        };
    }
    /**
     * セグメントを追加
     */
    addSegment(segment) {
        // Finalでないセグメントはスキップ（既にリアルタイム表示で処理済み）
        if (!segment.isFinal) {
            return;
        }
        this.segments.push(segment);
        this.lastSegmentTime = Date.now();
        // タイムアウトタイマーをリセット
        this.resetTimeoutTimer();
        // 結合された文字列を生成
        const combinedText = this.getCombinedText();
        // 文が完成したかチェック
        if (this.isSentenceComplete(combinedText)) {
            // 最小セグメント数をチェック（断片的すぎる場合は待つ）
            if (this.segments.length >= this.options.minSegments ||
                this.isDefinitelySentenceEnd(combinedText)) {
                this.emitCombinedSentence();
            }
        }
        else if (this.segments.length >= this.options.maxSegments) {
            // 最大セグメント数に達したら強制的に出力
            this.emitCombinedSentence();
        }
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
    /**
     * 文が完成したかチェック
     */
    isSentenceComplete(text) {
        // 空文字列は未完成
        if (!text || text.trim().length === 0) {
            return false;
        }
        // 明らかに未完成のパターンがあれば false
        if (this.incompleteSentencePatterns.some(pattern => pattern.test(text))) {
            return false;
        }
        // 文末パターンに一致すれば完成
        return this.sentenceEndPatterns.some(pattern => pattern.test(text));
    }
    /**
     * 確実に文末かチェック（短くても出力する場合）
     */
    isDefinitelySentenceEnd(text) {
        // 疑問文、感嘆文、通常の文末（ピリオド・句点）は短くても文として成立
        // DEEP-THINK改善: ピリオドと句点を追加
        return /[？！?!。\.]\s*$/.test(text);
    }
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
            originalText: combinedText,
            timestamp: this.segments[0].timestamp,
            endTimestamp: this.segments[this.segments.length - 1].timestamp,
            segmentCount: this.segments.length
        };
        console.log(`[SentenceCombiner] Emitting combined sentence: ${combinedSentence.segmentCount} segments`);
        // 【Phase 0-1】データフロー可視化ログ追加
        console.log('[DataFlow-4] Combined sentence created:', {
            combinedId: combinedSentence.id,
            segmentIds: combinedSentence.segmentIds,
            textLength: combinedSentence.originalText.length,
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
