/**
 * Session Logger - リアルタイム音声認識・翻訳セッションのログ収集
 */

export interface AudioSegment {
  id: number;
  timestamp: string;
  original: string;
  japanese: string;
  firstPaintMs: number;
  completeMs: number;
  characterCount: number;
  confidence?: number;
}

export interface SessionMetrics {
  startTime: number;
  endTime?: number;
  totalSegments: number;
  averageFirstPaint: number;
  averageComplete: number;
  averageCharacterCount: number;
  segments: AudioSegment[];
}

export class SessionLogger {
  private session: SessionMetrics;
  private segmentCount = 0;
  private logFile: string;
  private sessionStart = Date.now();
  
  constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = `session-${timestamp}.json`;
    
    this.session = {
      startTime: Date.now(),
      totalSegments: 0,
      averageFirstPaint: 0,
      averageComplete: 0,
      averageCharacterCount: 0,
      segments: []
    };
    
    console.log(`📊 [SessionLogger] ログ開始: ${this.logFile}`);
  }
  
  logSegment(data: {
    original: string;
    japanese: string;
    firstPaintMs: number;
    completeMs: number;
    confidence?: number;
  }) {
    this.segmentCount++;
    
    const segment: AudioSegment = {
      id: this.segmentCount,
      timestamp: new Date().toISOString(),
      original: data.original,
      japanese: data.japanese,
      firstPaintMs: data.firstPaintMs,
      completeMs: data.completeMs,
      characterCount: data.original.length,
      confidence: data.confidence
    };
    
    this.session.segments.push(segment);
    this.updateMetrics();
    
    // リアルタイムコンソール出力
    console.log(`✅ セグメント #${this.segmentCount}:`, {
      time: segment.timestamp.split('T')[1].split('.')[0],
      original: segment.original,
      japanese: segment.japanese,
      metrics: `${segment.firstPaintMs}ms→${segment.completeMs}ms`,
      chars: segment.characterCount
    });
    
    // 定期的にファイル保存（Electronの場合）
    if (this.segmentCount % 5 === 0) {
      this.saveToFile();
    }
  }
  
  logRealtimeUpdate(type: 'original' | 'translation', text: string) {
    const emoji = type === 'original' ? '🎤' : '🈳';
    const time = this.formatTime(Date.now() - this.sessionStart);
    console.log(`${emoji} [${time}] ${type}: "${text}"`);
  }
  
  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
  
  private updateMetrics() {
    this.session.totalSegments = this.session.segments.length;
    
    if (this.session.segments.length > 0) {
      this.session.averageFirstPaint = 
        this.session.segments.reduce((sum, s) => sum + s.firstPaintMs, 0) / this.session.segments.length;
      
      this.session.averageComplete = 
        this.session.segments.reduce((sum, s) => sum + s.completeMs, 0) / this.session.segments.length;
      
      this.session.averageCharacterCount = 
        this.session.segments.reduce((sum, s) => sum + s.characterCount, 0) / this.session.segments.length;
    }
  }
  
  endSession() {
    this.session.endTime = Date.now();
    this.saveToFile();
    
    console.log('📊 セッション終了サマリー:');
    console.log(`   ⏱️  期間: ${((this.session.endTime - this.session.startTime) / 1000 / 60).toFixed(1)}分`);
    console.log(`   📝 セグメント数: ${this.session.totalSegments}`);
    console.log(`   ⚡ 平均初回: ${Math.round(this.session.averageFirstPaint)}ms`);
    console.log(`   🏁 平均完了: ${Math.round(this.session.averageComplete)}ms`);
    console.log(`   📏 平均文字数: ${Math.round(this.session.averageCharacterCount)}`);
    console.log(`   💾 ログファイル: ${this.logFile}`);
  }
  
  private async saveToFile() {
    try {
      // Electron環境でのファイル保存
      if (window.electronAPI) {
        const logData = JSON.stringify(this.session, null, 2);
        // electronAPI経由でファイル保存（実装は後で追加）
        console.log(`💾 [SessionLogger] ログ保存: ${this.session.segments.length} segments`);
      }
    } catch (error) {
      console.error('[SessionLogger] 保存エラー:', error);
    }
  }
  
  getMetrics(): SessionMetrics {
    return { ...this.session };
  }
  
  exportCSV(): string {
    const headers = ['ID', 'Timestamp', 'Original', 'Japanese', 'FirstPaint(ms)', 'Complete(ms)', 'Characters'];
    const rows = this.session.segments.map(s => [
      s.id,
      s.timestamp,
      `"${s.original}"`,
      `"${s.japanese}"`,
      s.firstPaintMs,
      s.completeMs,
      s.characterCount
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}