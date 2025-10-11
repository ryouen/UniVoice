/**
 * ParagraphBuilder - 履歴用のパラグラフ単位でテキストを構築
 * 
 * 責任:
 * - 30-60秒のセグメントを1つのパラグラフにまとめる
 * - テキストのクリーン化（フィラー除去、整形）
 * - 高品質翻訳のトリガー
 */

export interface Paragraph {
  id: string;
  segments: Array<{
    id: string;
    text: string;
    timestamp: number;
  }>;
  startTime: number;
  endTime: number;
  rawText: string;
  cleanedText?: string;
  translation?: string;
  status: 'collecting' | 'processing' | 'completed';
}

export interface ParagraphBuilderOptions {
  minChunks?: number;          // 最小チャンク数（デフォルト: 15）
  maxDurationMs?: number;      // 最大期間（デフォルト: 60秒）
  silenceThresholdMs?: number; // 無音判定（デフォルト: 5秒）
}

export class ParagraphBuilder {
  private currentParagraph: Paragraph | null = null;
  private lastSegmentTime: number = 0;
  private paragraphStartTime: number = 0;
  
  constructor(
    private onParagraphComplete: (paragraph: Paragraph) => void,
    private options: Required<ParagraphBuilderOptions> = {
      minChunks: 15,           // 15チャンク
      maxDurationMs: 60000,    // 60秒
      silenceThresholdMs: 5000 // 5秒
    }
  ) {}

  /**
   * セグメントを追加
   */
  addSegment(segment: { id: string; text: string; timestamp: number; isFinal: boolean }): void {
    console.log('[ParagraphBuilder] addSegment called:', {
      id: segment.id,
      text: segment.text.substring(0, 50) + '...',
      isFinal: segment.isFinal,
      hasText: !!segment.text.trim()
    });
    
    if (!segment.isFinal || !segment.text.trim()) {
      console.log('[ParagraphBuilder] Segment rejected: isFinal=' + segment.isFinal + ', hasText=' + !!segment.text.trim());
      return;
    }

    const now = Date.now();
    
    // 新しいパラグラフを開始
    if (!this.currentParagraph) {
      this.startNewParagraph(segment, now);
      return;
    }

    // 無音検出による区切り
    if (this.lastSegmentTime && (segment.timestamp - this.lastSegmentTime) > this.options.silenceThresholdMs) {
      console.log('[ParagraphBuilder] Silence detected, completing paragraph');
      this.completeParagraph();
      this.startNewParagraph(segment, now);
      return;
    }

    // セグメントを追加
    this.currentParagraph.segments.push({
      id: segment.id,
      text: segment.text,
      timestamp: segment.timestamp
    });
    
    this.lastSegmentTime = segment.timestamp;
    
    // 最小チャンク数チェック
    const chunkCount = this.currentParagraph.segments.length;
    const duration = now - this.paragraphStartTime;
    
    // 最大期間チェック
    if (duration >= this.options.maxDurationMs) {
      console.log('[ParagraphBuilder] Max duration reached, completing paragraph');
      this.completeParagraph();
      return;
    }

    // 最小チャンク数に達していない場合は継続
    if (chunkCount < this.options.minChunks) {
      return;
    }

    // 文末記号チェック（最小チャンク数達成後）
    if (this.isEndOfSentence(segment.text)) {
      console.log('[ParagraphBuilder] End of sentence detected, completing paragraph');
      this.completeParagraph();
      return;
    }

    // 自然な区切りを検出
    if (this.isNaturalBreak(segment.text)) {
      console.log('[ParagraphBuilder] Natural break detected, completing paragraph');
      this.completeParagraph();
    }
  }

  /**
   * 強制的にパラグラフを完成させる
   */
  flush(): void {
    if (this.currentParagraph && this.currentParagraph.segments.length > 0) {
      this.completeParagraph();
    }
  }

  /**
   * 新しいパラグラフを開始
   */
  private startNewParagraph(segment: { id: string; text: string; timestamp: number }, now: number): void {
    this.currentParagraph = {
      id: `para_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      segments: [{
        id: segment.id,
        text: segment.text,
        timestamp: segment.timestamp
      }],
      startTime: segment.timestamp,
      endTime: segment.timestamp,
      rawText: '',
      status: 'collecting'
    };
    
    this.paragraphStartTime = now;
    this.lastSegmentTime = segment.timestamp;
    
    console.log('[ParagraphBuilder] Started new paragraph:', {
      paragraphId: this.currentParagraph.id,
      firstSegmentId: segment.id,
      startTime: segment.timestamp
    });
  }

  /**
   * パラグラフを完成させる
   */
  private completeParagraph(): void {
    if (!this.currentParagraph || this.currentParagraph.segments.length === 0) {
      return;
    }

    // 生テキストを結合
    this.currentParagraph.rawText = this.currentParagraph.segments
      .map(s => s.text)
      .join(' ');
    
    this.currentParagraph.endTime = this.lastSegmentTime;
    this.currentParagraph.status = 'processing';
    
    console.log(`[ParagraphBuilder] Completing paragraph:`, {
      id: this.currentParagraph.id,
      segments: this.currentParagraph.segments.length,
      duration: `${((this.currentParagraph.endTime - this.currentParagraph.startTime) / 1000).toFixed(1)}s`,
      words: this.currentParagraph.rawText.split(' ').length
    });

    // コールバックを呼び出し
    this.onParagraphComplete(this.currentParagraph);
    
    // リセット
    this.currentParagraph = null;
  }

  /**
   * 文末記号をチェック
   */
  private isEndOfSentence(text: string): boolean {
    const trimmed = text.trim();
    return /[。.!?！？]$/.test(trimmed);
  }

  /**
   * 自然な区切りかチェック（簡易版）
   */
  private isNaturalBreak(text: string): boolean {
    // 話題の転換を示すフレーズ
    const transitionPhrases = [
      /^(so|now|next|okay|alright|well)/i,
      /^(let's|let me|I want to|I'd like to)/i,
      /^(moving on|in conclusion|to summarize)/i,
    ];
    
    return transitionPhrases.some(pattern => pattern.test(text.trim()));
  }

  /**
   * テキストをクリーン化（静的メソッド）
   */
  static cleanText(rawText: string): string {
    let cleaned = rawText;
    
    // フィラーを除去
    const fillers = /\b(um|uh|ah|er|like|you know|I mean|sort of|kind of)\b/gi;
    cleaned = cleaned.replace(fillers, '');
    
    // 重複を除去
    cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');
    
    // 余分なスペースを除去
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // 文頭を大文字に
    cleaned = cleaned.replace(/(^|\. )([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
    
    return cleaned;
  }
  
  /**
   * リソースのクリーンアップ
   */
  destroy(): void {
    // 現在のパラグラフがあれば完成させる
    if (this.currentParagraph && this.currentParagraph.segments.length > 0) {
      this.completeParagraph();
    }
    
    // リセット
    this.currentParagraph = null;
    this.lastSegmentTime = 0;
    this.paragraphStartTime = 0;
  }
}