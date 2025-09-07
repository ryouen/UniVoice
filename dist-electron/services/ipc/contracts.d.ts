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
    timestamp: number;
    data: {
        text: string;
        confidence: number;
        isFinal: boolean;
        segmentId?: string | undefined;
        language?: string | undefined;
    };
}, {
    type: "asr";
    correlationId: string;
    timestamp: number;
    data: {
        text: string;
        confidence: number;
        isFinal: boolean;
        segmentId?: string | undefined;
        language?: string | undefined;
    };
}>;
/**
 * Translation Events
 */
export declare const TranslationEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"translation">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        originalText: z.ZodString;
        translatedText: z.ZodString;
        sourceLanguage: z.ZodString;
        targetLanguage: z.ZodString;
        confidence: z.ZodNumber;
        isFinal: z.ZodBoolean;
        segmentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        isFinal: boolean;
        originalText: string;
        translatedText: string;
        sourceLanguage: string;
        targetLanguage: string;
        segmentId?: string | undefined;
    }, {
        confidence: number;
        isFinal: boolean;
        originalText: string;
        translatedText: string;
        sourceLanguage: string;
        targetLanguage: string;
        segmentId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "translation";
    correlationId: string;
    timestamp: number;
    data: {
        confidence: number;
        isFinal: boolean;
        originalText: string;
        translatedText: string;
        sourceLanguage: string;
        targetLanguage: string;
        segmentId?: string | undefined;
    };
}, {
    type: "translation";
    correlationId: string;
    timestamp: number;
    data: {
        confidence: number;
        isFinal: boolean;
        originalText: string;
        translatedText: string;
        sourceLanguage: string;
        targetLanguage: string;
        segmentId?: string | undefined;
    };
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
    timestamp: number;
    data: {
        status: "error" | "completed" | "processing";
        text: string;
        segmentId: string;
        metadata?: Record<string, unknown> | undefined;
        translation?: string | undefined;
    };
}, {
    type: "segment";
    correlationId: string;
    timestamp: number;
    data: {
        status: "error" | "completed" | "processing";
        text: string;
        segmentId: string;
        metadata?: Record<string, unknown> | undefined;
        translation?: string | undefined;
    };
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
    timestamp: number;
    data: {
        message: string;
        code: string;
        recoverable: boolean;
        details?: Record<string, unknown> | undefined;
    };
}, {
    type: "error";
    correlationId: string;
    timestamp: number;
    data: {
        message: string;
        code: string;
        recoverable: boolean;
        details?: Record<string, unknown> | undefined;
    };
}>;
/**
 * Summary Events
 */
export declare const SummaryEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"summary">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        english: z.ZodString;
        japanese: z.ZodString;
        wordCount: z.ZodOptional<z.ZodNumber>;
        startTime: z.ZodOptional<z.ZodNumber>;
        endTime: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        english: string;
        japanese: string;
        wordCount?: number | undefined;
        startTime?: number | undefined;
        endTime?: number | undefined;
    }, {
        english: string;
        japanese: string;
        wordCount?: number | undefined;
        startTime?: number | undefined;
        endTime?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "summary";
    correlationId: string;
    timestamp: number;
    data: {
        english: string;
        japanese: string;
        wordCount?: number | undefined;
        startTime?: number | undefined;
        endTime?: number | undefined;
    };
}, {
    type: "summary";
    correlationId: string;
    timestamp: number;
    data: {
        english: string;
        japanese: string;
        wordCount?: number | undefined;
        startTime?: number | undefined;
        endTime?: number | undefined;
    };
}>;
/**
 * Progressive Summary Events (word count based)
 */
