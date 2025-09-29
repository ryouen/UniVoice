/**
 * Stream Batcher
 * ストリーミングデータを効率的にバッチ処理
 */

export class StreamBatcher {
  private buffer = '';
  private timer: NodeJS.Timeout | null = null;
  private lastEmitTime = 0;
  
  constructor(
    private onBatch: (text: string) => void,
    private config = {
      minInterval: 100,      // 最小更新間隔（ms）
      maxWait: 200,         // 最大待機時間（ms）
      minChars: 3,          // 最小文字数
    }
  ) {}
  
  /**
   * データを追加
   */
  add(text: string): void {
    this.buffer = text;
    
    const now = Date.now();
    const timeSinceLastEmit = now - this.lastEmitTime;
    
    // タイマーをクリア
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    // 即座に送信する条件
    const shouldEmitNow = 
      // 最小間隔を過ぎている
      timeSinceLastEmit >= this.config.minInterval &&
      // 十分な文字数がある
      text.length >= this.config.minChars &&
      // 文末記号がある（文の区切り）
      /[。、！？.,!?]$/.test(text);
    
    if (shouldEmitNow) {
      this.emit();
    } else {
      // 遅延送信をスケジュール
      const delay = Math.min(
        this.config.maxWait,
        Math.max(0, this.config.minInterval - timeSinceLastEmit)
      );
      
      this.timer = setTimeout(() => {
        this.emit();
      }, delay);
    }
  }
  
  /**
   * バッファを送信
   */
  private emit(): void {
    if (this.buffer) {
      this.lastEmitTime = Date.now();
      this.onBatch(this.buffer);
    }
    
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
  
  /**
   * 強制的にフラッシュ
   */
  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    if (this.buffer) {
      this.emit();
    }
  }
  
  /**
   * リセット
   */
  reset(): void {
    this.buffer = '';
    this.lastEmitTime = 0;
    
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
  
  destroy(): void {
    this.reset();
  }
}