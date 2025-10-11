/**
 * ParagraphBuilder for HistoryWindow - レンダラープロセス用
 * 
 * 責任:
 * - 履歴エントリーをパラグラフ単位にグループ化
 * - 15チャンク以上かつ文末記号で区切る
 * - 5秒以上の無音で次のパラグラフへ
 * - パラグラフ完成時に再翻訳をトリガー
 */

export interface ParagraphSegment {
  id: string;
  sourceText: string;
  targetText: string;
  timestamp: number;
}

export interface Paragraph {
  id: string;
  segments: ParagraphSegment[];
  combinedSourceText: string;
  combinedTargetText?: string;
  retranslatedText?: string;
  startTime: number;
  endTime: number;
  status: 'collecting' | 'translating' | 'completed';
}

export interface ParagraphBuilderOptions {
  minChunks?: number;          // 最小チャンク数（デフォルト: 15）
  maxChunks?: number;          // 最大チャンク数（デフォルト: 30）
  silenceThresholdMs?: number; // 無音判定（デフォルト: 5000ms）
  onParagraphComplete?: (paragraph: Paragraph) => void;
}

export class ParagraphBuilder {
  private currentParagraph: Paragraph | null = null;
  private lastSegmentTime: number = 0;
  private readonly options: Required<ParagraphBuilderOptions>;
  
  constructor(options: ParagraphBuilderOptions = {}) {
    this.options = {
      minChunks: options.minChunks ?? 15,
      maxChunks: options.maxChunks ?? 30,
      silenceThresholdMs: options.silenceThresholdMs ?? 5000,
      onParagraphComplete: options.onParagraphComplete ?? (() => {})
    };
  }

  /**
   * 新しいセグメントを追加
   */
  addSegment(segment: ParagraphSegment): void {
    const now = Date.now();
    
    // 5秒以上の無音があった場合、現在のパラグラフを完成させて新しいパラグラフを開始
    if (this.currentParagraph && this.lastSegmentTime && 
        (segment.timestamp - this.lastSegmentTime) > this.options.silenceThresholdMs) {
      console.log('[ParagraphBuilder] Silence detected, completing paragraph');
      this.completeParagraph();
    }
    
    // パラグラフが存在しない場合は新規作成
    if (!this.currentParagraph) {
      this.startNewParagraph(segment);
    } else {
      this.currentParagraph.segments.push(segment);
      this.currentParagraph.endTime = segment.timestamp;
    }
    
    this.lastSegmentTime = segment.timestamp;
    
    // 最大チャンク数チェック
    if (this.currentParagraph && this.currentParagraph.segments.length >= this.options.maxChunks) {
      console.log('[ParagraphBuilder] Max chunks reached, completing paragraph');
      this.completeParagraph();
      return;
    }
    
    // 最小チャンク数に達していて、文末記号がある場合は完成
    if (this.currentParagraph && 
        this.currentParagraph.segments.length >= this.options.minChunks &&
        this.isEndOfSentence(segment.sourceText)) {
      console.log('[ParagraphBuilder] End of sentence detected, completing paragraph');
      this.completeParagraph();
    }
  }

  /**
   * 強制的に現在のパラグラフを完成させる
   */
  flush(): void {
    if (this.currentParagraph && this.currentParagraph.segments.length > 0) {
      this.completeParagraph();
    }
  }

  /**
   * 現在のパラグラフを取得
   */
  getCurrentParagraph(): Paragraph | null {
    return this.currentParagraph;
  }

  /**
   * すべてをリセット
   */
  reset(): void {
    this.currentParagraph = null;
    this.lastSegmentTime = 0;
  }

  private startNewParagraph(segment: ParagraphSegment): void {
    this.currentParagraph = {
      id: `para_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      segments: [segment],
      combinedSourceText: '',
      startTime: segment.timestamp,
      endTime: segment.timestamp,
      status: 'collecting'
    };
    
    console.log('[ParagraphBuilder] Started new paragraph:', {
      paragraphId: this.currentParagraph.id,
      firstSegmentId: segment.id
    });
  }

  private completeParagraph(): void {
    if (!this.currentParagraph || this.currentParagraph.segments.length === 0) {
      return;
    }
    
    // ソーステキストを結合（スペースで区切る）
    this.currentParagraph.combinedSourceText = this.currentParagraph.segments
      .map(s => s.sourceText.trim())
      .filter(text => text.length > 0)
      .join(' ');
    
    // 既存の翻訳も結合（表示用）
    this.currentParagraph.combinedTargetText = this.currentParagraph.segments
      .map(s => s.targetText.trim())
      .filter(text => text.length > 0)
      .join(' ');
    
    this.currentParagraph.status = 'translating';
    
    console.log('[ParagraphBuilder] Completing paragraph:', {
      id: this.currentParagraph.id,
      segments: this.currentParagraph.segments.length,
      words: this.currentParagraph.combinedSourceText.split(' ').length,
      chars: this.currentParagraph.combinedSourceText.length
    });
    
    // コールバックを呼び出し
    this.options.onParagraphComplete(this.currentParagraph);
    
    // リセット
    this.currentParagraph = null;
  }

  private isEndOfSentence(text: string): boolean {
    const trimmed = text.trim();
    // 日本語と英語の文末記号をチェック
    return /[。.!?！？]$/.test(trimmed);
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): object {
    return {
      hasCurrentParagraph: !!this.currentParagraph,
      currentSegments: this.currentParagraph?.segments.length ?? 0,
      lastSegmentTime: this.lastSegmentTime,
      options: this.options
    };
  }
}