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
        this.translationErrorHandler = null;
        // Statistics
        this.completedCount = 0;
        this.errorCount = 0;
        this.totalProcessingTime = 0;
        this.maxConcurrency = options.maxConcurrency;
        this.maxQueueSize = options.maxQueueSize || 100;
        this.requestTimeoutMs = options.requestTimeoutMs || 30000; // 30秒
        this.maxRetries = options.maxRetries ?? 1;
    }
    /**
     * 翻訳ハンドラーを設定
     */
    setTranslationHandler(handler) {
        this.translationHandler = handler;
    }
    setErrorHandler(handler) {
        this.translationErrorHandler = handler;
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
        const queueItem = { ...translation, attempts: translation.attempts ?? 0 };
        // �D��x�Ɋ�Â��ăL���[�ɑ}��
        if (queueItem.priority === 'high') {
            // ���D��x�͐擪��
            this.queue.unshift(queueItem);
        }
        else if (queueItem.priority === 'low') {
            // ��D��x�͍Ō����
            this.queue.push(queueItem);
        }
        else {
            // �ʏ�D��x�͒��ԂɁi���D��x�̌�A��D��x�̑O�j
            const highPriorityCount = this.queue.filter(t => t.priority === 'high').length;
            this.queue.splice(highPriorityCount, 0, queueItem);
        }
        console.log(`[TranslationQueueManager] Enqueued: ${queueItem.segmentId}, queue size: ${this.queue.length}`);
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
        const attempts = translation.attempts ?? 0;
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
            if (attempts < this.maxRetries) {
                const nextAttempt = attempts + 1;
                console.warn(`[TranslationQueueManager] Retrying ${translation.segmentId}: attempt ${nextAttempt}/${this.maxRetries + 1}`);
                const retryItem = { ...translation, attempts: nextAttempt };
                this.queue.unshift(retryItem);
            }
            else if (this.translationErrorHandler) {
                try {
                    this.translationErrorHandler(translation, error);
                }
                catch (handlerError) {
                    console.error('[TranslationQueueManager] Translation error handler failed:', handlerError);
                }
            }
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
