/**
 * SentenceCombiner - セグメントを文単位に結合
 * 
 * 責任:
 * - Deepgramのセグメント（0.8秒区切り）を文単位に結合
 * - 文の境界を適切に判定
 * - 結合された文を履歴用に提供
 * 
 * 設計原則:
 * - 文末パターンで自動結合
 * - タイムアウトによる強制区切り
 * - メモリ効率的なバッファリング
 * 
 * @author Claude Code
 * @date 2025-08-24
 */

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
  startMs?: number;
  endMs?: number;
}

export interface CombinedSentence {
  id: string;
  segmentIds: string[];        // 元のセグメントID群
  sourceText: string;          // 結合された原文（original → source に統一）
  timestamp: number;           // 最初のセグメントのタイムスタンプ
  endTimestamp: number;        // 最後のセグメントのタイムスタンプ
  segmentCount: number;        // 結合されたセグメント数
}

export interface SentenceCombinerOptions {
  maxSegments?: number;        // 最大セグメント数（デフォルト: 10）
  timeoutMs?: number;          // タイムアウト時間（デフォルト: 2000ms）
  minSegments?: number;        // 最小セグメント数（デフォルト: 2）
}

export class SentenceCombiner {
  private segments: TranscriptSegment[] = [];
  private lastSegmentTime: number = 0;
  private timeoutTimer: NodeJS.Timeout | null = null;
  
  // 文末パターン（確実なもののみ）
  private readonly sentenceEndPatterns = [
    // 日本語
    /[。．]\s*$/,                    // 句点
    /[！？]\s*$/,                    // 感嘆符・疑問符
    
    // 英語
    /[.!?]\s*$/,                     // 文末記号
    /\.\)?\s*$/,                     // 括弧付きピリオド
    /[.!?]['"]?\s*$/,                // 引用符付き文末
  ];
  
  // 文の途中を示すパターン
  private readonly incompleteSentencePatterns = [
    /[,、]\s*$/,                     // カンマ
    /\s+(and|or|but)\s*$/i,          // 接続詞
    /\s+(は|が|を|に|で|と|の)\s*$/,  // 日本語助詞
  ];
  
  private readonly options: Required<SentenceCombinerOptions>;
  
  constructor(
    private onSentenceComplete: (sentence: CombinedSentence) => void,
    options: SentenceCombinerOptions = {}
  ) {
    this.options = {
      maxSegments: options.maxSegments || 10,
      timeoutMs: options.timeoutMs || 2000,
      minSegments: options.minSegments || 2
    };
  }
  
  /**
   * セグメントを追加
   */
  addSegment(segment: TranscriptSegment): void {
    // Finalでないセグメントはスキップ（既にリアルタイム表示で処理済み）
    if (!segment.isFinal) {
      return;
    }
    
    this.segments.push(segment);
    this.lastSegmentTime = Date.now();
    
    // タイムアウトタイマーをリセット
    this.resetTimeoutTimer();
    
    // 結合された文字列を生成
    const combinedText = this.getCombinedText();
    
    // 文が完成したかチェック
    if (this.isSentenceComplete(combinedText)) {
      // 最小セグメント数をチェック（断片的すぎる場合は待つ）
      if (this.segments.length >= this.options.minSegments || 
          this.isDefinitelySentenceEnd(combinedText)) {
        this.emitCombinedSentence();
      }
    } else if (this.segments.length >= this.options.maxSegments) {
      // 最大セグメント数に達したら強制的に出力
      this.emitCombinedSentence();
    }
  }
  
  /**
   * 結合されたテキストを取得
   */
  private getCombinedText(): string {
    return this.segments
      .map(s => s.text.trim())
      .filter(text => text.length > 0)
      .join(' ');
  }
  
  /**
   * 文が完成したかチェック
   */
  private isSentenceComplete(text: string): boolean {
    // 空文字列は未完成
    if (!text || text.trim().length === 0) {
      return false;
    }
    
    // 明らかに未完成のパターンがあれば false
    if (this.incompleteSentencePatterns.some(pattern => pattern.test(text))) {
      return false;
    }
    
    // 文末パターンに一致すれば完成
    return this.sentenceEndPatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * 確実に文末かチェック（短くても出力する場合）
   */
  private isDefinitelySentenceEnd(text: string): boolean {
    // 疑問文、感嘆文、通常の文末（ピリオド・句点）は短くても文として成立
    // DEEP-THINK改善: ピリオドと句点を追加
    return /[？！?!。\.]\s*$/.test(text);
  }
  
  /**
   * タイムアウトタイマーをリセット
   */
  private resetTimeoutTimer(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
    }
    
    this.timeoutTimer = setTimeout(() => {
      if (this.segments.length > 0) {
        console.log('[SentenceCombiner] Timeout reached, emitting combined sentence');
        this.emitCombinedSentence();
      }
    }, this.options.timeoutMs);
  }
  
  /**
   * 結合された文を出力
   */
  private emitCombinedSentence(): void {
    if (this.segments.length === 0) {
      return;
    }
    
    const combinedText = this.getCombinedText();
    if (!combinedText) {
      this.segments = [];
      return;
    }
    
    const combinedSentence: CombinedSentence = {
      id: `combined_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      segmentIds: this.segments.map(s => s.id),
      sourceText: combinedText,
      timestamp: this.segments[0].timestamp,
      endTimestamp: this.segments[this.segments.length - 1].timestamp,
      segmentCount: this.segments.length
    };
    
    console.log(`[SentenceCombiner] Emitting combined sentence: ${combinedSentence.segmentCount} segments`);
    // 【Phase 0-1】データフロー可視化ログ追加
    console.log('[DataFlow-4] Combined sentence created:', {
      combinedId: combinedSentence.id,
      segmentIds: combinedSentence.segmentIds,
      textLength: combinedSentence.sourceText.length,
      timestamp: Date.now()
    });
    
    // コールバックを呼び出し
    this.onSentenceComplete(combinedSentence);
    
    // バッファをクリア
    this.segments = [];
    
    // タイマーをクリア
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }
  
  
  /**
   * 現在のバッファの状態を取得
   */
  getBufferStatus(): {
    segmentCount: number;
    combinedText: string;
    timeSinceLastSegment: number;
  } {
    return {
      segmentCount: this.segments.length,
      combinedText: this.getCombinedText(),
      timeSinceLastSegment: this.lastSegmentTime ? Date.now() - this.lastSegmentTime : 0
    };
  }
  
  /**
   * 強制的に現在のバッファを出力（セッション終了時用）
   * DEEP-THINK追加: UnifiedPipelineServiceから呼ばれるが未実装だった
   */
  forceEmit(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    
    // セグメントがある場合は、条件を無視して強制的に出力
    if (this.segments.length > 0) {
      console.log('[SentenceCombiner] Force emit called with', this.segments.length, 'segments');
      this.emitCombinedSentence();
    }
  }

  /**
   * リソースのクリーンアップ
   */
  destroy(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    this.segments = [];
  }
}