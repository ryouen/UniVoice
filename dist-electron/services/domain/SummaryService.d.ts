/**
 * SummaryService - 要約機能に特化したサービス
 *
 * 責任:
 * - 進捗的要約の生成（400/800/1600/2400語）
 * - 定期的要約の生成（10分ごと）
 * - 最終要約の生成
 *
 * 注意: 現在はenglish/japaneseフィールドがハードコードされているが、
 * 将来的にsourceText/targetTextに移行予定
 */
import { EventEmitter } from 'events';
export interface SummaryServiceConfig {
    openaiApiKey: string;
    summaryModel: string;
    maxTokens: number;
    summaryThresholds?: number[];
    sourceLanguage?: string;
    targetLanguage?: string;
}
export interface SummaryTranslation {
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
export declare class SummaryService extends EventEmitter {
    private config;
    private openai;
    private isActive;
    private currentCorrelationId;
    private componentLogger;
    private translations;
    private summaries;
    private totalWordCount;
    private summaryThresholds;
    private reachedThresholds;
    private lastProgressiveThresholdIndex;
    private progressiveSummaryQueue;
    private isGeneratingProgressiveSummary;
    private sourceLanguage;
    private targetLanguage;
    constructor(config: SummaryServiceConfig);
    /**
     * サービスを開始
     */
    start(correlationId: string, sourceLanguage?: string, targetLanguage?: string): void;
    /**
     * サービスを停止
     */
    stop(): void;
    /**
     * 翻訳を追加して要約の必要性をチェック
     */
    addTranslation(translation: SummaryTranslation): void;
    /**
     * 進捗的要約の閾値をチェック
     */
    private checkProgressiveSummaryThresholds;
    /**
     * 進捗的要約をキューに追加
     */
    private enqueueProgressiveSummary;
    /**
     * 進捗的要約のキューを処理
     */
    private processProgressiveSummaryQueue;
    /**
     * 進捗的要約を生成
     */
    private generateProgressiveSummary;
    /**
     * ターゲット言語へ翻訳
     */
    private translateToTargetLanguage;
    /**
     * 要約を取得
     */
    getSummaries(): Summary[];
    /**
     * 単語数をカウント
     */
    /**
     * 文字ベースの言語かチェック
     */
    /**
     * 進捗的要約用のプロンプト
     */
    private getProgressiveSummaryPrompt;
    /**
     * 要約システムプロンプト
     */
    private getSummarySystemPrompt;
    /**
     * 翻訳システムプロンプト
     */
    private getTranslationSystemPrompt;
    /**
     * 言語名を取得
     */
    private getLanguageNames;
    /**
     * クリーンアップ
     */
    destroy(): void;
}
export {};
