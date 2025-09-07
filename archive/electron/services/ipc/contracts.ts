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
    originalText: z.string(),
    translatedText: z.string(),
    sourceLanguage: z.string(),
    targetLanguage: z.string(),
    confidence: z.number().min(0).max(1),
    isFinal: z.boolean(),
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
 * Status Events
 */
export const StatusEventSchema = z.object({
  type: z.literal('status'),
  timestamp: z.number(),
  correlationId: z.string(),
  data: z.object({
    state: z.enum(['idle', 'listening', 'processing', 'error']),
    details: z.record(z.unknown()).optional(),
  }),
});

// ========================================
// Union Types
// ========================================

export const PipelineEventSchema = z.discriminatedUnion('type', [
  ASREventSchema,
  TranslationEventSchema,
  SegmentEventSchema,
  ErrorEventSchema,
  StatusEventSchema,
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

export const ClearHistoryCommandSchema = z.object({
  command: z.literal('clearHistory'),
  params: z.object({}),
});

export const IPCCommandSchema = z.discriminatedUnion('command', [
  StartListeningCommandSchema,
  StopListeningCommandSchema,
  GetHistoryCommandSchema,
  ClearHistoryCommandSchema,
]);

// ========================================
// Type Exports
// ========================================

export type ASREvent = z.infer<typeof ASREventSchema>;
export type TranslationEvent = z.infer<typeof TranslationEventSchema>;
export type SegmentEvent = z.infer<typeof SegmentEventSchema>;
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;
export type StatusEvent = z.infer<typeof StatusEventSchema>;
export type PipelineEvent = z.infer<typeof PipelineEventSchema>;

export type StartListeningCommand = z.infer<typeof StartListeningCommandSchema>;
export type StopListeningCommand = z.infer<typeof StopListeningCommandSchema>;
export type GetHistoryCommand = z.infer<typeof GetHistoryCommandSchema>;
export type ClearHistoryCommand = z.infer<typeof ClearHistoryCommandSchema>;
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