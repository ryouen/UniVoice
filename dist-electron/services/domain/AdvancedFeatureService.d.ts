/**
 * AdvancedFeatureService - 高度な機能の実装
 *
 * - 定期要約（10分ごと）
 * - 語彙抽出
 * - 最終レポート生成
 */
import { EventEmitter } from 'events';
interface AdvancedFeatureConfig {
    openaiApiKey: string;
    summaryInterval?: number;
    summaryModel?: string;
    vocabularyModel?: string;
    reportModel?: string;
    summaryThresholds?: number[];
    maxTokens?: {
        summary?: number;
        vocabulary?: number;
        report?: number;
    };
    sourceLanguage?: string;
    targetLanguage?: string;
}
interface Translation {
    id: string;
    sourceText: string;
    targetText: string;
    timestamp: number;
}
interface Summary {
    id: string;
    timestamp: number;
    sourceText: string;
    targetText: string;
    wordCount: number;
    startTime: number;
    endTime: number;
}
interface VocabularyItem {
    term: string;
    definition: string;
    context?: string;
}
export declare class AdvancedFeatureService extends EventEmitter {
    private openai;
    private config;
    private summaryTimer;
    private translations;
    private summaries;
    private isActive;
    private currentCorrelationId;
    private componentLogger;
    private totalWordCount;
    private summaryThresholds;
    private reachedThresholds;
    private sourceLanguage;
    private targetLanguage;
    private lastProgressiveSummary;
    private lastProgressiveThresholdIndex;
    private isGeneratingProgressiveSummary;
    private progressiveSummaryQueue;
    constructor(config: AdvancedFeatureConfig);
    /**
     * STRUCTURAL FIX: Add a method to update languages without re-creating the instance.
     */
    updateLanguages(sourceLanguage: string, targetLanguage: string): void;
    /**
     * Start the advanced features service
     */
    start(correlationId: string, sourceLanguage?: string, targetLanguage?: string): void;
    /**
     * Stop the advanced features service
     */
    stop(): Promise<void>;
    /**
     * Add a translation for processing
     */
    addTranslation(translation: Translation): void;
    /**
     * Check if progressive summary thresholds are reached
     */
    private checkProgressiveSummaryThresholds;
    /**
     * Enqueue progressive summary generation
     */
    private enqueueProgressiveSummary;
    /**
     * Process progressive summary queue
     */
    private processProgressiveSummaryQueue;
    /**
     * Start periodic summary generation
     * @deprecated Disabled per user request - progressive summaries are used instead
     *
     * This method is kept for reference but is no longer used.
     * Progressive summaries at 400, 800*n word thresholds are used instead.
     */
    /**
     * Generate a summary of recent translations
     */
    generateSummary(isFinal?: boolean): Promise<void>;
    /**
     * Generate progressive summary at word count thresholds
     */
    generateProgressiveSummary(baseThreshold: number, actualThreshold: number): Promise<void>;
    /**
     * Generate vocabulary list from content
     */
    generateVocabulary(): Promise<VocabularyItem[]>;
    /**
     * Generate final report
     */
    generateFinalReport(): Promise<string>;
    private getLanguageName;
    private getSummarySystemPrompt;
    private getPeriodicSummaryPrompt;
    private getFinalSummaryPrompt;
    private getProgressiveSummaryPrompt;
    private getCumulativeProgressiveSummaryPrompt;
    private getVocabularySystemPrompt;
    private getVocabularyPrompt;
    private getFinalReportSystemPrompt;
    private getFinalReportPrompt;
    private translateToTargetLanguage;
    getSummaries(): Summary[];
    private isCharacterBasedLanguage;
    private countWords;
    /**
     * Get all translations for history window
     */
    getAllTranslations(): Translation[];
    destroy(): void;
}
export {};
