"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createParagraphCompleteEvent = exports.createCombinedSentenceEvent = exports.createProgressiveSummaryEvent = exports.createFinalReportEvent = exports.createVocabularyEvent = exports.createStatusEvent = exports.createErrorEvent = exports.createSegmentEvent = exports.createTranslationEvent = exports.createASREvent = exports.validateIPCCommand = exports.validatePipelineEvent = exports.IPCCommandSchema = exports.LoadSessionCommandSchema = exports.GetAvailableSessionsCommandSchema = exports.GenerateFinalReportCommandSchema = exports.GenerateVocabularyCommandSchema = exports.ClearHistoryCommandSchema = exports.GetFullHistoryCommandSchema = exports.GetHistoryCommandSchema = exports.StopListeningCommandSchema = exports.StartListeningCommandSchema = exports.PipelineEventSchema = exports.ParagraphCompleteEventSchema = exports.CombinedSentenceEventSchema = exports.FinalReportEventSchema = exports.VocabularyEventSchema = exports.StatusEventSchema = exports.ProgressiveSummaryEventSchema = exports.ErrorEventSchema = exports.SegmentEventSchema = exports.TranslationEventSchema = exports.ASREventSchema = void 0;
const zod_1 = require("zod");
// ========================================
// Core Domain Types
// ========================================
/**
 * ASR (Automatic Speech Recognition) Events
 */
exports.ASREventSchema = zod_1.z.object({
    type: zod_1.z.literal('asr'),
    timestamp: zod_1.z.number(),
    correlationId: zod_1.z.string(),
    data: zod_1.z.object({
        text: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1),
        isFinal: zod_1.z.boolean(),
        language: zod_1.z.string().optional(),
        segmentId: zod_1.z.string().optional(), // Added for RealtimeDisplayManager
    }),
});
/**
 * Translation Events
 */
exports.TranslationEventSchema = zod_1.z.object({
    type: zod_1.z.literal('translation'),
    timestamp: zod_1.z.number(),
    correlationId: zod_1.z.string(),
    data: zod_1.z.object({
        sourceText: zod_1.z.string(),
        targetText: zod_1.z.string(),
        sourceLanguage: zod_1.z.string(),
        targetLanguage: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1),
        isFinal: zod_1.z.boolean(),
        segmentId: zod_1.z.string().optional(),
    }),
});
/**
 * Segment Management Events
 */
exports.SegmentEventSchema = zod_1.z.object({
    type: zod_1.z.literal('segment'),
    timestamp: zod_1.z.number(),
    correlationId: zod_1.z.string(),
    data: zod_1.z.object({
        segmentId: zod_1.z.string(),
        text: zod_1.z.string(),
        translation: zod_1.z.string().optional(),
        status: zod_1.z.enum(['processing', 'completed', 'error']),
        metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    }),
});
/**
 * Error Events
 */
exports.ErrorEventSchema = zod_1.z.object({
    type: zod_1.z.literal('error'),
    timestamp: zod_1.z.number(),
    correlationId: zod_1.z.string(),
    data: zod_1.z.object({
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        details: zod_1.z.record(zod_1.z.unknown()).optional(),
        recoverable: zod_1.z.boolean(),
    }),
});
/**
 * Progressive Summary Events (word count based)
 */
exports.ProgressiveSummaryEventSchema = zod_1.z.object({
    type: zod_1.z.literal('progressiveSummary'),
    timestamp: zod_1.z.number(),
    correlationId: zod_1.z.string(),
    data: zod_1.z.object({
        sourceText: zod_1.z.string(),
        targetText: zod_1.z.string(),
        sourceLanguage: zod_1.z.string(),
        targetLanguage: zod_1.z.string(),
        wordCount: zod_1.z.number(),
        threshold: zod_1.z.number(),
        startTime: zod_1.z.number().optional(),
        endTime: zod_1.z.number().optional(),
    }),
});
/**
 * Status Events
 */
exports.StatusEventSchema = zod_1.z.object({
    type: zod_1.z.literal('status'),
    timestamp: zod_1.z.number(),
    correlationId: zod_1.z.string(),
    data: zod_1.z.object({
        state: zod_1.z.enum(['idle', 'starting', 'listening', 'processing', 'stopping', 'error', 'paused']),
        details: zod_1.z.record(zod_1.z.unknown()).optional(),
    }),
});
/**
 * Vocabulary Events
 */
exports.VocabularyEventSchema = zod_1.z.object({
    type: zod_1.z.literal('vocabulary'),
    timestamp: zod_1.z.number(),
    correlationId: zod_1.z.string(),
    data: zod_1.z.object({
        items: zod_1.z.array(zod_1.z.object({
            term: zod_1.z.string(),
            definition: zod_1.z.string(),
            context: zod_1.z.string().optional(),
        })),
        totalTerms: zod_1.z.number(),
    }),
});
/**
 * Final Report Events
 */
