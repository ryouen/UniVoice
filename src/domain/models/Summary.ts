/**
 * Summary Domain Model
 * Clean Architecture: Domain Layer
 */

export interface Summary {
  id: string;
  type: SummaryType;
  content: string;
  translation?: string;
  wordCount: number;
  timestamp: Date;
  sessionId: string;
  metadata?: SummaryMetadata;
}

export enum SummaryType {
  PROGRESSIVE_400 = 'progressive_400',
  PROGRESSIVE_800 = 'progressive_800',
  PROGRESSIVE_1600 = 'progressive_1600',
  PROGRESSIVE_2400 = 'progressive_2400',
  FINAL = 'final',
  CUSTOM = 'custom'
}

export interface SummaryMetadata {
  sourceLanguage: string;
  targetLanguage: string;
  model: string;
  tokensUsed?: number;
  processingTimeMs?: number;
  previousSummaryId?: string;  // 前回の要約のID（累積要約用）
}

export interface ProgressiveSummaryState {
  summaries: Map<SummaryType, Summary>;
  currentWordCount: number;
  lastSummaryTime: Date;
  isGenerating: boolean;
}

/**
 * Vocabulary extraction related types
 */
export interface VocabularyItem {
  term: string;
  definition: string;
  translation?: string;
  frequency: number;
  context?: string;
  importance: VocabularyImportance;
}

export enum VocabularyImportance {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface VocabularyExtraction {
  id: string;
  sessionId: string;
  items: VocabularyItem[];
  timestamp: Date;
  sourceLanguage: string;
  targetLanguage: string;
}

/**
 * Report generation types
 */
export interface SessionReport {
  id: string;
  sessionId: string;
  className: string;
  date: Date;
  duration: number;
  summary: Summary;
  vocabulary: VocabularyExtraction;
  transcriptHighlights: TranscriptHighlight[];
  format: ReportFormat;
  generatedAt: Date;
}

export interface TranscriptHighlight {
  text: string;
  translation: string;
  timestamp: Date;
  importance: 'high' | 'medium' | 'low';
  reason?: string;
}

export enum ReportFormat {
  MARKDOWN = 'markdown',
  HTML = 'html',
  PDF = 'pdf',
  WORD = 'word'
}

/**
 * Memo types (Questions and Notes)
 */
export interface Memo {
  id: string;
  text: string;
  translation?: string;
  type: MemoType;
  timestamp: Date;
  sessionId: string;
  isEditing?: boolean;
}

export enum MemoType {
  QUESTION = 'question',
  NOTE = 'note',
  HIGHLIGHT = 'highlight'
}

/**
 * Summary Value Objects
 */
export class SummaryContent {
  constructor(
    public readonly text: string,
    public readonly wordCount: number,
    public readonly language: string
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.text || this.text.trim().length === 0) {
      throw new Error('Summary content cannot be empty');
    }
    if (this.wordCount < 0) {
      throw new Error('Word count must be positive');
    }
  }

  exceedsWordLimit(limit: number): boolean {
    return this.wordCount > limit;
  }

  requiresExpansion(targetWords: number): boolean {
    return this.wordCount < targetWords * 0.9; // 10%のマージン
  }
}

/**
 * Progressive Summary Strategy
 */
export class ProgressiveSummaryStrategy {
  private static readonly THRESHOLDS: Record<SummaryType, number> = {
    [SummaryType.PROGRESSIVE_400]: 400,
    [SummaryType.PROGRESSIVE_800]: 800,
    [SummaryType.PROGRESSIVE_1600]: 1600,
    [SummaryType.PROGRESSIVE_2400]: 2400,
    [SummaryType.FINAL]: 0,
    [SummaryType.CUSTOM]: 0
  };

  static getNextSummaryType(currentWordCount: number): SummaryType | null {
    for (const [type, threshold] of Object.entries(this.THRESHOLDS)) {
      if (currentWordCount >= threshold && type !== SummaryType.FINAL && type !== SummaryType.CUSTOM) {
        return type as SummaryType;
      }
    }
    return null;
  }

  static shouldGenerateSummary(
    currentWordCount: number,
    lastSummaryWordCount: number
  ): boolean {
    // 前回の要約から800語以上増えたら新しい要約を生成
    return currentWordCount - lastSummaryWordCount >= 800;
  }

  static getSummaryWordTarget(type: SummaryType): number {
    return this.THRESHOLDS[type] || 400;
  }
}

/**
 * Summary Factory
 */
export class SummaryFactory {
  static createProgressiveSummary(
    content: string,
    type: SummaryType,
    sessionId: string,
    metadata?: Partial<SummaryMetadata>
  ): Summary {
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

    return {
      id: this.generateId('summary'),
      type,
      content,
      wordCount,
      timestamp: new Date(),
      sessionId,
      metadata: metadata as SummaryMetadata
    };
  }

  static createVocabularyExtraction(
    items: VocabularyItem[],
    sessionId: string,
    sourceLanguage: string,
    targetLanguage: string
  ): VocabularyExtraction {
    return {
      id: this.generateId('vocab'),
      sessionId,
      items,
      timestamp: new Date(),
      sourceLanguage,
      targetLanguage
    };
  }

  static createMemo(
    text: string,
    type: MemoType,
    sessionId: string,
    translation?: string
  ): Memo {
    const memo: Memo = {
      id: this.generateId('memo'),
      text,
      type,
      timestamp: new Date(),
      sessionId,
      isEditing: false
    };

    if (translation !== undefined) {
      memo.translation = translation;
    }

    return memo;
  }

  static createSessionReport(
    session: any,
    summary: Summary,
    vocabulary: VocabularyExtraction,
    highlights: TranscriptHighlight[],
    format: ReportFormat = ReportFormat.MARKDOWN
  ): SessionReport {
    return {
      id: this.generateId('report'),
      sessionId: session.id,
      className: session.className,
      date: session.startTime,
      duration: session.duration || 0,
      summary,
      vocabulary,
      transcriptHighlights: highlights,
      format,
      generatedAt: new Date()
    };
  }

  private static generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}