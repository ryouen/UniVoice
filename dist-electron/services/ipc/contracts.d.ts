import { z } from 'zod';
/**
 * ASR (Automatic Speech Recognition) Events
 */
export declare const ASREventSchema: z.ZodObject<{
    type: z.ZodLiteral<"asr">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        text: z.ZodString;
        confidence: z.ZodNumber;
        isFinal: z.ZodBoolean;
        language: z.ZodOptional<z.ZodString>;
        segmentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        confidence: number;
        isFinal: boolean;
        segmentId?: string | undefined;
        language?: string | undefined;
    }, {
        text: string;
        confidence: number;
        isFinal: boolean;
        segmentId?: string | undefined;
        language?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "asr";
    correlationId: string;
    data: {
        text: string;
        confidence: number;
        isFinal: boolean;
        segmentId?: string | undefined;
        language?: string | undefined;
    };
    timestamp: number;
}, {
    type: "asr";
    correlationId: string;
    data: {
        text: string;
        confidence: number;
        isFinal: boolean;
        segmentId?: string | undefined;
        language?: string | undefined;
    };
    timestamp: number;
}>;
/**
 * Translation Events
 */
export declare const TranslationEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"translation">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        sourceText: z.ZodString;
        targetText: z.ZodString;
        sourceLanguage: z.ZodString;
        targetLanguage: z.ZodString;
        confidence: z.ZodNumber;
        isFinal: z.ZodBoolean;
        segmentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sourceLanguage: string;
        targetLanguage: string;
        confidence: number;
        isFinal: boolean;
        sourceText: string;
        targetText: string;
        segmentId?: string | undefined;
    }, {
        sourceLanguage: string;
        targetLanguage: string;
        confidence: number;
        isFinal: boolean;
        sourceText: string;
        targetText: string;
        segmentId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "translation";
    correlationId: string;
    data: {
        sourceLanguage: string;
        targetLanguage: string;
        confidence: number;
        isFinal: boolean;
        sourceText: string;
        targetText: string;
        segmentId?: string | undefined;
    };
    timestamp: number;
}, {
    type: "translation";
    correlationId: string;
    data: {
        sourceLanguage: string;
        targetLanguage: string;
        confidence: number;
        isFinal: boolean;
        sourceText: string;
        targetText: string;
        segmentId?: string | undefined;
    };
    timestamp: number;
}>;
/**
 * Segment Management Events
 */
export declare const SegmentEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"segment">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        segmentId: z.ZodString;
        text: z.ZodString;
        translation: z.ZodOptional<z.ZodString>;
        status: z.ZodEnum<["processing", "completed", "error"]>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        status: "error" | "completed" | "processing";
        text: string;
        segmentId: string;
        metadata?: Record<string, unknown> | undefined;
        translation?: string | undefined;
    }, {
        status: "error" | "completed" | "processing";
        text: string;
        segmentId: string;
        metadata?: Record<string, unknown> | undefined;
        translation?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "segment";
    correlationId: string;
    data: {
        status: "error" | "completed" | "processing";
        text: string;
        segmentId: string;
        metadata?: Record<string, unknown> | undefined;
        translation?: string | undefined;
    };
    timestamp: number;
}, {
    type: "segment";
    correlationId: string;
    data: {
        status: "error" | "completed" | "processing";
        text: string;
        segmentId: string;
        metadata?: Record<string, unknown> | undefined;
        translation?: string | undefined;
    };
    timestamp: number;
}>;
/**
 * Error Events
 */
export declare const ErrorEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"error">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        recoverable: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        message: string;
        code: string;
        recoverable: boolean;
        details?: Record<string, unknown> | undefined;
    }, {
        message: string;
        code: string;
        recoverable: boolean;
        details?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "error";
    correlationId: string;
    data: {
        message: string;
        code: string;
        recoverable: boolean;
        details?: Record<string, unknown> | undefined;
    };
    timestamp: number;
}, {
    type: "error";
    correlationId: string;
    data: {
        message: string;
        code: string;
        recoverable: boolean;
        details?: Record<string, unknown> | undefined;
    };
    timestamp: number;
}>;
/**
 * Progressive Summary Events (word count based)
 */
export declare const ProgressiveSummaryEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"progressiveSummary">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        sourceText: z.ZodString;
        targetText: z.ZodString;
        sourceLanguage: z.ZodString;
        targetLanguage: z.ZodString;
        wordCount: z.ZodNumber;
        threshold: z.ZodNumber;
        startTime: z.ZodOptional<z.ZodNumber>;
        endTime: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        sourceLanguage: string;
        targetLanguage: string;
        wordCount: number;
        threshold: number;
        sourceText: string;
        targetText: string;
        startTime?: number | undefined;
        endTime?: number | undefined;
    }, {
        sourceLanguage: string;
        targetLanguage: string;
        wordCount: number;
        threshold: number;
        sourceText: string;
        targetText: string;
        startTime?: number | undefined;
        endTime?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "progressiveSummary";
    correlationId: string;
    data: {
        sourceLanguage: string;
        targetLanguage: string;
        wordCount: number;
        threshold: number;
        sourceText: string;
        targetText: string;
        startTime?: number | undefined;
        endTime?: number | undefined;
    };
    timestamp: number;
}, {
    type: "progressiveSummary";
    correlationId: string;
    data: {
        sourceLanguage: string;
        targetLanguage: string;
        wordCount: number;
        threshold: number;
        sourceText: string;
        targetText: string;
        startTime?: number | undefined;
        endTime?: number | undefined;
    };
    timestamp: number;
}>;
/**
 * Status Events
 */
export declare const StatusEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"status">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        state: z.ZodEnum<["idle", "starting", "listening", "processing", "stopping", "error", "paused"]>;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        state: "error" | "processing" | "idle" | "starting" | "listening" | "stopping" | "paused";
        details?: Record<string, unknown> | undefined;
    }, {
        state: "error" | "processing" | "idle" | "starting" | "listening" | "stopping" | "paused";
        details?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "status";
    correlationId: string;
    data: {
        state: "error" | "processing" | "idle" | "starting" | "listening" | "stopping" | "paused";
        details?: Record<string, unknown> | undefined;
    };
    timestamp: number;
}, {
    type: "status";
    correlationId: string;
    data: {
        state: "error" | "processing" | "idle" | "starting" | "listening" | "stopping" | "paused";
        details?: Record<string, unknown> | undefined;
    };
    timestamp: number;
}>;
/**
 * Vocabulary Events
 */
