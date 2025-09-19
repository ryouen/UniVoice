/**
 * Transcript Domain Model
 * Clean Architecture: Domain Layer
 */

export interface TranscriptSegment {
  id: string;
  text: string;
  translation?: string;
  timestamp: number;
  confidence?: number;
  isFinal: boolean;
  startMs?: number;
  endMs?: number;
  language?: string;
}

export interface TranscriptSentence {
  id: string;
  segments: TranscriptSegment[];
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
  segments: TranscriptSegment[];
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
    segments: TranscriptSegment[],
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
  static createSegment(data: any): TranscriptSegment {
    return {
      id: data.id || this.generateId('segment'),
      text: data.text || '',
      translation: data.translation,
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
    segments: TranscriptSegment[],
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