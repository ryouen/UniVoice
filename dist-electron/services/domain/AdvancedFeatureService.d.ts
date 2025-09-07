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
    original: string;
    translated: string;
    timestamp: number;
}
interface Summary {
    id: string;
    timestamp: number;
    english: string;
    japanese: string;
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
    constructor(config: AdvancedFeatureConfig);
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
     * Start periodic summary generation
     */
    private startPeriodicSummary;
    /**
     * Generate a summary of recent translations
     */
    generateSummary(isFinal?: boolean): Promise<void>;
    /**
     * Generate progressive summary at word count thresholds
     */
    generateProgressiveSummary(threshold: number): Promise<void>;
    /**
     * Generate vocabulary list from content
     */
    generateVocabulary(): Promise<VocabularyItem[]>;
    /**
     * Generate final report
     */
    generateFinalReport(): Promise<string>;
    /**
     * Get progressive summary prompt based on threshold
     */
    private getProgressiveSummaryPrompt;
    /**
     * Get periodic summary prompt
     */
    private getPeriodicSummaryPrompt;
    /**
     * Get final summary prompt
     */
    private getFinalSummaryPrompt;
    /**
     * Translate text to target language
     */
    private translateToTargetLanguage;
    /**
     * Get current summaries
     */
    getSummaries(): Summary[];
    /**
     * Get summary system prompt based on source language
     */
    private getSummarySystemPrompt;
    /**
     * Get translation system prompt
     */
    private getTranslationSystemPrompt;
    /**
     * Get vocabulary prompt based on target language
     */
    private getVocabularyPrompt;
    /**
     * Get vocabulary system prompt
     */
    private getVocabularySystemPrompt;
    /**
     * Get final report prompt based on target language
     */
    private getFinalReportPrompt;
    /**
     * Get final report system prompt
     */
    private getFinalReportSystemPrompt;
    /**
     * Get progressive summary prompt for specific threshold
     */
    private getProgressiveSummaryPromptForThreshold;
    /**
     * Destroy the service
     */
    destroy(): void;
}
export {};