exports.FinalReportEventSchema = zod_1.z.object({
    type: zod_1.z.literal('finalReport'),
    timestamp: zod_1.z.number(),
    correlationId: zod_1.z.string(),
    data: zod_1.z.object({
        report: zod_1.z.string(), // Markdown format
        totalWordCount: zod_1.z.number(),
        summaryCount: zod_1.z.number(),
        vocabularyCount: zod_1.z.number(),
    }),
});
/**
 * Combined Sentence Events
 * 【Phase 2-1】CombinedSentenceEventの定義
 * SentenceCombinerで結合された文の情報をフロントエンドに通知
 */
exports.CombinedSentenceEventSchema = zod_1.z.object({
    type: zod_1.z.literal('combinedSentence'),
    timestamp: zod_1.z.number(),
    correlationId: zod_1.z.string(),
    data: zod_1.z.object({
        combinedId: zod_1.z.string(), // 結合された文のID（combined_xxx）
        segmentIds: zod_1.z.array(zod_1.z.string()), // 元のセグメントIDの配列
        sourceText: zod_1.z.string(), // 結合された原文
        timestamp: zod_1.z.number(), // 最初のセグメントのタイムスタンプ
        endTimestamp: zod_1.z.number(), // 最後のセグメントのタイムスタンプ
        segmentCount: zod_1.z.number(), // 結合されたセグメント数
    }),
});
/**
 * Paragraph Complete Events
 * 【Phase 2-ParagraphBuilder】ParagraphCompleteEventの定義
 * ParagraphBuilderで結合されたパラグラフの情報をフロントエンドに通知
 */