export declare const VocabularyEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"vocabulary">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            term: z.ZodString;
            definition: z.ZodString;
            context: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            term: string;
            definition: string;
            context?: string | undefined;
        }, {
            term: string;
            definition: string;
            context?: string | undefined;
        }>, "many">;
        totalTerms: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        items: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[];
        totalTerms: number;
    }, {
        items: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[];
        totalTerms: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "vocabulary";
    correlationId: string;
    data: {
        items: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[];
        totalTerms: number;
    };
    timestamp: number;
}, {
    type: "vocabulary";
    correlationId: string;
    data: {
        items: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[];
        totalTerms: number;
    };
    timestamp: number;
}>;
/**
 * Final Report Events
 */
export declare const FinalReportEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"finalReport">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        report: z.ZodString;
        totalWordCount: z.ZodNumber;
        summaryCount: z.ZodNumber;
        vocabularyCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        report: string;
        summaryCount: number;
        totalWordCount: number;
        vocabularyCount: number;
    }, {
        report: string;
        summaryCount: number;
        totalWordCount: number;
        vocabularyCount: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "finalReport";
    correlationId: string;
    data: {
        report: string;
        summaryCount: number;
        totalWordCount: number;
        vocabularyCount: number;
    };
    timestamp: number;
}, {
    type: "finalReport";
    correlationId: string;
    data: {
        report: string;
        summaryCount: number;
        totalWordCount: number;
        vocabularyCount: number;
    };
    timestamp: number;
}>;
/**
 * Combined Sentence Events
 * 【Phase 2-1】CombinedSentenceEventの定義
 * SentenceCombinerで結合された文の情報をフロントエンドに通知
 */
export declare const CombinedSentenceEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"combinedSentence">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        combinedId: z.ZodString;
        segmentIds: z.ZodArray<z.ZodString, "many">;
        sourceText: z.ZodString;
        timestamp: z.ZodNumber;
        endTimestamp: z.ZodNumber;
        segmentCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        timestamp: number;
        sourceText: string;
        combinedId: string;
        segmentIds: string[];
        endTimestamp: number;
        segmentCount: number;
    }, {
        timestamp: number;
        sourceText: string;
        combinedId: string;
        segmentIds: string[];
        endTimestamp: number;
        segmentCount: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "combinedSentence";
    correlationId: string;
    data: {
        timestamp: number;
        sourceText: string;
        combinedId: string;
        segmentIds: string[];
        endTimestamp: number;
        segmentCount: number;
    };
    timestamp: number;
}, {
    type: "combinedSentence";
    correlationId: string;
    data: {
        timestamp: number;
        sourceText: string;
        combinedId: string;
        segmentIds: string[];
        endTimestamp: number;
        segmentCount: number;
    };
    timestamp: number;
}>;
/**
 * Paragraph Complete Events
 * 【Phase 2-ParagraphBuilder】ParagraphCompleteEventの定義
 * ParagraphBuilderで結合されたパラグラフの情報をフロントエンドに通知
 */
