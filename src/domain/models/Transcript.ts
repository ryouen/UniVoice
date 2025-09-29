/**
 * Transcript Domain Model (Future Design)
 * Clean Architecture: Domain Layer
 * 
 * このファイルは理想的なドメインモデル設計を示していますが、
 * 現在は使用されていません。将来の実装の参考として保持しています。
 * 
 * 実際に使用されているTranscriptSegmentの定義は
 * src/domain/models/core/TranscriptSegment.ts を参照してください。
 * 
 * 音声認識の最小単位を表現するドメインモデル
 * 翻訳の責任はTranslationモデルに分離
 */

// 注意: これは将来の理想的な定義です。実際の定義は src/domain/models/core/TranscriptSegment.ts にあります
export interface TranscriptSegmentIdeal {
  // 識別子
  id: string;                     // ユニークID（seg_xxx形式）
  
  // コンテンツ
  text: string;                   // 音声認識されたテキスト
  language: string;               // 認識された言語（ISO 639-1）
  
  // メタデータ
  timestamp: number;              // 受信時刻（Unix timestamp）
  startMs: number;                // 音声開始位置（ミリ秒）
  endMs: number;                  // 音声終了位置（ミリ秒）
  
  // 品質指標
  confidence: number;             // 信頼度（0.0-1.0）
  isFinal: boolean;              // 最終結果かどうか
  
  // オプション（拡張用）
  speakerId?: string;            // 話者ID（将来の話者分離用）
  metadata?: Record<string, any>; // その他のメタデータ
}

export interface TranscriptSentence {
  id: string;
  segments: TranscriptSegmentIdeal[];
  combinedText: string;
  translation?: string;
  isHighQuality?: boolean;
  timestamp: Date;
  sentenceGroupId?: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  sourceText: string;
  targetText: string;
  isHighQuality?: boolean;
  sentenceId?: string;
  sentenceGroupId?: string;
  confidence?: number;
}

export interface TranscriptState {
  segments: TranscriptSegmentIdeal[];
  sentences: TranscriptSentence[];
  historyEntries: HistoryEntry[];
  currentTranscript: string;
  currentTranslation: string;
}

/**
 * Transcript Value Objects
 */
export class TranscriptText {
  constructor(
    public readonly text: string,
    public readonly language: string,
    public readonly confidence: number = 1.0
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.text || this.text.trim().length === 0) {
      throw new Error('Transcript text cannot be empty');
    }
    if (!this.language) {
      throw new Error('Language is required for transcript');
    }
    if (this.confidence < 0 || this.confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }
  }

  isEmpty(): boolean {
    return this.text.trim().length === 0;
  }

  getWordCount(): number {
    return this.text.split(/\s+/).filter(word => word.length > 0).length;
  }
}

export class TranslationPair {
  constructor(
    public readonly source: TranscriptText,
    public readonly target: TranscriptText,
    public readonly quality: TranslationQuality = TranslationQuality.REALTIME
  ) {}

  isHighQuality(): boolean {
    return this.quality === TranslationQuality.HIGH;
  }
}

export enum TranslationQuality {
  REALTIME = 'realtime',  // gpt-5-nano
  HIGH = 'high'           // gpt-5-mini
}

/**
 * Sentence Combiner Domain Service
 */
export interface SentenceCombinerOptions {
  maxSegments: number;
  timeoutMs: number;
  minSegments: number;
  sentenceEndPatterns: RegExp;
}

export class SentenceBoundary {
  private static readonly DEFAULT_PATTERNS = /[。！？.!?]+\s*$/;

  static isEndOfSentence(text: string): boolean {
    return this.DEFAULT_PATTERNS.test(text);
  }

  static shouldCombine(
    segments: TranscriptSegmentIdeal[],
    options: Partial<SentenceCombinerOptions>
  ): boolean {
    if (segments.length === 0) return false;

    const minSegments = options.minSegments || 1;
    const maxSegments = options.maxSegments || 10;

    if (segments.length < minSegments) return false;
    if (segments.length >= maxSegments) return true;

    const lastSegment = segments[segments.length - 1];
    return this.isEndOfSentence(lastSegment.text);
  }
}

/**
 * Transcript Factory
 */
export class TranscriptFactory {
  static createSegment(data: any): TranscriptSegmentIdeal {
    return {
      id: data.id || this.generateId('segment'),
      text: data.text || '',
      timestamp: data.timestamp || Date.now(),
      confidence: data.confidence,
      isFinal: data.isFinal !== false,
      startMs: data.startMs,
      endMs: data.endMs,
      language: data.language
    };
  }

  static createHistoryEntry(
    source: string,
    target: string,
    options?: Partial<HistoryEntry>
  ): HistoryEntry {
    const entry: HistoryEntry = {
      id: options?.id || this.generateId('history'),
      timestamp: options?.timestamp || new Date(),
      sourceText: source,
      targetText: target
    };

    if (options?.isHighQuality !== undefined) {
      entry.isHighQuality = options.isHighQuality;
    }
    if (options?.sentenceId !== undefined) {
      entry.sentenceId = options.sentenceId;
    }
    if (options?.sentenceGroupId !== undefined) {
      entry.sentenceGroupId = options.sentenceGroupId;
    }
    if (options?.confidence !== undefined) {
      entry.confidence = options.confidence;
    }

    return entry;
  }

  static createSentence(
    segments: TranscriptSegmentIdeal[],
    translation?: string
  ): TranscriptSentence {
    const combinedText = segments.map(s => s.text).join(' ');
    const sentence: TranscriptSentence = {
      id: this.generateId('sentence'),
      segments,
      combinedText,
      timestamp: new Date(),
      sentenceGroupId: this.generateId('group')
    };

    if (translation !== undefined) {
      sentence.translation = translation;
    }

    return sentence;
  }

  private static generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}