exports.ParagraphCompleteEventSchema = zod_1.z.object({
    type: zod_1.z.literal('paragraphComplete'),
    timestamp: zod_1.z.number(),
    correlationId: zod_1.z.string(),
    data: zod_1.z.object({
        paragraphId: zod_1.z.string(), // パラグラフのID（para_xxx）
        segmentIds: zod_1.z.array(zod_1.z.string()), // 元のセグメントIDの配列
        rawText: zod_1.z.string(), // 結合された生テキスト
        cleanedText: zod_1.z.string().optional(), // クリーン化されたテキスト
        startTime: zod_1.z.number(), // 開始タイムスタンプ
        endTime: zod_1.z.number(), // 終了タイムスタンプ
        duration: zod_1.z.number(), // 期間（ミリ秒）
        wordCount: zod_1.z.number(), // 単語数
        // フロントエンド用のparagraphオブジェクト
        paragraph: zod_1.z.object({
            id: zod_1.z.string(),
            segments: zod_1.z.array(zod_1.z.object({
                id: zod_1.z.string(),
                text: zod_1.z.string(),
                timestamp: zod_1.z.number()
            })),
            startTime: zod_1.z.number(),
            endTime: zod_1.z.number(),
            rawText: zod_1.z.string(),
            cleanedText: zod_1.z.string().optional(),
            translation: zod_1.z.string().optional(),
            status: zod_1.z.enum(['collecting', 'processing', 'completed'])
        }).optional()
    }),
});
// ========================================
// Union Types
// ========================================
exports.PipelineEventSchema = zod_1.z.discriminatedUnion('type', [
    exports.ASREventSchema,
    exports.TranslationEventSchema,
    exports.SegmentEventSchema,
    exports.ProgressiveSummaryEventSchema, // 段階的要約イベント
    exports.ErrorEventSchema,
    exports.StatusEventSchema,
    exports.VocabularyEventSchema,
    exports.FinalReportEventSchema,
    exports.CombinedSentenceEventSchema, // 【Phase 2-1】追加
    exports.ParagraphCompleteEventSchema, // 【Phase 2-ParagraphBuilder】追加
]);
// ========================================
// IPC Command Schemas
// ========================================
exports.StartListeningCommandSchema = zod_1.z.object({
    command: zod_1.z.literal('startListening'),
    params: zod_1.z.object({
        sourceLanguage: zod_1.z.string().default('en'),
        targetLanguage: zod_1.z.string().default('ja'),
        correlationId: zod_1.z.string(),
    }),
});
exports.StopListeningCommandSchema = zod_1.z.object({
    command: zod_1.z.literal('stopListening'),
    params: zod_1.z.object({
        correlationId: zod_1.z.string(),
    }),
});
exports.GetHistoryCommandSchema = zod_1.z.object({
    command: zod_1.z.literal('getHistory'),
    params: zod_1.z.object({
        limit: zod_1.z.number().optional().default(100),
        offset: zod_1.z.number().optional().default(0),
    }),
});
exports.GetFullHistoryCommandSchema = zod_1.z.object({
    command: zod_1.z.literal('getFullHistory'),
    params: zod_1.z.object({}),
});
exports.ClearHistoryCommandSchema = zod_1.z.object({
    command: zod_1.z.literal('clearHistory'),
    params: zod_1.z.object({}),
});
exports.GenerateVocabularyCommandSchema = zod_1.z.object({
    command: zod_1.z.literal('generateVocabulary'),
    params: zod_1.z.object({
        correlationId: zod_1.z.string(),
    }),
});
exports.GenerateFinalReportCommandSchema = zod_1.z.object({
    command: zod_1.z.literal('generateFinalReport'),
    params: zod_1.z.object({
        correlationId: zod_1.z.string(),
    }),
});
exports.GetAvailableSessionsCommandSchema = zod_1.z.object({
    command: zod_1.z.literal('getAvailableSessions'),
    params: zod_1.z.object({
        courseName: zod_1.z.string().optional(),
        limit: zod_1.z.number().optional().default(20),
    }),
});
exports.LoadSessionCommandSchema = zod_1.z.object({
    command: zod_1.z.literal('loadSession'),
    params: zod_1.z.object({
        courseName: zod_1.z.string(),
        dateStr: zod_1.z.string(),
        sessionNumber: zod_1.z.number(),
    }),
});
exports.IPCCommandSchema = zod_1.z.discriminatedUnion('command', [
    exports.StartListeningCommandSchema,
    exports.StopListeningCommandSchema,
    exports.GetHistoryCommandSchema,
    exports.GetFullHistoryCommandSchema,
    exports.ClearHistoryCommandSchema,
    exports.GenerateVocabularyCommandSchema,
    exports.GenerateFinalReportCommandSchema,
    exports.GetAvailableSessionsCommandSchema,
    exports.LoadSessionCommandSchema,
]);
// ========================================
// Validation Helpers
// ========================================
const validatePipelineEvent = (data) => {
    return exports.PipelineEventSchema.parse(data);
};
exports.validatePipelineEvent = validatePipelineEvent;
const validateIPCCommand = (data) => {
    return exports.IPCCommandSchema.parse(data);
};
exports.validateIPCCommand = validateIPCCommand;
// ========================================
// Event Factory Functions
// ========================================
const createASREvent = (data, correlationId) => ({
    type: 'asr',
    timestamp: Date.now(),
    correlationId,
    data,
});
exports.createASREvent = createASREvent;
const createTranslationEvent = (data, correlationId) => ({
    type: 'translation',
    timestamp: Date.now(),
    correlationId,
    data,
});
exports.createTranslationEvent = createTranslationEvent;
const createSegmentEvent = (data, correlationId) => ({
    type: 'segment',
    timestamp: Date.now(),
    correlationId,
    data,
});
exports.createSegmentEvent = createSegmentEvent;
const createErrorEvent = (data, correlationId) => ({
    type: 'error',
    timestamp: Date.now(),
    correlationId,
    data,
});
exports.createErrorEvent = createErrorEvent;
const createStatusEvent = (data, correlationId) => ({
    type: 'status',
    timestamp: Date.now(),
    correlationId,
    data,
});
exports.createStatusEvent = createStatusEvent;
const createVocabularyEvent = (data, correlationId) => ({
    type: 'vocabulary',
    timestamp: Date.now(),
    correlationId,
    data,
});
exports.createVocabularyEvent = createVocabularyEvent;
const createFinalReportEvent = (data, correlationId) => ({
    type: 'finalReport',
    timestamp: Date.now(),
    correlationId,
    data,
});
exports.createFinalReportEvent = createFinalReportEvent;
/**
 * Progressive Summary Event Factory
 */
const createProgressiveSummaryEvent = (data, correlationId) => ({
    type: 'progressiveSummary',
    timestamp: Date.now(),
    correlationId,
    data,
});
exports.createProgressiveSummaryEvent = createProgressiveSummaryEvent;
/**
 * 【Phase 2-1】CombinedSentenceEventのファクトリー関数
 */
const createCombinedSentenceEvent = (data, correlationId) => ({
    type: 'combinedSentence',
    timestamp: Date.now(),
    correlationId,
    data,
});
exports.createCombinedSentenceEvent = createCombinedSentenceEvent;
/**
 * 【Phase 2-ParagraphBuilder】ParagraphCompleteEventのファクトリー関数
 */
const createParagraphCompleteEvent = (data, correlationId) => ({
    type: 'paragraphComplete',
    timestamp: Date.now(),
    correlationId,
    data,
});
exports.createParagraphCompleteEvent = createParagraphCompleteEvent;