export declare const ParagraphCompleteEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"paragraphComplete">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        paragraphId: z.ZodString;
        segmentIds: z.ZodArray<z.ZodString, "many">;
        rawText: z.ZodString;
        cleanedText: z.ZodOptional<z.ZodString>;
        startTime: z.ZodNumber;
        endTime: z.ZodNumber;
        duration: z.ZodNumber;
        wordCount: z.ZodNumber;
        paragraph: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            segments: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                text: z.ZodString;
                timestamp: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                id: string;
                text: string;
                timestamp: number;
            }, {
                id: string;
                text: string;
                timestamp: number;
            }>, "many">;
            startTime: z.ZodNumber;
            endTime: z.ZodNumber;
            rawText: z.ZodString;
            cleanedText: z.ZodOptional<z.ZodString>;
            translation: z.ZodOptional<z.ZodString>;
            status: z.ZodEnum<["collecting", "processing", "completed"]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            status: "completed" | "processing" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            segments: {
                id: string;
                text: string;
                timestamp: number;
            }[];
            translation?: string | undefined;
            cleanedText?: string | undefined;
        }, {
            id: string;
            status: "completed" | "processing" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            segments: {
                id: string;
                text: string;
                timestamp: number;
            }[];
            translation?: string | undefined;
            cleanedText?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        startTime: number;
        endTime: number;
        duration: number;
        wordCount: number;
        paragraphId: string;
        segmentIds: string[];
        rawText: string;
        cleanedText?: string | undefined;
        paragraph?: {
            id: string;
            status: "completed" | "processing" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            segments: {
                id: string;
                text: string;
                timestamp: number;
            }[];
            translation?: string | undefined;
            cleanedText?: string | undefined;
        } | undefined;
    }, {
        startTime: number;
        endTime: number;
        duration: number;
        wordCount: number;
        paragraphId: string;
        segmentIds: string[];
        rawText: string;
        cleanedText?: string | undefined;
        paragraph?: {
            id: string;
            status: "completed" | "processing" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            segments: {
                id: string;
                text: string;
                timestamp: number;
            }[];
            translation?: string | undefined;
            cleanedText?: string | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "paragraphComplete";
    correlationId: string;
    data: {
        startTime: number;
        endTime: number;
        duration: number;
        wordCount: number;
        paragraphId: string;
        segmentIds: string[];
        rawText: string;
        cleanedText?: string | undefined;
        paragraph?: {
            id: string;
            status: "completed" | "processing" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            segments: {
                id: string;
                text: string;
                timestamp: number;
            }[];
            translation?: string | undefined;
            cleanedText?: string | undefined;
        } | undefined;
    };
    timestamp: number;
}, {
    type: "paragraphComplete";
    correlationId: string;
    data: {
        startTime: number;
        endTime: number;
        duration: number;
        wordCount: number;
        paragraphId: string;
        segmentIds: string[];
        rawText: string;
        cleanedText?: string | undefined;
        paragraph?: {
            id: string;
            status: "completed" | "processing" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            segments: {
                id: string;
                text: string;
                timestamp: number;
            }[];
            translation?: string | undefined;
            cleanedText?: string | undefined;
        } | undefined;
    };
    timestamp: number;
}>;
export declare const PipelineEventSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"asr">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        text: z.ZodString;
        confidence: z.ZodNumber;
        isFinal: z.ZodBoolean;
        language: z.ZodOptional<z.ZodString>;
        segmentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        confidence: number;
        isFinal: boolean;
        segmentId?: string | undefined;
        language?: string | undefined;
    }, {
        text: string;
        confidence: number;
        isFinal: boolean;
        segmentId?: string | undefined;
        language?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "asr";
    correlationId: string;
    data: {
        text: string;
        confidence: number;
        isFinal: boolean;
        segmentId?: string | undefined;
        language?: string | undefined;
    };
    timestamp: number;
}, {
    type: "asr";
    correlationId: string;
    data: {
        text: string;
        confidence: number;
        isFinal: boolean;
        segmentId?: string | undefined;
        language?: string | undefined;
    };
    timestamp: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"translation">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        sourceText: z.ZodString;
        targetText: z.ZodString;
        sourceLanguage: z.ZodString;
        targetLanguage: z.ZodString;
        confidence: z.ZodNumber;
        isFinal: z.ZodBoolean;
        segmentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sourceLanguage: string;
        targetLanguage: string;
        confidence: number;
        isFinal: boolean;
        sourceText: string;
        targetText: string;
        segmentId?: string | undefined;
    }, {
        sourceLanguage: string;
        targetLanguage: string;
        confidence: number;
        isFinal: boolean;
        sourceText: string;
        targetText: string;
        segmentId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "translation";
    correlationId: string;
    data: {
        sourceLanguage: string;
        targetLanguage: string;
        confidence: number;
        isFinal: boolean;
        sourceText: string;
        targetText: string;
        segmentId?: string | undefined;
    };
    timestamp: number;
}, {
    type: "translation";
    correlationId: string;
    data: {
        sourceLanguage: string;
        targetLanguage: string;
        confidence: number;
        isFinal: boolean;
        sourceText: string;
        targetText: string;
        segmentId?: string | undefined;
    };
    timestamp: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"segment">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        segmentId: z.ZodString;
        text: z.ZodString;
        translation: z.ZodOptional<z.ZodString>;
        status: z.ZodEnum<["processing", "completed", "error"]>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        status: "error" | "completed" | "processing";
        text: string;
        segmentId: string;
        metadata?: Record<string, unknown> | undefined;
        translation?: string | undefined;
    }, {
        status: "error" | "completed" | "processing";
        text: string;
        segmentId: string;
        metadata?: Record<string, unknown> | undefined;
        translation?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "segment";
    correlationId: string;
    data: {
        status: "error" | "completed" | "processing";
        text: string;
        segmentId: string;
        metadata?: Record<string, unknown> | undefined;
        translation?: string | undefined;
    };
    timestamp: number;
}, {
    type: "segment";
    correlationId: string;
    data: {
        status: "error" | "completed" | "processing";
        text: string;
        segmentId: string;
        metadata?: Record<string, unknown> | undefined;
        translation?: string | undefined;
    };
    timestamp: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"progressiveSummary">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        sourceText: z.ZodString;
        targetText: z.ZodString;
        sourceLanguage: z.ZodString;
        targetLanguage: z.ZodString;
        wordCount: z.ZodNumber;
        threshold: z.ZodNumber;
        startTime: z.ZodOptional<z.ZodNumber>;
        endTime: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        sourceLanguage: string;
        targetLanguage: string;
        wordCount: number;
        threshold: number;
        sourceText: string;
        targetText: string;
        startTime?: number | undefined;
        endTime?: number | undefined;
    }, {
        sourceLanguage: string;
        targetLanguage: string;
        wordCount: number;
        threshold: number;
        sourceText: string;
        targetText: string;
        startTime?: number | undefined;
        endTime?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "progressiveSummary";
    correlationId: string;
    data: {
        sourceLanguage: string;
        targetLanguage: string;
        wordCount: number;
        threshold: number;
        sourceText: string;
        targetText: string;
        startTime?: number | undefined;
        endTime?: number | undefined;
    };
    timestamp: number;
}, {
    type: "progressiveSummary";
    correlationId: string;
    data: {
        sourceLanguage: string;
        targetLanguage: string;
        wordCount: number;
        threshold: number;
        sourceText: string;
        targetText: string;
        startTime?: number | undefined;
        endTime?: number | undefined;
    };
    timestamp: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"error">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        recoverable: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        message: string;
        code: string;
        recoverable: boolean;
        details?: Record<string, unknown> | undefined;
    }, {
        message: string;
        code: string;
        recoverable: boolean;
        details?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "error";
    correlationId: string;
    data: {
        message: string;
        code: string;
        recoverable: boolean;
        details?: Record<string, unknown> | undefined;
    };
    timestamp: number;
}, {
    type: "error";
    correlationId: string;
    data: {
        message: string;
        code: string;
        recoverable: boolean;
        details?: Record<string, unknown> | undefined;
    };
    timestamp: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"status">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        state: z.ZodEnum<["idle", "starting", "listening", "processing", "stopping", "error", "paused"]>;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        state: "error" | "processing" | "idle" | "starting" | "listening" | "stopping" | "paused";
        details?: Record<string, unknown> | undefined;
    }, {
        state: "error" | "processing" | "idle" | "starting" | "listening" | "stopping" | "paused";
        details?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "status";
    correlationId: string;
    data: {
        state: "error" | "processing" | "idle" | "starting" | "listening" | "stopping" | "paused";
        details?: Record<string, unknown> | undefined;
    };
    timestamp: number;
}, {
    type: "status";
    correlationId: string;
    data: {
        state: "error" | "processing" | "idle" | "starting" | "listening" | "stopping" | "paused";
        details?: Record<string, unknown> | undefined;
    };
    timestamp: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"vocabulary">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            term: z.ZodString;
            definition: z.ZodString;
            context: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            term: string;
            definition: string;
            context?: string | undefined;
        }, {
            term: string;
            definition: string;
            context?: string | undefined;
        }>, "many">;
        totalTerms: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        items: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[];
        totalTerms: number;
    }, {
        items: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[];
        totalTerms: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "vocabulary";
    correlationId: string;
    data: {
        items: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[];
        totalTerms: number;
    };
    timestamp: number;
}, {
    type: "vocabulary";
    correlationId: string;
    data: {
        items: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[];
        totalTerms: number;
    };
    timestamp: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"finalReport">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        report: z.ZodString;
        totalWordCount: z.ZodNumber;
        summaryCount: z.ZodNumber;
        vocabularyCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        report: string;
        summaryCount: number;
        totalWordCount: number;
        vocabularyCount: number;
    }, {
        report: string;
        summaryCount: number;
        totalWordCount: number;
        vocabularyCount: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "finalReport";
    correlationId: string;
    data: {
        report: string;
        summaryCount: number;
        totalWordCount: number;
        vocabularyCount: number;
    };
    timestamp: number;
}, {
    type: "finalReport";
    correlationId: string;
    data: {
        report: string;
        summaryCount: number;
        totalWordCount: number;
        vocabularyCount: number;
    };
    timestamp: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"combinedSentence">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        combinedId: z.ZodString;
        segmentIds: z.ZodArray<z.ZodString, "many">;
        sourceText: z.ZodString;
        timestamp: z.ZodNumber;
        endTimestamp: z.ZodNumber;
        segmentCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        timestamp: number;
        sourceText: string;
        combinedId: string;
        segmentIds: string[];
        endTimestamp: number;
        segmentCount: number;
    }, {
        timestamp: number;
        sourceText: string;
        combinedId: string;
        segmentIds: string[];
        endTimestamp: number;
        segmentCount: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "combinedSentence";
    correlationId: string;
    data: {
        timestamp: number;
        sourceText: string;
        combinedId: string;
        segmentIds: string[];
        endTimestamp: number;
        segmentCount: number;
    };
    timestamp: number;
}, {
    type: "combinedSentence";
    correlationId: string;
    data: {
        timestamp: number;
        sourceText: string;
        combinedId: string;
        segmentIds: string[];
        endTimestamp: number;
        segmentCount: number;
    };
    timestamp: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"paragraphComplete">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        paragraphId: z.ZodString;
        segmentIds: z.ZodArray<z.ZodString, "many">;
        rawText: z.ZodString;
        cleanedText: z.ZodOptional<z.ZodString>;
        startTime: z.ZodNumber;
        endTime: z.ZodNumber;
        duration: z.ZodNumber;
        wordCount: z.ZodNumber;
        paragraph: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            segments: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                text: z.ZodString;
                timestamp: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                id: string;
                text: string;
                timestamp: number;
            }, {
                id: string;
                text: string;
                timestamp: number;
            }>, "many">;
            startTime: z.ZodNumber;
            endTime: z.ZodNumber;
            rawText: z.ZodString;
            cleanedText: z.ZodOptional<z.ZodString>;
            translation: z.ZodOptional<z.ZodString>;
            status: z.ZodEnum<["collecting", "processing", "completed"]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            status: "completed" | "processing" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            segments: {
                id: string;
                text: string;
                timestamp: number;
            }[];
            translation?: string | undefined;
            cleanedText?: string | undefined;
        }, {
            id: string;
            status: "completed" | "processing" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            segments: {
                id: string;
                text: string;
                timestamp: number;
            }[];
            translation?: string | undefined;
            cleanedText?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        startTime: number;
        endTime: number;
        duration: number;
        wordCount: number;
        paragraphId: string;
        segmentIds: string[];
        rawText: string;
        cleanedText?: string | undefined;
        paragraph?: {
            id: string;
            status: "completed" | "processing" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            segments: {
                id: string;
                text: string;
                timestamp: number;
            }[];
            translation?: string | undefined;
            cleanedText?: string | undefined;
        } | undefined;
    }, {
        startTime: number;
        endTime: number;
        duration: number;
        wordCount: number;
        paragraphId: string;
        segmentIds: string[];
        rawText: string;
        cleanedText?: string | undefined;
        paragraph?: {
            id: string;
            status: "completed" | "processing" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            segments: {
                id: string;
                text: string;
                timestamp: number;
            }[];
            translation?: string | undefined;
            cleanedText?: string | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "paragraphComplete";
    correlationId: string;
    data: {
        startTime: number;
        endTime: number;
        duration: number;
        wordCount: number;
        paragraphId: string;
        segmentIds: string[];
        rawText: string;
        cleanedText?: string | undefined;
        paragraph?: {
            id: string;
            status: "completed" | "processing" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            segments: {
                id: string;
                text: string;
                timestamp: number;
            }[];
            translation?: string | undefined;
            cleanedText?: string | undefined;
        } | undefined;
    };
    timestamp: number;
}, {
    type: "paragraphComplete";
    correlationId: string;
    data: {
        startTime: number;
        endTime: number;
        duration: number;
        wordCount: number;
        paragraphId: string;
        segmentIds: string[];
        rawText: string;
        cleanedText?: string | undefined;
        paragraph?: {
            id: string;
            status: "completed" | "processing" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            segments: {
                id: string;
                text: string;
                timestamp: number;
            }[];
            translation?: string | undefined;
            cleanedText?: string | undefined;
        } | undefined;
    };
    timestamp: number;
}>]>;
export declare const StartListeningCommandSchema: z.ZodObject<{
    command: z.ZodLiteral<"startListening">;
    params: z.ZodObject<{
        sourceLanguage: z.ZodDefault<z.ZodString>;
        targetLanguage: z.ZodDefault<z.ZodString>;
        correlationId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        correlationId: string;
        sourceLanguage: string;
        targetLanguage: string;
    }, {
        correlationId: string;
        sourceLanguage?: string | undefined;
        targetLanguage?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "startListening";
    params: {
        correlationId: string;
        sourceLanguage: string;
        targetLanguage: string;
    };
}, {
    command: "startListening";
    params: {
        correlationId: string;
        sourceLanguage?: string | undefined;
        targetLanguage?: string | undefined;
    };
}>;
export declare const StopListeningCommandSchema: z.ZodObject<{
    command: z.ZodLiteral<"stopListening">;
    params: z.ZodObject<{
        correlationId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        correlationId: string;
    }, {
        correlationId: string;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "stopListening";
    params: {
        correlationId: string;
    };
}, {
    command: "stopListening";
    params: {
        correlationId: string;
    };
}>;
export declare const GetHistoryCommandSchema: z.ZodObject<{
    command: z.ZodLiteral<"getHistory">;
    params: z.ZodObject<{
        limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        offset: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        offset: number;
    }, {
        limit?: number | undefined;
        offset?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "getHistory";
    params: {
        limit: number;
        offset: number;
    };
}, {
    command: "getHistory";
    params: {
        limit?: number | undefined;
        offset?: number | undefined;
    };
}>;
export declare const GetFullHistoryCommandSchema: z.ZodObject<{
    command: z.ZodLiteral<"getFullHistory">;
    params: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
}, "strip", z.ZodTypeAny, {
    command: "getFullHistory";
    params: {};
}, {
    command: "getFullHistory";
    params: {};
}>;
export declare const ClearHistoryCommandSchema: z.ZodObject<{
    command: z.ZodLiteral<"clearHistory">;
    params: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
}, "strip", z.ZodTypeAny, {
    command: "clearHistory";
    params: {};
}, {
    command: "clearHistory";
    params: {};
}>;
export declare const GenerateVocabularyCommandSchema: z.ZodObject<{
    command: z.ZodLiteral<"generateVocabulary">;
    params: z.ZodObject<{
        correlationId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        correlationId: string;
    }, {
        correlationId: string;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "generateVocabulary";
    params: {
        correlationId: string;
    };
}, {
    command: "generateVocabulary";
    params: {
        correlationId: string;
    };
}>;
export declare const GenerateFinalReportCommandSchema: z.ZodObject<{
    command: z.ZodLiteral<"generateFinalReport">;
    params: z.ZodObject<{
        correlationId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        correlationId: string;
    }, {
        correlationId: string;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "generateFinalReport";
    params: {
        correlationId: string;
    };
}, {
    command: "generateFinalReport";
    params: {
        correlationId: string;
    };
}>;
export declare const TranslateParagraphCommandSchema: z.ZodObject<{
    command: z.ZodLiteral<"translateParagraph">;
    params: z.ZodObject<{
        paragraphId: z.ZodString;
        sourceText: z.ZodString;
        sourceLanguage: z.ZodDefault<z.ZodString>;
        targetLanguage: z.ZodDefault<z.ZodString>;
        correlationId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        correlationId: string;
        sourceLanguage: string;
        targetLanguage: string;
        paragraphId: string;
        sourceText: string;
    }, {
        correlationId: string;
        paragraphId: string;
        sourceText: string;
        sourceLanguage?: string | undefined;
        targetLanguage?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "translateParagraph";
    params: {
        correlationId: string;
        sourceLanguage: string;
        targetLanguage: string;
        paragraphId: string;
        sourceText: string;
    };
}, {
    command: "translateParagraph";
    params: {
        correlationId: string;
        paragraphId: string;
        sourceText: string;
        sourceLanguage?: string | undefined;
        targetLanguage?: string | undefined;
    };
}>;
export declare const GetAvailableSessionsCommandSchema: z.ZodObject<{
    command: z.ZodLiteral<"getAvailableSessions">;
    params: z.ZodObject<{
        courseName: z.ZodOptional<z.ZodString>;
        limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        courseName?: string | undefined;
    }, {
        courseName?: string | undefined;
        limit?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "getAvailableSessions";
    params: {
        limit: number;
        courseName?: string | undefined;
    };
}, {
    command: "getAvailableSessions";
    params: {
        courseName?: string | undefined;
        limit?: number | undefined;
    };
}>;
export declare const LoadSessionCommandSchema: z.ZodObject<{
    command: z.ZodLiteral<"loadSession">;
    params: z.ZodObject<{
        courseName: z.ZodString;
        dateStr: z.ZodString;
        sessionNumber: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        sessionNumber: number;
        courseName: string;
        dateStr: string;
    }, {
        sessionNumber: number;
        courseName: string;
        dateStr: string;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "loadSession";
    params: {
        sessionNumber: number;
        courseName: string;
        dateStr: string;
    };
}, {
    command: "loadSession";
    params: {
        sessionNumber: number;
        courseName: string;
        dateStr: string;
    };
}>;
export declare const StartSessionCommandSchema: z.ZodObject<{
    command: z.ZodLiteral<"startSession">;
    params: z.ZodObject<{
        courseName: z.ZodString;
        sourceLanguage: z.ZodString;
        targetLanguage: z.ZodString;
        sessionNumber: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        sourceLanguage: string;
        targetLanguage: string;
        courseName: string;
        sessionNumber?: number | undefined;
    }, {
        sourceLanguage: string;
        targetLanguage: string;
        courseName: string;
        sessionNumber?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "startSession";
    params: {
        sourceLanguage: string;
        targetLanguage: string;
        courseName: string;
        sessionNumber?: number | undefined;
    };
}, {
    command: "startSession";
    params: {
        sourceLanguage: string;
        targetLanguage: string;
        courseName: string;
        sessionNumber?: number | undefined;
    };
}>;
export declare const SaveHistoryBlockCommandSchema: z.ZodObject<{
    command: z.ZodLiteral<"saveHistoryBlock">;
    params: z.ZodObject<{
        block: z.ZodObject<{
            id: z.ZodString;
            sentences: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceText: z.ZodString;
                targetText: z.ZodString;
                timestamp: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                id: string;
                timestamp: number;
                sourceText: string;
                targetText: string;
            }, {
                id: string;
                timestamp: number;
                sourceText: string;
                targetText: string;
            }>, "many">;
            createdAt: z.ZodNumber;
            totalHeight: z.ZodNumber;
            isParagraph: z.ZodOptional<z.ZodBoolean>;
            paragraphId: z.ZodOptional<z.ZodString>;
            rawText: z.ZodOptional<z.ZodString>;
            duration: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            sentences: {
                id: string;
                timestamp: number;
                sourceText: string;
                targetText: string;
            }[];
            createdAt: number;
            totalHeight: number;
            duration?: number | undefined;
            paragraphId?: string | undefined;
            rawText?: string | undefined;
            isParagraph?: boolean | undefined;
        }, {
            id: string;
            sentences: {
                id: string;
                timestamp: number;
                sourceText: string;
                targetText: string;
            }[];
            createdAt: number;
            totalHeight: number;
            duration?: number | undefined;
            paragraphId?: string | undefined;
            rawText?: string | undefined;
            isParagraph?: boolean | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        block: {
            id: string;
            sentences: {
                id: string;
                timestamp: number;
                sourceText: string;
                targetText: string;
            }[];
            createdAt: number;
            totalHeight: number;
            duration?: number | undefined;
            paragraphId?: string | undefined;
            rawText?: string | undefined;
            isParagraph?: boolean | undefined;
        };
    }, {
        block: {
            id: string;
            sentences: {
                id: string;
                timestamp: number;
                sourceText: string;
                targetText: string;
            }[];
            createdAt: number;
            totalHeight: number;
            duration?: number | undefined;
            paragraphId?: string | undefined;
            rawText?: string | undefined;
            isParagraph?: boolean | undefined;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    command: "saveHistoryBlock";
    params: {
        block: {
            id: string;
            sentences: {
                id: string;
                timestamp: number;
                sourceText: string;
                targetText: string;
            }[];
            createdAt: number;
            totalHeight: number;
            duration?: number | undefined;
            paragraphId?: string | undefined;
            rawText?: string | undefined;
            isParagraph?: boolean | undefined;
        };
    };
}, {
    command: "saveHistoryBlock";
    params: {
        block: {
            id: string;
            sentences: {
                id: string;
                timestamp: number;
                sourceText: string;
                targetText: string;
            }[];
            createdAt: number;
            totalHeight: number;
            duration?: number | undefined;
            paragraphId?: string | undefined;
            rawText?: string | undefined;
            isParagraph?: boolean | undefined;
        };
    };
}>;
export declare const SaveSummaryCommandSchema: z.ZodObject<{
    command: z.ZodLiteral<"saveSummary">;
    params: z.ZodObject<{
        summary: z.ZodObject<{
            id: z.ZodString;
            sourceText: z.ZodString;
            targetText: z.ZodString;
            wordCount: z.ZodNumber;
            timestamp: z.ZodNumber;
            timeRange: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>]>>;
            threshold: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            wordCount: number;
            timestamp: number;
            sourceText: string;
            targetText: string;
            threshold?: number | undefined;
            timeRange?: string | {
                start: number;
                end: number;
            } | undefined;
        }, {
            id: string;
            wordCount: number;
            timestamp: number;
            sourceText: string;
            targetText: string;
            threshold?: number | undefined;
            timeRange?: string | {
                start: number;
                end: number;
            } | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        summary: {
            id: string;
            wordCount: number;
            timestamp: number;
            sourceText: string;
            targetText: string;
            threshold?: number | undefined;
            timeRange?: string | {
                start: number;
                end: number;
            } | undefined;
        };
    }, {
        summary: {
            id: string;
            wordCount: number;
            timestamp: number;
            sourceText: string;
            targetText: string;
            threshold?: number | undefined;
            timeRange?: string | {
                start: number;
                end: number;
            } | undefined;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    command: "saveSummary";
    params: {
        summary: {
            id: string;
            wordCount: number;
            timestamp: number;
            sourceText: string;
            targetText: string;
            threshold?: number | undefined;
            timeRange?: string | {
                start: number;
                end: number;
            } | undefined;
        };
    };
}, {
    command: "saveSummary";
    params: {
        summary: {
            id: string;
            wordCount: number;
            timestamp: number;
            sourceText: string;
            targetText: string;
            threshold?: number | undefined;
            timeRange?: string | {
                start: number;
                end: number;
            } | undefined;
        };
    };
}>;
export declare const SaveSessionCommandSchema: z.ZodObject<{
    command: z.ZodLiteral<"saveSession">;
    params: z.ZodObject<{
        finalReport: z.ZodOptional<z.ZodString>;
        vocabulary: z.ZodOptional<z.ZodArray<z.ZodObject<{
            term: z.ZodString;
            definition: z.ZodString;
            context: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            term: string;
            definition: string;
            context?: string | undefined;
        }, {
            term: string;
            definition: string;
            context?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        vocabulary?: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[] | undefined;
        finalReport?: string | undefined;
    }, {
        vocabulary?: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[] | undefined;
        finalReport?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "saveSession";
    params: {
        vocabulary?: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[] | undefined;
        finalReport?: string | undefined;
    };
}, {
    command: "saveSession";
    params: {
        vocabulary?: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[] | undefined;
        finalReport?: string | undefined;
    };
}>;
export declare const IPCCommandSchema: z.ZodDiscriminatedUnion<"command", [z.ZodObject<{
    command: z.ZodLiteral<"startListening">;
    params: z.ZodObject<{
        sourceLanguage: z.ZodDefault<z.ZodString>;
        targetLanguage: z.ZodDefault<z.ZodString>;
        correlationId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        correlationId: string;
        sourceLanguage: string;
        targetLanguage: string;
    }, {
        correlationId: string;
        sourceLanguage?: string | undefined;
        targetLanguage?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "startListening";
    params: {
        correlationId: string;
        sourceLanguage: string;
        targetLanguage: string;
    };
}, {
    command: "startListening";
    params: {
        correlationId: string;
        sourceLanguage?: string | undefined;
        targetLanguage?: string | undefined;
    };
}>, z.ZodObject<{
    command: z.ZodLiteral<"stopListening">;
    params: z.ZodObject<{
        correlationId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        correlationId: string;
    }, {
        correlationId: string;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "stopListening";
    params: {
        correlationId: string;
    };
}, {
    command: "stopListening";
    params: {
        correlationId: string;
    };
}>, z.ZodObject<{
    command: z.ZodLiteral<"getHistory">;
    params: z.ZodObject<{
        limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        offset: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        offset: number;
    }, {
        limit?: number | undefined;
        offset?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "getHistory";
    params: {
        limit: number;
        offset: number;
    };
}, {
    command: "getHistory";
    params: {
        limit?: number | undefined;
        offset?: number | undefined;
    };
}>, z.ZodObject<{
    command: z.ZodLiteral<"getFullHistory">;
    params: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
}, "strip", z.ZodTypeAny, {
    command: "getFullHistory";
    params: {};
}, {
    command: "getFullHistory";
    params: {};
}>, z.ZodObject<{
    command: z.ZodLiteral<"clearHistory">;
    params: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
}, "strip", z.ZodTypeAny, {
    command: "clearHistory";
    params: {};
}, {
    command: "clearHistory";
    params: {};
}>, z.ZodObject<{
    command: z.ZodLiteral<"generateVocabulary">;
    params: z.ZodObject<{
        correlationId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        correlationId: string;
    }, {
        correlationId: string;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "generateVocabulary";
    params: {
        correlationId: string;
    };
}, {
    command: "generateVocabulary";
    params: {
        correlationId: string;
    };
}>, z.ZodObject<{
    command: z.ZodLiteral<"generateFinalReport">;
    params: z.ZodObject<{
        correlationId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        correlationId: string;
    }, {
        correlationId: string;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "generateFinalReport";
    params: {
        correlationId: string;
    };
}, {
    command: "generateFinalReport";
    params: {
        correlationId: string;
    };
}>, z.ZodObject<{
    command: z.ZodLiteral<"translateParagraph">;
    params: z.ZodObject<{
        paragraphId: z.ZodString;
        sourceText: z.ZodString;
        sourceLanguage: z.ZodDefault<z.ZodString>;
        targetLanguage: z.ZodDefault<z.ZodString>;
        correlationId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        correlationId: string;
        sourceLanguage: string;
        targetLanguage: string;
        paragraphId: string;
        sourceText: string;
    }, {
        correlationId: string;
        paragraphId: string;
        sourceText: string;
        sourceLanguage?: string | undefined;
        targetLanguage?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "translateParagraph";
    params: {
        correlationId: string;
        sourceLanguage: string;
        targetLanguage: string;
        paragraphId: string;
        sourceText: string;
    };
}, {
    command: "translateParagraph";
    params: {
        correlationId: string;
        paragraphId: string;
        sourceText: string;
        sourceLanguage?: string | undefined;
        targetLanguage?: string | undefined;
    };
}>, z.ZodObject<{
    command: z.ZodLiteral<"getAvailableSessions">;
    params: z.ZodObject<{
        courseName: z.ZodOptional<z.ZodString>;
        limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        courseName?: string | undefined;
    }, {
        courseName?: string | undefined;
        limit?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "getAvailableSessions";
    params: {
        limit: number;
        courseName?: string | undefined;
    };
}, {
    command: "getAvailableSessions";
    params: {
        courseName?: string | undefined;
        limit?: number | undefined;
    };
}>, z.ZodObject<{
    command: z.ZodLiteral<"loadSession">;
    params: z.ZodObject<{
        courseName: z.ZodString;
        dateStr: z.ZodString;
        sessionNumber: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        sessionNumber: number;
        courseName: string;
        dateStr: string;
    }, {
        sessionNumber: number;
        courseName: string;
        dateStr: string;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "loadSession";
    params: {
        sessionNumber: number;
        courseName: string;
        dateStr: string;
    };
}, {
    command: "loadSession";
    params: {
        sessionNumber: number;
        courseName: string;
        dateStr: string;
    };
}>, z.ZodObject<{
    command: z.ZodLiteral<"startSession">;
    params: z.ZodObject<{
        courseName: z.ZodString;
        sourceLanguage: z.ZodString;
        targetLanguage: z.ZodString;
        sessionNumber: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        sourceLanguage: string;
        targetLanguage: string;
        courseName: string;
        sessionNumber?: number | undefined;
    }, {
        sourceLanguage: string;
        targetLanguage: string;
        courseName: string;
        sessionNumber?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "startSession";
    params: {
        sourceLanguage: string;
        targetLanguage: string;
        courseName: string;
        sessionNumber?: number | undefined;
    };
}, {
    command: "startSession";
    params: {
        sourceLanguage: string;
        targetLanguage: string;
        courseName: string;
        sessionNumber?: number | undefined;
    };
}>, z.ZodObject<{
    command: z.ZodLiteral<"saveHistoryBlock">;
    params: z.ZodObject<{
        block: z.ZodObject<{
            id: z.ZodString;
            sentences: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                sourceText: z.ZodString;
                targetText: z.ZodString;
                timestamp: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                id: string;
                timestamp: number;
                sourceText: string;
                targetText: string;
            }, {
                id: string;
                timestamp: number;
                sourceText: string;
                targetText: string;
            }>, "many">;
            createdAt: z.ZodNumber;
            totalHeight: z.ZodNumber;
            isParagraph: z.ZodOptional<z.ZodBoolean>;
            paragraphId: z.ZodOptional<z.ZodString>;
            rawText: z.ZodOptional<z.ZodString>;
            duration: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            sentences: {
                id: string;
                timestamp: number;
                sourceText: string;
                targetText: string;
            }[];
            createdAt: number;
            totalHeight: number;
            duration?: number | undefined;
            paragraphId?: string | undefined;
            rawText?: string | undefined;
            isParagraph?: boolean | undefined;
        }, {
            id: string;
            sentences: {
                id: string;
                timestamp: number;
                sourceText: string;
                targetText: string;
            }[];
            createdAt: number;
            totalHeight: number;
            duration?: number | undefined;
            paragraphId?: string | undefined;
            rawText?: string | undefined;
            isParagraph?: boolean | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        block: {
            id: string;
            sentences: {
                id: string;
                timestamp: number;
                sourceText: string;
                targetText: string;
            }[];
            createdAt: number;
            totalHeight: number;
            duration?: number | undefined;
            paragraphId?: string | undefined;
            rawText?: string | undefined;
            isParagraph?: boolean | undefined;
        };
    }, {
        block: {
            id: string;
            sentences: {
                id: string;
                timestamp: number;
                sourceText: string;
                targetText: string;
            }[];
            createdAt: number;
            totalHeight: number;
            duration?: number | undefined;
            paragraphId?: string | undefined;
            rawText?: string | undefined;
            isParagraph?: boolean | undefined;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    command: "saveHistoryBlock";
    params: {
        block: {
            id: string;
            sentences: {
                id: string;
                timestamp: number;
                sourceText: string;
                targetText: string;
            }[];
            createdAt: number;
            totalHeight: number;
            duration?: number | undefined;
            paragraphId?: string | undefined;
            rawText?: string | undefined;
            isParagraph?: boolean | undefined;
        };
    };
}, {
    command: "saveHistoryBlock";
    params: {
        block: {
            id: string;
            sentences: {
                id: string;
                timestamp: number;
                sourceText: string;
                targetText: string;
            }[];
            createdAt: number;
            totalHeight: number;
            duration?: number | undefined;
            paragraphId?: string | undefined;
            rawText?: string | undefined;
            isParagraph?: boolean | undefined;
        };
    };
}>, z.ZodObject<{
    command: z.ZodLiteral<"saveSummary">;
    params: z.ZodObject<{
        summary: z.ZodObject<{
            id: z.ZodString;
            sourceText: z.ZodString;
            targetText: z.ZodString;
            wordCount: z.ZodNumber;
            timestamp: z.ZodNumber;
            timeRange: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
                start: z.ZodNumber;
                end: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start: number;
                end: number;
            }, {
                start: number;
                end: number;
            }>]>>;
            threshold: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            wordCount: number;
            timestamp: number;
            sourceText: string;
            targetText: string;
            threshold?: number | undefined;
            timeRange?: string | {
                start: number;
                end: number;
            } | undefined;
        }, {
            id: string;
            wordCount: number;
            timestamp: number;
            sourceText: string;
            targetText: string;
            threshold?: number | undefined;
            timeRange?: string | {
                start: number;
                end: number;
            } | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        summary: {
            id: string;
            wordCount: number;
            timestamp: number;
            sourceText: string;
            targetText: string;
            threshold?: number | undefined;
            timeRange?: string | {
                start: number;
                end: number;
            } | undefined;
        };
    }, {
        summary: {
            id: string;
            wordCount: number;
            timestamp: number;
            sourceText: string;
            targetText: string;
            threshold?: number | undefined;
            timeRange?: string | {
                start: number;
                end: number;
            } | undefined;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    command: "saveSummary";
    params: {
        summary: {
            id: string;
            wordCount: number;
            timestamp: number;
            sourceText: string;
            targetText: string;
            threshold?: number | undefined;
            timeRange?: string | {
                start: number;
                end: number;
            } | undefined;
        };
    };
}, {
    command: "saveSummary";
    params: {
        summary: {
            id: string;
            wordCount: number;
            timestamp: number;
            sourceText: string;
            targetText: string;
            threshold?: number | undefined;
            timeRange?: string | {
                start: number;
                end: number;
            } | undefined;
        };
    };
}>, z.ZodObject<{
    command: z.ZodLiteral<"saveSession">;
    params: z.ZodObject<{
        finalReport: z.ZodOptional<z.ZodString>;
        vocabulary: z.ZodOptional<z.ZodArray<z.ZodObject<{
            term: z.ZodString;
            definition: z.ZodString;
            context: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            term: string;
            definition: string;
            context?: string | undefined;
        }, {
            term: string;
            definition: string;
            context?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        vocabulary?: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[] | undefined;
        finalReport?: string | undefined;
    }, {
        vocabulary?: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[] | undefined;
        finalReport?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    command: "saveSession";
    params: {
        vocabulary?: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[] | undefined;
        finalReport?: string | undefined;
    };
}, {
    command: "saveSession";
    params: {
        vocabulary?: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[] | undefined;
        finalReport?: string | undefined;
    };
}>]>;
export type ASREvent = z.infer<typeof ASREventSchema>;
export type TranslationEvent = z.infer<typeof TranslationEventSchema>;
export type SegmentEvent = z.infer<typeof SegmentEventSchema>;
export type ProgressiveSummaryEvent = z.infer<typeof ProgressiveSummaryEventSchema>;
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;
export type StatusEvent = z.infer<typeof StatusEventSchema>;
export type VocabularyEvent = z.infer<typeof VocabularyEventSchema>;
export type FinalReportEvent = z.infer<typeof FinalReportEventSchema>;
export type CombinedSentenceEvent = z.infer<typeof CombinedSentenceEventSchema>;
export type ParagraphCompleteEvent = z.infer<typeof ParagraphCompleteEventSchema>;
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
export type StartSessionCommand = z.infer<typeof StartSessionCommandSchema>;
export type SaveHistoryBlockCommand = z.infer<typeof SaveHistoryBlockCommandSchema>;
export type SaveSummaryCommand = z.infer<typeof SaveSummaryCommandSchema>;
export type SaveSessionCommand = z.infer<typeof SaveSessionCommandSchema>;
export type TranslateParagraphCommand = z.infer<typeof TranslateParagraphCommandSchema>;
export type IPCCommand = z.infer<typeof IPCCommandSchema>;
export declare const validatePipelineEvent: (data: unknown) => PipelineEvent;
export declare const validateIPCCommand: (data: unknown) => IPCCommand;
export declare const createASREvent: (data: ASREvent["data"], correlationId: string) => ASREvent;
export declare const createTranslationEvent: (data: TranslationEvent["data"], correlationId: string) => TranslationEvent;
export declare const createSegmentEvent: (data: SegmentEvent["data"], correlationId: string) => SegmentEvent;
export declare const createErrorEvent: (data: ErrorEvent["data"], correlationId: string) => ErrorEvent;
export declare const createStatusEvent: (data: StatusEvent["data"], correlationId: string) => StatusEvent;
export declare const createVocabularyEvent: (data: VocabularyEvent["data"], correlationId: string) => VocabularyEvent;
export declare const createFinalReportEvent: (data: FinalReportEvent["data"], correlationId: string) => FinalReportEvent;
/**
 * Progressive Summary Event Factory
 */
export declare const createProgressiveSummaryEvent: (data: ProgressiveSummaryEvent["data"], correlationId: string) => ProgressiveSummaryEvent;
/**
 * 【Phase 2-1】CombinedSentenceEventのファクトリー関数
 */
export declare const createCombinedSentenceEvent: (data: CombinedSentenceEvent["data"], correlationId: string) => CombinedSentenceEvent;
/**
 * 【Phase 2-ParagraphBuilder】ParagraphCompleteEventのファクトリー関数
 */
export declare const createParagraphCompleteEvent: (data: ParagraphCompleteEvent["data"], correlationId: string) => ParagraphCompleteEvent;
