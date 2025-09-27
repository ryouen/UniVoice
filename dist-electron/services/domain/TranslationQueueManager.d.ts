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
export interface QueuedTranslation {
    segmentId: string;
    sourceText: string;
    sourceLanguage: string;
    targetLanguage: string;
    timestamp: number;
    priority?: 'high' | 'normal' | 'low';
}
export interface TranslationQueueOptions {
    maxConcurrency: number;
    maxQueueSize?: number;
    requestTimeoutMs?: number;
}
export interface QueueStatus {
    activeCount: number;
    queuedCount: number;
    completedCount: number;
    errorCount: number;
    averageProcessingTimeMs: number;
}
type TranslationHandler = (translation: QueuedTranslation) => Promise<string>;
export declare class TranslationQueueManager {
    private readonly maxConcurrency;
    private readonly maxQueueSize;
    private readonly requestTimeoutMs;
    private queue;
    private activeTranslations;
    private translationHandler;
    private completedCount;
    private errorCount;
    private totalProcessingTime;
    constructor(options: TranslationQueueOptions);
    /**
     * 翻訳ハンドラーを設定
     */
    setTranslationHandler(handler: TranslationHandler): void;
    /**
     * 翻訳をキューに追加
     */
    enqueue(translation: QueuedTranslation): Promise<void>;
    /**
     * 次の翻訳を処理
     */
    private processNext;
    /**
     * タイムアウト付き実行
     */
    private executeWithTimeout;
    /**
     * キューの状態を取得
     */
    getStatus(): QueueStatus;
    /**
     * 特定のセグメントの状態を確認
     */
    getSegmentStatus(segmentId: string): 'active' | 'queued' | 'not-found';
    /**
     * キューをクリア
     */
    clear(): void;
    /**
     * 統計をリセット
     */
    resetStats(): void;
    /**
     * リソースクリーンアップ
     */
    destroy(): void;
}
export {};
