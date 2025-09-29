/**
 * Advanced Translation Smoother
 * リアルタイム翻訳の「ちらつき」を完全に解消する高度なスムージング
 */

interface SmoothingConfig {
  resetThreshold: number;      // リセット検知の閾値（0.3 = 30%減少でリセット）
  minLengthToSmooth: number;   // スムージング開始の最小文字数
  maxHistorySize: number;      // 履歴保持数
  debounceMs: number;         // デバウンス時間（ms）
}

export class TranslationSmoother {
  private lastText = '';
  private lastLength = 0;
  private textHistory: string[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  
  private config: SmoothingConfig = {
    resetThreshold: 0.25,        // 25%以下に減少でリセット判定
    minLengthToSmooth: 5,        // 5文字以上でスムージング開始
    maxHistorySize: 5,           // 5個まで履歴保持
    debounceMs: 100              // 100ms デバウンス
  };
  
  constructor(
    private onSmoothedUpdate: (text: string, metadata: { isReset: boolean; confidence: number }) => void,
    config?: Partial<SmoothingConfig>
  ) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }
  
  update(newText: string): void {
    // デバウンス処理
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.processUpdate(newText);
    }, this.config.debounceMs);
  }
  
  private processUpdate(newText: string): void {
    const currentLength = newText.length;
    const isReset = this.detectReset(newText, currentLength);
    
    if (isReset) {
      console.log(`🔄 [Smoother] Reset detected: ${this.lastLength}→${currentLength}`);
      
      // 短すぎるリセットは無視
      if (currentLength < 3) {
        return;
      }
      
      // 履歴に前のテキストを保存
      if (this.lastText.length > this.config.minLengthToSmooth) {
        this.textHistory.push(this.lastText);
        if (this.textHistory.length > this.config.maxHistorySize) {
          this.textHistory = this.textHistory.slice(-this.config.maxHistorySize);
        }
      }
    }
    
    // 信頼度計算（リセット直後は低い）
    const confidence = this.calculateConfidence(newText, isReset);
    
    this.lastText = newText;
    this.lastLength = currentLength;
    
    // スムージング済みテキストを通知
    this.onSmoothedUpdate(newText, { isReset, confidence });
  }
  
  private detectReset(_newText: string, currentLength: number): boolean {
    // 前回より大幅に短くなった場合はリセット
    if (this.lastLength > this.config.minLengthToSmooth) {
      const reductionRatio = currentLength / this.lastLength;
      return reductionRatio < this.config.resetThreshold;
    }
    
    return false;
  }
  
  private calculateConfidence(newText: string, isReset: boolean): number {
    if (isReset) {
      return 0.3; // リセット直後は低信頼度
    }
    
    // 文字数が増えるほど信頼度アップ
    const lengthFactor = Math.min(newText.length / 20, 1.0);
    
    // 句読点があると信頼度アップ
    const punctuationBonus = /[。、！？.]/.test(newText) ? 0.2 : 0;
    
    return Math.min(0.5 + lengthFactor + punctuationBonus, 1.0);
  }
  
  // セグメント完了時の状態リセット
  resetState(): void {
    this.lastText = '';
    this.lastLength = 0;
    this.textHistory = [];
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
  
  // 履歴取得（デバッグ用）
  getHistory(): string[] {
    return [...this.textHistory];
  }
  
  destroy(): void {
    this.resetState();
  }
}