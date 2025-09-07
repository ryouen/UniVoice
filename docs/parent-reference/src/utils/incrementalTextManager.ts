/**
 * Incremental Text Manager
 * 差分管理で安定した文字列更新を実現
 */

interface TextSegment {
  id: string;
  text: string;
  isConfirmed: boolean;
  timestamp: number;
}

export class IncrementalTextManager {
  private confirmedText = '';
  private pendingSegment: TextSegment | null = null;
  private lastUpdateTime = 0;
  private confirmTimeout: NodeJS.Timeout | null = null;
  
  constructor(
    private onUpdate: (text: string, isStable: boolean) => void,
    private confirmDelay = 1000 // 1秒間更新がなければ確定
  ) {}
  
  /**
   * 新しいテキストを更新
   * 増分のみを検出して追加
   */
  update(newText: string): void {
    const now = Date.now();
    
    // 確定済みテキストより短い場合はリセット（新しいセグメント）
    if (newText.length < this.confirmedText.length) {
      // 前のセグメントを確定
      this.confirmCurrentSegment();
      
      // 新しいセグメントとして処理
      this.pendingSegment = {
        id: `seg_${now}`,
        text: newText,
        isConfirmed: false,
        timestamp: now
      };
    } else if (newText.startsWith(this.confirmedText)) {
      // 確定済みテキストの続き
      const increment = newText.substring(this.confirmedText.length);
      
      if (this.pendingSegment) {
        // 既存のpendingに追加
        this.pendingSegment.text = newText;
        this.pendingSegment.timestamp = now;
      } else {
        // 新しいpendingセグメント
        this.pendingSegment = {
          id: `seg_${now}`,
          text: newText,
          isConfirmed: false,
          timestamp: now
        };
      }
    } else {
      // 予期しない変更（全体が変わった）
      console.warn('[IncrementalTextManager] Unexpected text change detected');
      this.reset();
      this.pendingSegment = {
        id: `seg_${now}`,
        text: newText,
        isConfirmed: false,
        timestamp: now
      };
    }
    
    // タイムアウトをリセット
    if (this.confirmTimeout) {
      clearTimeout(this.confirmTimeout);
    }
    
    // 新しいタイムアウトを設定
    this.confirmTimeout = setTimeout(() => {
      this.confirmCurrentSegment();
    }, this.confirmDelay);
    
    // 現在の完全なテキストを通知
    const currentText = this.pendingSegment ? this.pendingSegment.text : this.confirmedText;
    const isStable = !this.pendingSegment;
    this.onUpdate(currentText, isStable);
    
    this.lastUpdateTime = now;
  }
  
  /**
   * 現在のセグメントを確定
   */
  confirmCurrentSegment(): void {
    if (this.pendingSegment) {
      this.confirmedText = this.pendingSegment.text;
      this.pendingSegment = null;
      
      // 確定したことを通知
      this.onUpdate(this.confirmedText, true);
    }
    
    if (this.confirmTimeout) {
      clearTimeout(this.confirmTimeout);
      this.confirmTimeout = null;
    }
  }
  
  /**
   * セグメント終了（最終結果受信時）
   */
  finalize(finalText?: string): void {
    if (finalText) {
      this.confirmedText = finalText;
      this.pendingSegment = null;
    } else {
      this.confirmCurrentSegment();
    }
    
    this.onUpdate(this.confirmedText, true);
  }
  
  /**
   * 状態をリセット
   */
  reset(): void {
    this.confirmedText = '';
    this.pendingSegment = null;
    this.lastUpdateTime = 0;
    
    if (this.confirmTimeout) {
      clearTimeout(this.confirmTimeout);
      this.confirmTimeout = null;
    }
  }
  
  /**
   * 現在の確定済みテキストを取得
   */
  getConfirmedText(): string {
    return this.confirmedText;
  }
  
  /**
   * 現在の完全なテキストを取得（確定済み＋pending）
   */
  getCurrentText(): string {
    return this.pendingSegment ? this.pendingSegment.text : this.confirmedText;
  }
  
  destroy(): void {
    if (this.confirmTimeout) {
      clearTimeout(this.confirmTimeout);
      this.confirmTimeout = null;
    }
  }
}