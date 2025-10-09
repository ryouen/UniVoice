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
  sourceText: string;      // original → source に統一
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
  priority?: 'high' | 'normal' | 'low';
  kind?: 'realtime' | 'history' | 'paragraph';
  attempts?: number;
}

export interface TranslationQueueOptions {
  maxConcurrency: number;
  maxQueueSize?: number;
  requestTimeoutMs?: number;
  maxRetries?: number;
}

export interface QueueStatus {
  activeCount: number;
  queuedCount: number;
  completedCount: number;
  errorCount: number;
  averageProcessingTimeMs: number;
}

type TranslationHandler = (translation: QueuedTranslation) => Promise<string>;

export class TranslationQueueManager {
  private readonly maxConcurrency: number;
  private readonly maxQueueSize: number;
  private readonly requestTimeoutMs: number;
  private readonly maxRetries: number;
  
  private queue: QueuedTranslation[] = [];
  private activeTranslations = new Map<string, QueuedTranslation>();
  private translationHandler: TranslationHandler | null = null;
  private translationErrorHandler: ((translation: QueuedTranslation, error: unknown) => void) | null = null;
  
  // Statistics
  private completedCount = 0;
  private errorCount = 0;
  private totalProcessingTime = 0;
  
  constructor(options: TranslationQueueOptions) {
    this.maxConcurrency = options.maxConcurrency;
    this.maxQueueSize = options.maxQueueSize || 100;
    this.requestTimeoutMs = options.requestTimeoutMs || 30000; // 30秒
    this.maxRetries = options.maxRetries ?? 1;
  }
  
  /**
   * 翻訳ハンドラーを設定
   */
  setTranslationHandler(handler: TranslationHandler): void {
    this.translationHandler = handler;
  }

  setErrorHandler(handler: (translation: QueuedTranslation, error: unknown) => void): void {
    this.translationErrorHandler = handler;
  }
  
  /**
   * 翻訳をキューに追加
   */
  async enqueue(translation: QueuedTranslation): Promise<void> {
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
    
    const queueItem: QueuedTranslation = { ...translation, attempts: translation.attempts ?? 0 };

    // �D��x�Ɋ�Â��ăL���[�ɑ}��
    if (queueItem.priority === 'high') {
      // ���D��x�͐擪��
      this.queue.unshift(queueItem);
    } else if (queueItem.priority === 'low') {
      // ��D��x�͍Ō����
      this.queue.push(queueItem);
    } else {
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
  private async processNext(): Promise<void> {
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
      await this.executeWithTimeout(
        this.translationHandler(translation),
        this.requestTimeoutMs
      );
      
      // 統計更新
      const processingTime = Date.now() - startTime;
      this.completedCount++;
      this.totalProcessingTime += processingTime;
      
      console.log(`[TranslationQueueManager] Completed: ${translation.segmentId} in ${processingTime}ms`);
      
    } catch (error) {
      console.error(`[TranslationQueueManager] Error processing ${translation.segmentId}:`, error);
      this.errorCount++;

      if (attempts < this.maxRetries) {
        const nextAttempt = attempts + 1;
        console.warn(`[TranslationQueueManager] Retrying ${translation.segmentId}: attempt ${nextAttempt}/${this.maxRetries + 1}`);
        const retryItem: QueuedTranslation = { ...translation, attempts: nextAttempt };
        this.queue.unshift(retryItem);
      } else if (this.translationErrorHandler) {
        try {
          this.translationErrorHandler(translation, error);
        } catch (handlerError) {
          console.error('[TranslationQueueManager] Translation error handler failed:', handlerError);
        }
      }
    } finally {
      // アクティブから削除
      this.activeTranslations.delete(translation.segmentId);
      
      // 次の処理を開始
      setImmediate(() => this.processNext());
    }
  }
  
  /**
   * タイムアウト付き実行
   */
  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Translation timeout')), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }
  
  /**
   * キューの状態を取得
   */
  getStatus(): QueueStatus {
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
  getSegmentStatus(segmentId: string): 'active' | 'queued' | 'not-found' {
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
  clear(): void {
    this.queue = [];
    console.log('[TranslationQueueManager] Queue cleared');
  }
  
  /**
   * 統計をリセット
   */
  resetStats(): void {
    this.completedCount = 0;
    this.errorCount = 0;
    this.totalProcessingTime = 0;
  }
  
  /**
   * リソースクリーンアップ
   */
  destroy(): void {
    this.clear();
    this.activeTranslations.clear();
    this.translationHandler = null;
    console.log('[TranslationQueueManager] Destroyed');
  }
}
