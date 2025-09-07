"use strict";
/**
 * TranslationQueueManager - 翻訳並列処理制限管理
 *
 * 責任:
 * - 翻訳リクエストのキューイング
 * - 並列実行数の制限（デフォルト3）
 * - FIFO順序での処理
 * - API制限エラーの回避
 *
 * 設計原則:
 * - 最大3つの翻訳を同時実行
 * - 待機中のリクエストはキューに保持
 * - 翻訳完了時に次のリクエストを自動開始
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationQueueManager = void 0;
class TranslationQueueManager {
    constructor(options) {
        this.queue = [];
        this.activeTranslations = new Map();
        this.translationHandler = null;
        // Statistics
        this.completedCount = 0;
        this.errorCount = 0;
        this.totalProcessingTime = 0;
        this.maxConcurrency = options.maxConcurrency;
        this.maxQueueSize = options.maxQueueSize || 100;
        this.requestTimeoutMs = options.requestTimeoutMs || 30000; // 30秒
    }
    /**
     * 翻訳ハンドラーを設定
     */
    setTranslationHandler(handler) {
        this.translationHandler = handler;
    }
    /**
     * 翻訳をキューに追加
     */
    async enqueue(translation) {
        // キューサイズチェック
        if (this.queue.length >= this.maxQueueSize) {
            throw new Error(`Queue is full (max: ${this.maxQueueSize})`);
        }
        // 重複チェック
        const isDuplicate = this.queue.some(t => t.segmentId === translation.segmentId) ||
            this.activeTranslations.has(translation.segmentId);
        if (isDuplicate) {
            console.warn('[TranslationQueueManager] Duplicate translation request:', translation.segmentId);
            return;
        }
        // 優先度に基づいてキューに挿入
        if (translation.priority === 'high') {
            // 高優先度は先頭に
            this.queue.unshift(translation);
        }
        else if (translation.priority === 'low') {
            // 低優先度は最後尾に
            this.queue.push(translation);
        }
        else {
            // 通常優先度は中間に（高優先度の後、低優先度の前）
            const highPriorityCount = this.queue.filter(t => t.priority === 'high').length;
            this.queue.splice(highPriorityCount, 0, translation);
        }
        console.log(`[TranslationQueueManager] Enqueued: ${translation.segmentId}, queue size: ${this.queue.length}`);
        // 処理を試行
        await this.processNext();
    }
    /**
     * 次の翻訳を処理
     */
    async processNext() {
        // 並列数制限チェック
        if (this.activeTranslations.size >= this.maxConcurrency) {
            console.log(`[TranslationQueueManager] Max concurrency reached (${this.maxConcurrency})`);
            return;
        }
        // キューから取り出し
        const translation = this.queue.shift();
        if (!translation) {
            return;
        }
        // アクティブに追加
        this.activeTranslations.set(translation.segmentId, translation);
        const startTime = Date.now();
        console.log(`[TranslationQueueManager] Processing: ${translation.segmentId}, active: ${this.activeTranslations.size}`);
        try {
            if (!this.translationHandler) {
                throw new Error('Translation handler not set');
            }
            // タイムアウト付きで翻訳実行
            await this.executeWithTimeout(this.translationHandler(translation), this.requestTimeoutMs);
            // 統計更新
            const processingTime = Date.now() - startTime;
            this.completedCount++;
            this.totalProcessingTime += processingTime;
            console.log(`[TranslationQueueManager] Completed: ${translation.segmentId} in ${processingTime}ms`);
        }
        catch (error) {
            console.error(`[TranslationQueueManager] Error processing ${translation.segmentId}:`, error);
            this.errorCount++;
            // エラー時の再試行ロジック（将来実装）
            // TODO: 指数バックオフでの再試行
        }
        finally {
            // アクティブから削除
            this.activeTranslations.delete(translation.segmentId);
            // 次の処理を開始
            setImmediate(() => this.processNext());
        }
    }
    /**
     * タイムアウト付き実行
     */
    async executeWithTimeout(promise, timeoutMs) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Translation timeout')), timeoutMs);
        });
        return Promise.race([promise, timeoutPromise]);
    }
    /**
     * キューの状態を取得
     */
    getStatus() {
        const averageProcessingTimeMs = this.completedCount > 0
            ? this.totalProcessingTime / this.completedCount
            : 0;
        return {
            activeCount: this.activeTranslations.size,
            queuedCount: this.queue.length,
            completedCount: this.completedCount,
            errorCount: this.errorCount,
            averageProcessingTimeMs
        };
    }
    /**
     * 特定のセグメントの状態を確認
     */
    getSegmentStatus(segmentId) {
        if (this.activeTranslations.has(segmentId)) {
            return 'active';
        }
        if (this.queue.some(t => t.segmentId === segmentId)) {
            return 'queued';
        }
        return 'not-found';
    }
    /**
     * キューをクリア
     */
    clear() {
        this.queue = [];
        console.log('[TranslationQueueManager] Queue cleared');
    }
    /**
     * 統計をリセット
     */
    resetStats() {
        this.completedCount = 0;
        this.errorCount = 0;
        this.totalProcessingTime = 0;
    }
    /**
     * リソースクリーンアップ
     */
    destroy() {
        this.clear();
        this.activeTranslations.clear();
        this.translationHandler = null;
        console.log('[TranslationQueueManager] Destroyed');
    }
}
exports.TranslationQueueManager = TranslationQueueManager;
