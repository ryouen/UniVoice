/**
 * UnifiedPipelineService - Pure Domain Service
 *
 * Responsibilities:
 * - Manage ASR and Translation pipeline
 * - Integrate with StreamCoalescer for UI optimization
 * - Emit domain events (no UI dependencies)
 * - Handle error recovery and state management
 *
 * Key Changes from Original:
 * - Removed all UI-specific code
 * - Integrated StreamCoalescer for segment management
 * - Pure event emission (no direct UI updates)
 * - Enhanced error handling and recovery
 */
import { EventEmitter } from 'events';
import { LanguageConfig, LanguageCode } from './LanguageConfig';
import { PipelineState } from './PipelineStateManager';
interface AudioConfig {
    frameMs: number;
    frameSize: number;
    sampleRate: number;
}
interface DeepgramConfig {
    apiKey: string;
    model: string;
    interim: boolean;
    endpointing: number;
    utteranceEndMs: number;
    smartFormat?: boolean;
    noDelay?: boolean;
}
interface OpenAIConfig {
    apiKey: string;
    models: {
        translate: string;
        summary: string;
        summaryTranslate: string;
        userTranslate: string;
        vocabulary: string;
        report: string;
    };
    maxTokens: {
        translate: number;
        summary: number;
        vocabulary: number;
        report: number;
    };
}
export declare class UnifiedPipelineService extends EventEmitter {
    private audioConfig;
    private deepgramConfig;
    private openaiConfig;
    private deepgramAdapter;
    private openai;
    private translationQueue;
    private sentenceCombiner;
    private stateManager;
    private sourceLanguage;
    private targetLanguage;
    private currentCorrelationId;
    private startTime;
    private lastActivityTime;
    private transcriptSegments;
    private translations;
    private summaries;
    private componentLogger;
    private audioFrameCount;
    constructor(audioConfig: AudioConfig, deepgramConfig: DeepgramConfig, openaiConfig: OpenAIConfig, languageConfig?: LanguageConfig);
    /**
     * Start listening with specified languages
     */
    startListening(sourceLanguage: LanguageCode | undefined, targetLanguage: LanguageCode | undefined, correlationId: string): Promise<void>;
    /**
     * Stop listening
     */
    stopListening(correlationId: string): Promise<void>;
    /**
     * Update language settings (used when session metadata is updated)
     */
    updateLanguages(sourceLanguage: LanguageCode, targetLanguage: LanguageCode): Promise<void>;
    /**
     * Pause the pipeline
     */
    pauseListening(): boolean;
    /**
     * Resume the pipeline
     */
    resumeListening(): boolean;
    /**
     * Get current state
     */
    getState(): {
        state: PipelineState;
        sourceLanguage: string;
        targetLanguage: string;
        segmentCount: number;
        translationCount: number;
        summaryCount: number;
        uptime: number;
    };
    /**
     * Send audio chunk for processing
     */
    sendAudioChunk(buffer: Buffer): void;
    /**
     * Clear all history
     */
    clearHistory(): void;
    /**
     * Get metrics
     */
    getMetrics(): {
        pipeline: {
            state: PipelineState;
            sourceLanguage: string;
            targetLanguage: string;
            segmentCount: number;
            translationCount: number;
            summaryCount: number;
            uptime: number;
        };
        performance: {
            startTime: number;
            lastActivity: number;
            uptime: number;
        };
    };
    /**
     * Connect to Deepgram using DeepgramStreamAdapter
     * Clean Architecture: WebSocket管理をアダプター層に委譲
     */
    private connectToDeepgram;
    /**
     * DeepgramStreamAdapter のイベントハンドラーを設定
     */
    private setupDeepgramEventHandlers;
    /**
     * Get meaning of WebSocket close code
     */
    /**
     * Execute translation (called by queue)
     *
     * @see https://platform.openai.com/docs/api-reference/responses
     * @see docs/GPT5-RESPONSES-API-GUIDE.md - GPT-5 Responses APIの使用方法
     *
     * 重要: Responses APIは実在のAPIです（2025年3月リリース）
     * - responses.stream を使用（chat.completions.createではない）
     * - inputパラメータを使用（messagesではない）
     * - max_output_tokensを使用（max_tokensではない）
     * - reasoning.effortで推論の深さを制御（minimal/low/medium/high）
     * - temperatureは1.0固定（GPT-5では変更不可）
     */
    private executeTranslation;
    /**
     * Set pipeline state and emit status event
     */
    private setState;
    /**
     * Emit pipeline event
     */
    private emitEvent;
    /**
     * Emit error event
     */
    private handleTranslationQueueFailure;
    private handleRealtimeTranslationFailure;
    private handleHistoryTranslationFailure;
    private createFallbackTranslationText;
    private emitError;
    /**
     * Generate vocabulary from current session
     * @deprecated This method should be called directly on AdvancedFeatureService from main.ts
     */
    generateVocabulary(correlationId: string): Promise<void>;
    /**
     * Generate final report from current session
     * @deprecated This method should be called directly on AdvancedFeatureService from main.ts
     */
    generateFinalReport(correlationId: string): Promise<void>;
    /**
     * Handle combined sentence from SentenceCombiner
     * 結合された文を履歴用高品質翻訳キューに追加
     */
    private handleCombinedSentence;
    /**
     * Handle paragraph complete from ParagraphBuilder
     * 【Phase 2-ParagraphBuilder】パラグラフ単位の履歴処理
     * パラグラフが完成したら高品質翻訳を開始
     * 🔴 ParagraphBuilderを一時的に無効化 - フロントエンドでのグループ化を優先
     */
    /**
     * Handle transcript segment from Deepgram
     * Deepgramから受信したトランスクリプトセグメントを処理
     */
    private handleTranscriptSegment;
    /**
     * Execute history translation with higher quality
     * 履歴用の高品質翻訳を実行（より大きなコンテキストと高品質モデル）
     */
    private executeHistoryTranslation;
    /**
     * Shadow Mode: 通常翻訳の比較実行（非同期・エラーを握りつぶす）
     *
     * @private
     */
    /**
     * Shadow Mode: 履歴翻訳の比較実行（非同期・エラーを握りつぶす）
     *
     * @private
     */
    /**
     * Clean translation output to remove GPT's internal thoughts
     * GPTの内部思考プロセスを除去
     */
    private cleanTranslationOutput;
    /**
     * Cleanup resources
     */
    destroy(): void;
}
export {};