export declare const ProgressiveSummaryEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"progressiveSummary">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        english: z.ZodString;
        japanese: z.ZodString;
        wordCount: z.ZodNumber;
        threshold: z.ZodNumber;
        startTime: z.ZodOptional<z.ZodNumber>;
        endTime: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        threshold: number;
        wordCount: number;
        english: string;
        japanese: string;
        startTime?: number | undefined;
        endTime?: number | undefined;
    }, {
        threshold: number;
        wordCount: number;
        english: string;
        japanese: string;
        startTime?: number | undefined;
        endTime?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "progressiveSummary";
    correlationId: string;
    timestamp: number;
    data: {
        threshold: number;
        wordCount: number;
        english: string;
        japanese: string;
        startTime?: number | undefined;
        endTime?: number | undefined;
    };
}, {
    type: "progressiveSummary";
    correlationId: string;
    timestamp: number;
    data: {
        threshold: number;
        wordCount: number;
        english: string;
        japanese: string;
        startTime?: number | undefined;
        endTime?: number | undefined;
    };
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
    timestamp: number;
    data: {
        state: "error" | "processing" | "idle" | "starting" | "listening" | "stopping" | "paused";
        details?: Record<string, unknown> | undefined;
    };
}, {
    type: "status";
    correlationId: string;
    timestamp: number;
    data: {
        state: "error" | "processing" | "idle" | "starting" | "listening" | "stopping" | "paused";
        details?: Record<string, unknown> | undefined;
    };
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
    timestamp: number;
    data: {
        items: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[];
        totalTerms: number;
    };
}, {
    type: "vocabulary";
    correlationId: string;
    timestamp: number;
    data: {
        items: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[];
        totalTerms: number;
    };
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
        totalWordCount: number;
        summaryCount: number;
        vocabularyCount: number;
    }, {
        report: string;
        totalWordCount: number;
        summaryCount: number;
        vocabularyCount: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "finalReport";
    correlationId: string;
    timestamp: number;
    data: {
        report: string;
        totalWordCount: number;
        summaryCount: number;
        vocabularyCount: number;
    };
}, {
    type: "finalReport";
    correlationId: string;
    timestamp: number;
    data: {
        report: string;
        totalWordCount: number;
        summaryCount: number;
        vocabularyCount: number;
    };
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
        originalText: z.ZodString;
        timestamp: z.ZodNumber;
        endTimestamp: z.ZodNumber;
        segmentCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        timestamp: number;
        originalText: string;
        combinedId: string;
        segmentIds: string[];
        endTimestamp: number;
        segmentCount: number;
    }, {
        timestamp: number;
        originalText: string;
        combinedId: string;
        segmentIds: string[];
        endTimestamp: number;
        segmentCount: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "combinedSentence";
    correlationId: string;
    timestamp: number;
    data: {
        timestamp: number;
        originalText: string;
        combinedId: string;
        segmentIds: string[];
        endTimestamp: number;
        segmentCount: number;
    };
}, {
    type: "combinedSentence";
    correlationId: string;
    timestamp: number;
    data: {
        timestamp: number;
        originalText: string;
        combinedId: string;
        segmentIds: string[];
        endTimestamp: number;
        segmentCount: number;
    };
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
        wordCount: number;
        startTime: number;
        endTime: number;
        segmentIds: string[];
        paragraphId: string;
        rawText: string;
        duration: number;
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
        wordCount: number;
        startTime: number;
        endTime: number;
        segmentIds: string[];
        paragraphId: string;
        rawText: string;
        duration: number;
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
    timestamp: number;
    data: {
        wordCount: number;
        startTime: number;
        endTime: number;
        segmentIds: string[];
        paragraphId: string;
        rawText: string;
        duration: number;
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
}, {
    type: "paragraphComplete";
    correlationId: string;
    timestamp: number;
    data: {
        wordCount: number;
        startTime: number;
        endTime: number;
        segmentIds: string[];
        paragraphId: string;
        rawText: string;
        duration: number;
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
    timestamp: number;
    data: {
        text: string;
        confidence: number;
        isFinal: boolean;
        segmentId?: string | undefined;
        language?: string | undefined;
    };
}, {
    type: "asr";
    correlationId: string;
    timestamp: number;
    data: {
        text: string;
        confidence: number;
        isFinal: boolean;
        segmentId?: string | undefined;
        language?: string | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"translation">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        originalText: z.ZodString;
        translatedText: z.ZodString;
        sourceLanguage: z.ZodString;
        targetLanguage: z.ZodString;
        confidence: z.ZodNumber;
        isFinal: z.ZodBoolean;
        segmentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        isFinal: boolean;
        originalText: string;
        translatedText: string;
        sourceLanguage: string;
        targetLanguage: string;
        segmentId?: string | undefined;
    }, {
        confidence: number;
        isFinal: boolean;
        originalText: string;
        translatedText: string;
        sourceLanguage: string;
        targetLanguage: string;
        segmentId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "translation";
    correlationId: string;
    timestamp: number;
    data: {
        confidence: number;
        isFinal: boolean;
        originalText: string;
        translatedText: string;
        sourceLanguage: string;
        targetLanguage: string;
        segmentId?: string | undefined;
    };
}, {
    type: "translation";
    correlationId: string;
    timestamp: number;
    data: {
        confidence: number;
        isFinal: boolean;
        originalText: string;
        translatedText: string;
        sourceLanguage: string;
        targetLanguage: string;
        segmentId?: string | undefined;
    };
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
    timestamp: number;
    data: {
        status: "error" | "completed" | "processing";
        text: string;
        segmentId: string;
        metadata?: Record<string, unknown> | undefined;
        translation?: string | undefined;
    };
}, {
    type: "segment";
    correlationId: string;
    timestamp: number;
    data: {
        status: "error" | "completed" | "processing";
        text: string;
        segmentId: string;
        metadata?: Record<string, unknown> | undefined;
        translation?: string | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"summary">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        english: z.ZodString;
        japanese: z.ZodString;
        wordCount: z.ZodOptional<z.ZodNumber>;
        startTime: z.ZodOptional<z.ZodNumber>;
        endTime: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        english: string;
        japanese: string;
        wordCount?: number | undefined;
        startTime?: number | undefined;
        endTime?: number | undefined;
    }, {
        english: string;
        japanese: string;
        wordCount?: number | undefined;
        startTime?: number | undefined;
        endTime?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "summary";
    correlationId: string;
    timestamp: number;
    data: {
        english: string;
        japanese: string;
        wordCount?: number | undefined;
        startTime?: number | undefined;
        endTime?: number | undefined;
    };
}, {
    type: "summary";
    correlationId: string;
    timestamp: number;
    data: {
        english: string;
        japanese: string;
        wordCount?: number | undefined;
        startTime?: number | undefined;
        endTime?: number | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"progressiveSummary">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        english: z.ZodString;
        japanese: z.ZodString;
        wordCount: z.ZodNumber;
        threshold: z.ZodNumber;
        startTime: z.ZodOptional<z.ZodNumber>;
        endTime: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        threshold: number;
        wordCount: number;
        english: string;
        japanese: string;
        startTime?: number | undefined;
        endTime?: number | undefined;
    }, {
        threshold: number;
        wordCount: number;
        english: string;
        japanese: string;
        startTime?: number | undefined;
        endTime?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "progressiveSummary";
    correlationId: string;
    timestamp: number;
    data: {
        threshold: number;
        wordCount: number;
        english: string;
        japanese: string;
        startTime?: number | undefined;
        endTime?: number | undefined;
    };
}, {
    type: "progressiveSummary";
    correlationId: string;
    timestamp: number;
    data: {
        threshold: number;
        wordCount: number;
        english: string;
        japanese: string;
        startTime?: number | undefined;
        endTime?: number | undefined;
    };
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
    timestamp: number;
    data: {
        message: string;
        code: string;
        recoverable: boolean;
        details?: Record<string, unknown> | undefined;
    };
}, {
    type: "error";
    correlationId: string;
    timestamp: number;
    data: {
        message: string;
        code: string;
        recoverable: boolean;
        details?: Record<string, unknown> | undefined;
    };
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
    timestamp: number;
    data: {
        state: "error" | "processing" | "idle" | "starting" | "listening" | "stopping" | "paused";
        details?: Record<string, unknown> | undefined;
    };
}, {
    type: "status";
    correlationId: string;
    timestamp: number;
    data: {
        state: "error" | "processing" | "idle" | "starting" | "listening" | "stopping" | "paused";
        details?: Record<string, unknown> | undefined;
    };
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
    timestamp: number;
    data: {
        items: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[];
        totalTerms: number;
    };
}, {
    type: "vocabulary";
    correlationId: string;
    timestamp: number;
    data: {
        items: {
            term: string;
            definition: string;
            context?: string | undefined;
        }[];
        totalTerms: number;
    };
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
        totalWordCount: number;
        summaryCount: number;
        vocabularyCount: number;
    }, {
        report: string;
        totalWordCount: number;
        summaryCount: number;
        vocabularyCount: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "finalReport";
    correlationId: string;
    timestamp: number;
    data: {
        report: string;
        totalWordCount: number;
        summaryCount: number;
        vocabularyCount: number;
    };
}, {
    type: "finalReport";
    correlationId: string;
    timestamp: number;
    data: {
        report: string;
        totalWordCount: number;
        summaryCount: number;
        vocabularyCount: number;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"combinedSentence">;
    timestamp: z.ZodNumber;
    correlationId: z.ZodString;
    data: z.ZodObject<{
        combinedId: z.ZodString;
        segmentIds: z.ZodArray<z.ZodString, "many">;
        originalText: z.ZodString;
        timestamp: z.ZodNumber;
        endTimestamp: z.ZodNumber;
        segmentCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        timestamp: number;
        originalText: string;
        combinedId: string;
        segmentIds: string[];
        endTimestamp: number;
        segmentCount: number;
    }, {
        timestamp: number;
        originalText: string;
        combinedId: string;
        segmentIds: string[];
        endTimestamp: number;
        segmentCount: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "combinedSentence";
    correlationId: string;
    timestamp: number;
    data: {
        timestamp: number;
        originalText: string;
        combinedId: string;
        segmentIds: string[];
        endTimestamp: number;
        segmentCount: number;
    };
}, {
    type: "combinedSentence";
    correlationId: string;
    timestamp: number;
    data: {
        timestamp: number;
        originalText: string;
        combinedId: string;
        segmentIds: string[];
        endTimestamp: number;
        segmentCount: number;
    };
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
        wordCount: number;
        startTime: number;
        endTime: number;
        segmentIds: string[];
        paragraphId: string;
        rawText: string;
        duration: number;
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
        wordCount: number;
        startTime: number;
        endTime: number;
        segmentIds: string[];
        paragraphId: string;
        rawText: string;
        duration: number;
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
    timestamp: number;
    data: {
        wordCount: number;
        startTime: number;
        endTime: number;
        segmentIds: string[];
        paragraphId: string;
        rawText: string;
        duration: number;
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
}, {
    type: "paragraphComplete";
    correlationId: string;
    timestamp: number;
    data: {
        wordCount: number;
        startTime: number;
        endTime: number;
        segmentIds: string[];
        paragraphId: string;
        rawText: string;
        duration: number;
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
}>]>;
export type ASREvent = z.infer<typeof ASREventSchema>;
export type TranslationEvent = z.infer<typeof TranslationEventSchema>;
export type SegmentEvent = z.infer<typeof SegmentEventSchema>;
export type SummaryEvent = z.infer<typeof SummaryEventSchema>;
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
export type ClearHistoryCommand = z.infer<typeof ClearHistoryCommandSchema>;
export type GenerateVocabularyCommand = z.infer<typeof GenerateVocabularyCommandSchema>;
export type GenerateFinalReportCommand = z.infer<typeof GenerateFinalReportCommandSchema>;
export type GetAvailableSessionsCommand = z.infer<typeof GetAvailableSessionsCommandSchema>;
export type LoadSessionCommand = z.infer<typeof LoadSessionCommandSchema>;
export type IPCCommand = z.infer<typeof IPCCommandSchema>;
export declare const validatePipelineEvent: (data: unknown) => PipelineEvent;
export declare const validateIPCCommand: (data: unknown) => IPCCommand;
export declare const createASREvent: (data: ASREvent["data"], correlationId: string) => ASREvent;
export declare const createTranslationEvent: (data: TranslationEvent["data"], correlationId: string) => TranslationEvent;
export declare const createSegmentEvent: (data: SegmentEvent["data"], correlationId: string) => SegmentEvent;
export declare const createErrorEvent: (data: ErrorEvent["data"], correlationId: string) => ErrorEvent;
export declare const createSummaryEvent: (data: SummaryEvent["data"], correlationId: string) => SummaryEvent;
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
