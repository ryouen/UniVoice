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
        language?: string | undefined;
        segmentId?: string | undefined;
    }, {
        text: string;
        confidence: number;
        isFinal: boolean;
        language?: string | undefined;
        segmentId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "asr";
    timestamp: number;
    correlationId: string;
    data: {
        text: string;
        confidence: number;
        isFinal: boolean;
        language?: string | undefined;
        segmentId?: string | undefined;
    };
}, {
    type: "asr";
    timestamp: number;
    correlationId: string;
    data: {
        text: string;
        confidence: number;
        isFinal: boolean;
        language?: string | undefined;
        segmentId?: string | undefined;
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
    timestamp: number;
    correlationId: string;
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
    timestamp: number;
    correlationId: string;
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
        status: "processing" | "completed" | "error";
        text: string;
        segmentId: string;
        translation?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }, {
        status: "processing" | "completed" | "error";
        text: string;
        segmentId: string;
        translation?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "segment";
    timestamp: number;
    correlationId: string;
    data: {
        status: "processing" | "completed" | "error";
        text: string;
        segmentId: string;
        translation?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    };
}, {
    type: "segment";
    timestamp: number;
    correlationId: string;
    data: {
        status: "processing" | "completed" | "error";
        text: string;
        segmentId: string;
        translation?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
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
        code: string;
        message: string;
        recoverable: boolean;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        recoverable: boolean;
        details?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "error";
    timestamp: number;
    correlationId: string;
    data: {
        code: string;
        message: string;
        recoverable: boolean;
        details?: Record<string, unknown> | undefined;
    };
}, {
    type: "error";
    timestamp: number;
    correlationId: string;
    data: {
        code: string;
        message: string;
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
    timestamp: number;
    correlationId: string;
    data: {
        english: string;
        japanese: string;
        wordCount?: number | undefined;
        startTime?: number | undefined;
        endTime?: number | undefined;
    };
}, {
    type: "summary";
    timestamp: number;
    correlationId: string;
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
        english: string;
        japanese: string;
        wordCount: number;
        threshold: number;
        startTime?: number | undefined;
        endTime?: number | undefined;
    }, {
        english: string;
        japanese: string;
        wordCount: number;
        threshold: number;
        startTime?: number | undefined;
        endTime?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "progressiveSummary";
    timestamp: number;
    correlationId: string;
    data: {
        english: string;
        japanese: string;
        wordCount: number;
        threshold: number;
        startTime?: number | undefined;
        endTime?: number | undefined;
    };
}, {
    type: "progressiveSummary";
    timestamp: number;
    correlationId: string;
    data: {
        english: string;
        japanese: string;
        wordCount: number;
        threshold: number;
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
        state: "processing" | "error" | "idle" | "starting" | "listening" | "stopping" | "paused";
        details?: Record<string, unknown> | undefined;
    }, {
        state: "processing" | "error" | "idle" | "starting" | "listening" | "stopping" | "paused";
        details?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "status";
    timestamp: number;
    correlationId: string;
    data: {
        state: "processing" | "error" | "idle" | "starting" | "listening" | "stopping" | "paused";
        details?: Record<string, unknown> | undefined;
    };
}, {
    type: "status";
    timestamp: number;
    correlationId: string;
    data: {
        state: "processing" | "error" | "idle" | "starting" | "listening" | "stopping" | "paused";
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
    timestamp: number;
    correlationId: string;
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
    timestamp: number;
    correlationId: string;
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
    timestamp: number;
    correlationId: string;
    data: {
        report: string;
        totalWordCount: number;
        summaryCount: number;
        vocabularyCount: number;
    };
}, {
    type: "finalReport";
    timestamp: number;
    correlationId: string;
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
    timestamp: number;
    correlationId: string;
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
    timestamp: number;
    correlationId: string;
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
                timestamp: number;
                text: string;
                id: string;
            }, {
                timestamp: number;
                text: string;
                id: string;
            }>, "many">;
            startTime: z.ZodNumber;
            endTime: z.ZodNumber;
            rawText: z.ZodString;
            cleanedText: z.ZodOptional<z.ZodString>;
            translation: z.ZodOptional<z.ZodString>;
            status: z.ZodEnum<["collecting", "processing", "completed"]>;
        }, "strip", z.ZodTypeAny, {
            status: "processing" | "completed" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            id: string;
            segments: {
                timestamp: number;
                text: string;
                id: string;
            }[];
            translation?: string | undefined;
            cleanedText?: string | undefined;
        }, {
            status: "processing" | "completed" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            id: string;
            segments: {
                timestamp: number;
                text: string;
                id: string;
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
            status: "processing" | "completed" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            id: string;
            segments: {
                timestamp: number;
                text: string;
                id: string;
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
            status: "processing" | "completed" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            id: string;
            segments: {
                timestamp: number;
                text: string;
                id: string;
            }[];
            translation?: string | undefined;
            cleanedText?: string | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "paragraphComplete";
    timestamp: number;
    correlationId: string;
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
            status: "processing" | "completed" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            id: string;
            segments: {
                timestamp: number;
                text: string;
                id: string;
            }[];
            translation?: string | undefined;
            cleanedText?: string | undefined;
        } | undefined;
    };
}, {
    type: "paragraphComplete";
    timestamp: number;
    correlationId: string;
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
            status: "processing" | "completed" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            id: string;
            segments: {
                timestamp: number;
                text: string;
                id: string;
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
        language?: string | undefined;
        segmentId?: string | undefined;
    }, {
        text: string;
        confidence: number;
        isFinal: boolean;
        language?: string | undefined;
        segmentId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "asr";
    timestamp: number;
    correlationId: string;
    data: {
        text: string;
        confidence: number;
        isFinal: boolean;
        language?: string | undefined;
        segmentId?: string | undefined;
    };
}, {
    type: "asr";
    timestamp: number;
    correlationId: string;
    data: {
        text: string;
        confidence: number;
        isFinal: boolean;
        language?: string | undefined;
        segmentId?: string | undefined;
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
    timestamp: number;
    correlationId: string;
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
    timestamp: number;
    correlationId: string;
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
        status: "processing" | "completed" | "error";
        text: string;
        segmentId: string;
        translation?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }, {
        status: "processing" | "completed" | "error";
        text: string;
        segmentId: string;
        translation?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "segment";
    timestamp: number;
    correlationId: string;
    data: {
        status: "processing" | "completed" | "error";
        text: string;
        segmentId: string;
        translation?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    };
}, {
    type: "segment";
    timestamp: number;
    correlationId: string;
    data: {
        status: "processing" | "completed" | "error";
        text: string;
        segmentId: string;
        translation?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
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
    timestamp: number;
    correlationId: string;
    data: {
        english: string;
        japanese: string;
        wordCount?: number | undefined;
        startTime?: number | undefined;
        endTime?: number | undefined;
    };
}, {
    type: "summary";
    timestamp: number;
    correlationId: string;
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
        english: string;
        japanese: string;
        wordCount: number;
        threshold: number;
        startTime?: number | undefined;
        endTime?: number | undefined;
    }, {
        english: string;
        japanese: string;
        wordCount: number;
        threshold: number;
        startTime?: number | undefined;
        endTime?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "progressiveSummary";
    timestamp: number;
    correlationId: string;
    data: {
        english: string;
        japanese: string;
        wordCount: number;
        threshold: number;
        startTime?: number | undefined;
        endTime?: number | undefined;
    };
}, {
    type: "progressiveSummary";
    timestamp: number;
    correlationId: string;
    data: {
        english: string;
        japanese: string;
        wordCount: number;
        threshold: number;
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
        code: string;
        message: string;
        recoverable: boolean;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        recoverable: boolean;
        details?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "error";
    timestamp: number;
    correlationId: string;
    data: {
        code: string;
        message: string;
        recoverable: boolean;
        details?: Record<string, unknown> | undefined;
    };
}, {
    type: "error";
    timestamp: number;
    correlationId: string;
    data: {
        code: string;
        message: string;
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
        state: "processing" | "error" | "idle" | "starting" | "listening" | "stopping" | "paused";
        details?: Record<string, unknown> | undefined;
    }, {
        state: "processing" | "error" | "idle" | "starting" | "listening" | "stopping" | "paused";
        details?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "status";
    timestamp: number;
    correlationId: string;
    data: {
        state: "processing" | "error" | "idle" | "starting" | "listening" | "stopping" | "paused";
        details?: Record<string, unknown> | undefined;
    };
}, {
    type: "status";
    timestamp: number;
    correlationId: string;
    data: {
        state: "processing" | "error" | "idle" | "starting" | "listening" | "stopping" | "paused";
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
    timestamp: number;
    correlationId: string;
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
    timestamp: number;
    correlationId: string;
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
    timestamp: number;
    correlationId: string;
    data: {
        report: string;
        totalWordCount: number;
        summaryCount: number;
        vocabularyCount: number;
    };
}, {
    type: "finalReport";
    timestamp: number;
    correlationId: string;
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
    timestamp: number;
    correlationId: string;
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
    timestamp: number;
    correlationId: string;
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
                timestamp: number;
                text: string;
                id: string;
            }, {
                timestamp: number;
                text: string;
                id: string;
            }>, "many">;
            startTime: z.ZodNumber;
            endTime: z.ZodNumber;
            rawText: z.ZodString;
            cleanedText: z.ZodOptional<z.ZodString>;
            translation: z.ZodOptional<z.ZodString>;
            status: z.ZodEnum<["collecting", "processing", "completed"]>;
        }, "strip", z.ZodTypeAny, {
            status: "processing" | "completed" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            id: string;
            segments: {
                timestamp: number;
                text: string;
                id: string;
            }[];
            translation?: string | undefined;
            cleanedText?: string | undefined;
        }, {
            status: "processing" | "completed" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            id: string;
            segments: {
                timestamp: number;
                text: string;
                id: string;
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
            status: "processing" | "completed" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            id: string;
            segments: {
                timestamp: number;
                text: string;
                id: string;
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
            status: "processing" | "completed" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            id: string;
            segments: {
                timestamp: number;
                text: string;
                id: string;
            }[];
            translation?: string | undefined;
            cleanedText?: string | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "paragraphComplete";
    timestamp: number;
    correlationId: string;
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
            status: "processing" | "completed" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            id: string;
            segments: {
                timestamp: number;
                text: string;
                id: string;
            }[];
            translation?: string | undefined;
            cleanedText?: string | undefined;
        } | undefined;
    };
}, {
    type: "paragraphComplete";
    timestamp: number;
    correlationId: string;
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
            status: "processing" | "completed" | "collecting";
            startTime: number;
            endTime: number;
            rawText: string;
            id: string;
            segments: {
                timestamp: number;
                text: string;
                id: string;
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
    params: {
        correlationId: string;
        sourceLanguage: string;
        targetLanguage: string;
    };
    command: "startListening";
}, {
    params: {
        correlationId: string;
        sourceLanguage?: string | undefined;
        targetLanguage?: string | undefined;
    };
    command: "startListening";
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
    params: {
        correlationId: string;
    };
    command: "stopListening";
}, {
    params: {
        correlationId: string;
    };
    command: "stopListening";
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
    params: {
        limit: number;
        offset: number;
    };
    command: "getHistory";
}, {
    params: {
        limit?: number | undefined;
        offset?: number | undefined;
    };
    command: "getHistory";
}>;
export declare const ClearHistoryCommandSchema: z.ZodObject<{
    command: z.ZodLiteral<"clearHistory">;
    params: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
}, "strip", z.ZodTypeAny, {
    params: {};
    command: "clearHistory";
}, {
    params: {};
    command: "clearHistory";
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
    params: {
        correlationId: string;
    };
    command: "generateVocabulary";
}, {
    params: {
        correlationId: string;
    };
    command: "generateVocabulary";
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
    params: {
        correlationId: string;
    };
    command: "generateFinalReport";
}, {
    params: {
        correlationId: string;
    };
    command: "generateFinalReport";
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
        limit?: number | undefined;
        courseName?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        limit: number;
        courseName?: string | undefined;
    };
    command: "getAvailableSessions";
}, {
    params: {
        limit?: number | undefined;
        courseName?: string | undefined;
    };
    command: "getAvailableSessions";
}>;
export declare const LoadSessionCommandSchema: z.ZodObject<{
    command: z.ZodLiteral<"loadSession">;
    params: z.ZodObject<{
        courseName: z.ZodString;
        dateStr: z.ZodString;
        sessionNumber: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        courseName: string;
        dateStr: string;
        sessionNumber: number;
    }, {
        courseName: string;
        dateStr: string;
        sessionNumber: number;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        courseName: string;
        dateStr: string;
        sessionNumber: number;
    };
    command: "loadSession";
}, {
    params: {
        courseName: string;
        dateStr: string;
        sessionNumber: number;
    };
    command: "loadSession";
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
    params: {
        correlationId: string;
        sourceLanguage: string;
        targetLanguage: string;
    };
    command: "startListening";
}, {
    params: {
        correlationId: string;
        sourceLanguage?: string | undefined;
        targetLanguage?: string | undefined;
    };
    command: "startListening";
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
    params: {
        correlationId: string;
    };
    command: "stopListening";
}, {
    params: {
        correlationId: string;
    };
    command: "stopListening";
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
    params: {
        limit: number;
        offset: number;
    };
    command: "getHistory";
}, {
    params: {
        limit?: number | undefined;
        offset?: number | undefined;
    };
    command: "getHistory";
}>, z.ZodObject<{
    command: z.ZodLiteral<"clearHistory">;
    params: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
}, "strip", z.ZodTypeAny, {
    params: {};
    command: "clearHistory";
}, {
    params: {};
    command: "clearHistory";
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
    params: {
        correlationId: string;
    };
    command: "generateVocabulary";
}, {
    params: {
        correlationId: string;
    };
    command: "generateVocabulary";
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
    params: {
        correlationId: string;
    };
    command: "generateFinalReport";
}, {
    params: {
        correlationId: string;
    };
    command: "generateFinalReport";
}>, z.ZodObject<{
    command: z.ZodLiteral<"getAvailableSessions">;
    params: z.ZodObject<{
        courseName: z.ZodOptional<z.ZodString>;
        limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        courseName?: string | undefined;
    }, {
        limit?: number | undefined;
        courseName?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        limit: number;
        courseName?: string | undefined;
    };
    command: "getAvailableSessions";
}, {
    params: {
        limit?: number | undefined;
        courseName?: string | undefined;
    };
    command: "getAvailableSessions";
}>, z.ZodObject<{
    command: z.ZodLiteral<"loadSession">;
    params: z.ZodObject<{
        courseName: z.ZodString;
        dateStr: z.ZodString;
        sessionNumber: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        courseName: string;
        dateStr: string;
        sessionNumber: number;
    }, {
        courseName: string;
        dateStr: string;
        sessionNumber: number;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        courseName: string;
        dateStr: string;
        sessionNumber: number;
    };
    command: "loadSession";
}, {
    params: {
        courseName: string;
        dateStr: string;
        sessionNumber: number;
    };
    command: "loadSession";
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
