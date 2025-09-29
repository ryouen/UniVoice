/**
 * Translation Throttler - リアルタイム翻訳更新の最適化
 * 過剰な更新を制限して視認性を向上
 */

export class TranslationThrottler {
  private lastUpdate = 0;
  private pendingUpdate: string | null = null;
  private updateTimer: NodeJS.Timeout | null = null;
  private readonly THROTTLE_MS = 200; // 200ms間隔で更新
  private readonly MIN_CHANGE_THRESHOLD = 3; // 3文字以上変化で更新
  
  constructor(private onUpdate: (text: string) => void) {}
  
  update(text: string) {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdate;
    
    // 前回の更新から時間が経っている場合は即座に更新
    if (timeSinceLastUpdate >= this.THROTTLE_MS) {
      this.performUpdate(text);
      return;
    }
    
    // 前回のテキストと大きく変化している場合は即座に更新
    if (this.pendingUpdate && this.shouldUpdateImmediately(text, this.pendingUpdate)) {
      this.performUpdate(text);
      return;
    }
    
    // そうでなければ遅延更新
    this.pendingUpdate = text;
    if (!this.updateTimer) {
      this.updateTimer = setTimeout(() => {
        if (this.pendingUpdate) {
          this.performUpdate(this.pendingUpdate);
          this.pendingUpdate = null;
        }
        this.updateTimer = null;
      }, this.THROTTLE_MS - timeSinceLastUpdate);
    }
  }
  
  private performUpdate(text: string) {
    this.lastUpdate = Date.now();
    this.onUpdate(text);
    
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
  }
  
  private shouldUpdateImmediately(newText: string, oldText: string): boolean {
    // 文字数が大幅に変化（3文字以上増減）
    const lengthDiff = Math.abs(newText.length - oldText.length);
    if (lengthDiff >= this.MIN_CHANGE_THRESHOLD) {
      return true;
    }
    
    // 句読点や重要な単語が追加された
    const importantChanges = ['.', '。', '、', '，', '?', '？', '!', '！'];
    const hasImportantChange = importantChanges.some(char => 
      newText.includes(char) && !oldText.includes(char)
    );
    
    return hasImportantChange;
  }
  
  flush() {
    if (this.pendingUpdate) {
      this.performUpdate(this.pendingUpdate);
      this.pendingUpdate = null;
    }
  }
  
  destroy() {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
  }
}