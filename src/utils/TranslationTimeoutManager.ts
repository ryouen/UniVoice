/**
 * TranslationTimeoutManager - 翻訳タイムアウト管理
 * 
 * 責任:
 * - 翻訳リクエストのタイムアウト管理
 * - タイムアウト時のコールバック実行
 * - 遅延翻訳の受け入れ判定
 * 
 * 設計原則:
 * - シンプルで予測可能な動作
 * - メモリリークの防止
 * - テスタブルな実装
 * 
 * @author Claude Code
 * @date 2025-08-24
 */

export interface TimeoutConfig {
  /** デフォルトタイムアウト時間（ミリ秒） */
  defaultTimeout: number;
  /** 文字数に基づく動的調整を有効化 */
  enableDynamicTimeout: boolean;
  /** 最大タイムアウト時間（ミリ秒） */
  maxTimeout: number;
  /** 遅延翻訳を受け入れる最大時間（ミリ秒） */
  maxLateAcceptanceTime: number;
}

export interface TimeoutEntry {
  /** セグメントID */
  segmentId: string;
  /** タイムアウトタイマーID */
  timeoutId: NodeJS.Timeout;
  /** 開始時刻 */
  startTime: number;
  /** タイムアウト時刻 */
  timeoutAt: number;
  /** 原文テキスト（ログ用） */
  originalText: string;
}

export class TranslationTimeoutManager {
  private timeouts = new Map<string, TimeoutEntry>();
  private config: TimeoutConfig;
  
  constructor(config?: Partial<TimeoutConfig>) {
    this.config = {
      defaultTimeout: 7000, // 7秒
      enableDynamicTimeout: true,
      maxTimeout: 10000, // 10秒
      maxLateAcceptanceTime: 30000, // 30秒
      ...config
    };
  }
  
  /**
   * タイムアウトを開始
   * @param segmentId セグメントID
   * @param originalText 原文（タイムアウト計算用）
   * @param onTimeout タイムアウト時のコールバック
   * @returns タイムアウト時間（ミリ秒）
   */
  startTimeout(
    segmentId: string,
    originalText: string,
    onTimeout: (segmentId: string) => void
  ): number {
    // 既存のタイムアウトがあればクリア
    this.clearTimeout(segmentId);
    
    const timeoutDuration = this.calculateTimeout(originalText);
    const startTime = Date.now();
    
    const timeoutId = setTimeout(() => {
      console.log(`[TranslationTimeout] Timeout for segment ${segmentId} after ${timeoutDuration}ms`);
      
      // タイムアウトエントリを削除
      this.timeouts.delete(segmentId);
      
      // コールバック実行
      onTimeout(segmentId);
    }, timeoutDuration);
    
    // エントリを保存
    const entry: TimeoutEntry = {
      segmentId,
      timeoutId,
      startTime,
      timeoutAt: startTime + timeoutDuration,
      originalText
    };
    
    this.timeouts.set(segmentId, entry);
    
    console.log(`[TranslationTimeout] Started timeout for segment ${segmentId}: ${timeoutDuration}ms`);
    
    return timeoutDuration;
  }
  
  /**
   * タイムアウトをクリア（翻訳完了時）
   * @param segmentId セグメントID
   * @returns クリアされた場合true
   */
  clearTimeout(segmentId: string): boolean {
    const entry = this.timeouts.get(segmentId);
    if (!entry) {
      return false;
    }
    
    clearTimeout(entry.timeoutId);
    this.timeouts.delete(segmentId);
    
    const elapsed = Date.now() - entry.startTime;
    console.log(`[TranslationTimeout] Cleared timeout for segment ${segmentId} after ${elapsed}ms`);
    
    return true;
  }
  
  /**
   * 遅延翻訳を受け入れるべきか判定
   * @param segmentId セグメントID
   * @returns 受け入れ可能な場合true
   */
  shouldAcceptLateTranslation(segmentId: string): boolean {
    // アクティブなタイムアウトがある場合は受け入れる
    if (this.timeouts.has(segmentId)) {
      return true;
    }
    
    // タイムアウト済みでも、maxLateAcceptanceTime以内なら受け入れる
    // （この実装では履歴を持たないため、常にfalse）
    return false;
  }
  
  /**
   * 文字数に基づいてタイムアウト時間を計算
   * @param text テキスト
   * @returns タイムアウト時間（ミリ秒）
   */
  private calculateTimeout(text: string): number {
    if (!this.config.enableDynamicTimeout) {
      return this.config.defaultTimeout;
    }
    
    // 基本時間
    let timeout = this.config.defaultTimeout;
    
    // 文字数による調整（100文字ごとに500ms追加）
    const charCount = text.length;
    const additionalTime = Math.floor(charCount / 100) * 500;
    
    timeout += additionalTime;
    
    // 最大値でクリップ
    return Math.min(timeout, this.config.maxTimeout);
  }
  
  /**
   * アクティブなタイムアウトの数を取得
   */
  getActiveTimeoutCount(): number {
    return this.timeouts.size;
  }
  
  /**
   * アクティブなタイムアウトの情報を取得（デバッグ用）
   */
  getActiveTimeouts(): Array<{
    segmentId: string;
    elapsedMs: number;
    remainingMs: number;
    originalText: string;
  }> {
    const now = Date.now();
    return Array.from(this.timeouts.values()).map(entry => ({
      segmentId: entry.segmentId,
      elapsedMs: now - entry.startTime,
      remainingMs: Math.max(0, entry.timeoutAt - now),
      originalText: entry.originalText.substring(0, 50) + '...'
    }));
  }
  
  /**
   * すべてのタイムアウトをクリア
   */
  clearAll(): void {
    for (const entry of this.timeouts.values()) {
      clearTimeout(entry.timeoutId);
    }
    this.timeouts.clear();
    console.log('[TranslationTimeout] Cleared all timeouts');
  }
  
  /**
   * リソースのクリーンアップ
   */
  destroy(): void {
    this.clearAll();
  }
}