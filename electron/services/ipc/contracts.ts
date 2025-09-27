import { z } from 'zod';

// ========================================
// Core Domain Types
// ========================================

/**
 * ASR (Automatic Speech Recognition) Events
 */
export const ASREventSchema = z.object({
  type: z.literal('asr'),
  timestamp: z.number(),
  correlationId: z.string(),
  data: z.object({
    text: z.string(),
    confidence: z.number().min(0).max(1),
    isFinal: z.boolean(),
    language: z.string().optional(),
    segmentId: z.string().optional(), // Added for RealtimeDisplayManager
  }),
});

/**
 * Translation Events
 */
export const TranslationEventSchema = z.object({
  type: z.literal('translation'),
  timestamp: z.number(),
  correlationId: z.string(),
  data: z.object({
    sourceText: z.string(),
    targetText: z.string(),
    sourceLanguage: z.string(),
    targetLanguage: z.string(),
    confidence: z.number().min(0).max(1),
    isFinal: z.boolean(),
    segmentId: z.string().optional(),
  }),
});

/**
 * Segment Management Events
 */
export const SegmentEventSchema = z.object({
  type: z.literal('segment'),
  timestamp: z.number(),
  correlationId: z.string(),
  data: z.object({
    segmentId: z.string(),
    text: z.string(),
    translation: z.string().optional(),
    status: z.enum(['processing', 'completed', 'error']),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/**
 * Error Events
 */
export const ErrorEventSchema = z.object({
  type: z.literal('error'),
  timestamp: z.number(),
  correlationId: z.string(),
  data: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    recoverable: z.boolean(),
  }),
});

/**
 * Progressive Summary Events (word count based)
 */
export const ProgressiveSummaryEventSchema = z.object({
  type: z.literal('progressiveSummary'),
  timestamp: z.number(),
  correlationId: z.string(),
  data: z.object({
    sourceText: z.string(),
    targetText: z.string(),
    sourceLanguage: z.string(),
    targetLanguage: z.string(),
    wordCount: z.number(),
    threshold: z.number(),
    startTime: z.number().optional(),
    endTime: z.number().optional(),
  }),
});

/**
 * Status Events
 */
export const StatusEventSchema = z.object({
  type: z.literal('status'),
  timestamp: z.number(),
  correlationId: z.string(),
  data: z.object({
    state: z.enum(['idle', 'starting', 'listening', 'processing', 'stopping', 'error', 'paused']),
    details: z.record(z.unknown()).optional(),
  }),
});

/**
 * Vocabulary Events
 */
export const VocabularyEventSchema = z.object({
  type: z.literal('vocabulary'),
  timestamp: z.number(),
  correlationId: z.string(),
  data: z.object({
    items: z.array(z.object({
      term: z.string(),
      definition: z.string(),
      context: z.string().optional(),
    })),
    totalTerms: z.number(),
  }),
});

/**
 * Final Report Events
 */
export const FinalReportEventSchema = z.object({
  type: z.literal('finalReport'),
  timestamp: z.number(),
  correlationId: z.string(),
  data: z.object({
    report: z.string(), // Markdown format
    totalWordCount: z.number(),
    summaryCount: z.number(),
    vocabularyCount: z.number(),
  }),
});

/**
 * Combined Sentence Events
 * 【Phase 2-1】CombinedSentenceEventの定義
 * SentenceCombinerで結合された文の情報をフロントエンドに通知
 */
export const CombinedSentenceEventSchema = z.object({
  type: z.literal('combinedSentence'),
  timestamp: z.number(),
  correlationId: z.string(),
  data: z.object({
    combinedId: z.string(),           // 結合された文のID（combined_xxx）
    segmentIds: z.array(z.string()),  // 元のセグメントIDの配列
    sourceText: z.string(),           // 結合された原文
    timestamp: z.number(),            // 最初のセグメントのタイムスタンプ
    endTimestamp: z.number(),         // 最後のセグメントのタイムスタンプ
    segmentCount: z.number(),         // 結合されたセグメント数
  }),
});

/**
 * Paragraph Complete Events
 * 【Phase 2-ParagraphBuilder】ParagraphCompleteEventの定義
 * ParagraphBuilderで結合されたパラグラフの情報をフロントエンドに通知
 */
export const ParagraphCompleteEventSchema = z.object({
  type: z.literal('paragraphComplete'),
  timestamp: z.number(),
  correlationId: z.string(),
  data: z.object({
    paragraphId: z.string(),          // パラグラフのID（para_xxx）
    segmentIds: z.array(z.string()),  // 元のセグメントIDの配列
    rawText: z.string(),              // 結合された生テキスト
    cleanedText: z.string().optional(), // クリーン化されたテキスト
    startTime: z.number(),            // 開始タイムスタンプ
    endTime: z.number(),              // 終了タイムスタンプ
    duration: z.number(),             // 期間（ミリ秒）
    wordCount: z.number(),            // 単語数
    // フロントエンド用のparagraphオブジェクト
    paragraph: z.object({
      id: z.string(),
      segments: z.array(z.object({
        id: z.string(),
        text: z.string(),
        timestamp: z.number()
      })),
      startTime: z.number(),
      endTime: z.number(),
      rawText: z.string(),
      cleanedText: z.string().optional(),
      translation: z.string().optional(),
      status: z.enum(['collecting', 'processing', 'completed'])
    }).optional()
  }),
});

// ========================================
// Union Types
// ========================================

export const PipelineEventSchema = z.discriminatedUnion('type', [
  ASREventSchema,
  TranslationEventSchema,
  SegmentEventSchema,
  ProgressiveSummaryEventSchema,  // 段階的要約イベント
  ErrorEventSchema,
  StatusEventSchema,
  VocabularyEventSchema,
  FinalReportEventSchema,
  CombinedSentenceEventSchema,  // 【Phase 2-1】追加
  ParagraphCompleteEventSchema,  // 【Phase 2-ParagraphBuilder】追加
]);

// ========================================
// IPC Command Schemas
// ========================================

export const StartListeningCommandSchema = z.object({
  command: z.literal('startListening'),
  params: z.object({
    sourceLanguage: z.string().default('en'),
    targetLanguage: z.string().default('ja'),
    correlationId: z.string(),
  }),
});

export const StopListeningCommandSchema = z.object({
  command: z.literal('stopListening'),
  params: z.object({
    correlationId: z.string(),
  }),
});

export const GetHistoryCommandSchema = z.object({
  command: z.literal('getHistory'),
  params: z.object({
    limit: z.number().optional().default(100),
    offset: z.number().optional().default(0),
  }),
});

export const GetFullHistoryCommandSchema = z.object({
  command: z.literal('getFullHistory'),
  params: z.object({}),
});

export const ClearHistoryCommandSchema = z.object({
  command: z.literal('clearHistory'),
  params: z.object({}),
});

export const GenerateVocabularyCommandSchema = z.object({
  command: z.literal('generateVocabulary'),
  params: z.object({
    correlationId: z.string(),
  }),
});

export const GenerateFinalReportCommandSchema = z.object({
  command: z.literal('generateFinalReport'),
  params: z.object({
    correlationId: z.string(),
  }),
});

export const GetAvailableSessionsCommandSchema = z.object({
  command: z.literal('getAvailableSessions'),
  params: z.object({
    courseName: z.string().optional(),
    limit: z.number().optional().default(20),
  }),
});

export const LoadSessionCommandSchema = z.object({
  command: z.literal('loadSession'),
  params: z.object({
    courseName: z.string(),
    dateStr: z.string(),
    sessionNumber: z.number(),
  }),
});

export const IPCCommandSchema = z.discriminatedUnion('command', [
  StartListeningCommandSchema,
  StopListeningCommandSchema,
  GetHistoryCommandSchema,
  GetFullHistoryCommandSchema,
  ClearHistoryCommandSchema,
  GenerateVocabularyCommandSchema,
  GenerateFinalReportCommandSchema,
  GetAvailableSessionsCommandSchema,
  LoadSessionCommandSchema,
]);

// ========================================
// Type Exports
// ========================================

export type ASREvent = z.infer<typeof ASREventSchema>;
export type TranslationEvent = z.infer<typeof TranslationEventSchema>;
export type SegmentEvent = z.infer<typeof SegmentEventSchema>;
export type ProgressiveSummaryEvent = z.infer<typeof ProgressiveSummaryEventSchema>;
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;
export type StatusEvent = z.infer<typeof StatusEventSchema>;
export type VocabularyEvent = z.infer<typeof VocabularyEventSchema>;
export type FinalReportEvent = z.infer<typeof FinalReportEventSchema>;
export type CombinedSentenceEvent = z.infer<typeof CombinedSentenceEventSchema>;  // 【Phase 2-1】追加
export type ParagraphCompleteEvent = z.infer<typeof ParagraphCompleteEventSchema>;  // 【Phase 2-ParagraphBuilder】追加
export type PipelineEvent = z.infer<typeof PipelineEventSchema>;

export type StartListeningCommand = z.infer<typeof StartListeningCommandSchema>;
export type StopListeningCommand = z.infer<typeof StopListeningCommandSchema>;
export type GetHistoryCommand = z.infer<typeof GetHistoryCommandSchema>;
export type GetFullHistoryCommand = z.infer<typeof GetFullHistoryCommandSchema>;
export type ClearHistoryCommand = z.infer<typeof ClearHistoryCommandSchema>;
export type GenerateVocabularyCommand = z.infer<typeof GenerateVocabularyCommandSchema>;
export type GenerateFinalReportCommand = z.infer<typeof GenerateFinalReportCommandSchema>;
export type GetAvailableSessionsCommand = z.infer<typeof GetAvailableSessionsCommandSchema>;
export type LoadSessionCommand = z.infer<typeof LoadSessionCommandSchema>;
export type IPCCommand = z.infer<typeof IPCCommandSchema>;

// ========================================
// Validation Helpers
// ========================================

export const validatePipelineEvent = (data: unknown): PipelineEvent => {
  return PipelineEventSchema.parse(data);
};

export const validateIPCCommand = (data: unknown): IPCCommand => {
  return IPCCommandSchema.parse(data);
};

// ========================================
// Event Factory Functions
// ========================================

export const createASREvent = (data: ASREvent['data'], correlationId: string): ASREvent => ({
  type: 'asr',
  timestamp: Date.now(),
  correlationId,
  data,
});

export const createTranslationEvent = (
  data: TranslationEvent['data'],
  correlationId: string
): TranslationEvent => ({
  type: 'translation',
  timestamp: Date.now(),
  correlationId,
  data,
});

export const createSegmentEvent = (
  data: SegmentEvent['data'],
  correlationId: string
): SegmentEvent => ({
  type: 'segment',
  timestamp: Date.now(),
  correlationId,
  data,
});

export const createErrorEvent = (
  data: ErrorEvent['data'],
  correlationId: string
): ErrorEvent => ({
  type: 'error',
  timestamp: Date.now(),
  correlationId,
  data,
});


export const createStatusEvent = (
  data: StatusEvent['data'],
  correlationId: string
): StatusEvent => ({
  type: 'status',
  timestamp: Date.now(),
  correlationId,
  data,
});

export const createVocabularyEvent = (
  data: VocabularyEvent['data'],
  correlationId: string
): VocabularyEvent => ({
  type: 'vocabulary',
  timestamp: Date.now(),
  correlationId,
  data,
});

export const createFinalReportEvent = (
  data: FinalReportEvent['data'],
  correlationId: string
): FinalReportEvent => ({
  type: 'finalReport',
  timestamp: Date.now(),
  correlationId,
  data,
});

/**
 * Progressive Summary Event Factory
 */
export const createProgressiveSummaryEvent = (
  data: ProgressiveSummaryEvent['data'],
  correlationId: string
): ProgressiveSummaryEvent => ({
  type: 'progressiveSummary',
  timestamp: Date.now(),
  correlationId,
  data,
});

/**
 * 【Phase 2-1】CombinedSentenceEventのファクトリー関数
 */
export const createCombinedSentenceEvent = (
  data: CombinedSentenceEvent['data'],
  correlationId: string
): CombinedSentenceEvent => ({
  type: 'combinedSentence',
  timestamp: Date.now(),
  correlationId,
  data,
});

/**
 * 【Phase 2-ParagraphBuilder】ParagraphCompleteEventのファクトリー関数
 */
export const createParagraphCompleteEvent = (
  data: ParagraphCompleteEvent['data'],
  correlationId: string
): ParagraphCompleteEvent => ({
  type: 'paragraphComplete',
  timestamp: Date.now(),
  correlationId,
  data,
});