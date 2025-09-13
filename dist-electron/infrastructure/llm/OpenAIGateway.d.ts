/**
 * OpenAI Gateway 実装
 *
 * ⚠️ 重要:
 * - GPT-5シリーズとResponses APIは実在する（2025年8月現在）
 * - 既存の動作確認済み実装を変更しない
 * - Shadow Mode対応で安全な移行を実現
 */
import { LLMGateway, LLMRequest, LLMResponse, LLMStreamChunk, LLMPurpose, LLMConfig, LLMMetrics } from './types';
/**
 * OpenAI Responses API 実装
 * 既存のUnifiedPipelineServiceと互換性を保つ
 */
export declare class OpenAIGateway implements LLMGateway {
    private openai;
    private config;
    private componentLogger;
    private lastMetrics;
    private readonly DEFAULT_MAX_TOKENS;
    constructor(config: LLMConfig);
    /**
     * モデル設定の検証
     * GPT-5シリーズ以外の使用を防ぐ
     */
    private validateModels;
    /**
     * 同期的なLLM呼び出し
     * 既存のexecuteTranslationと互換性を保つ
     */
    complete(request: LLMRequest): Promise<LLMResponse>;
    /**
     * ストリーミングLLM呼び出し
     * 既存のストリーミング翻訳と完全互換
     */
    stream(request: LLMRequest): AsyncIterableIterator<LLMStreamChunk>;
    /**
     * モデル名取得
     */
    getModelForPurpose(purpose: LLMPurpose): string;
    /**
     * レート制限状態（将来実装）
     */
    getRateLimitStatus(): {
        remaining: number;
        resetAt: Date;
    };
    /**
     * ヘルスチェック
     */
    isHealthy(): Promise<boolean>;
    /**
     * 最後のメトリクス取得（Shadow Mode用）
     */
    getLastMetrics(): LLMMetrics | null;
    /**
     * 用途に応じた推論努力レベル
     * 既存実装と同じ設定
     */
    private getReasoningEffort;
    /**
     * エラーコード判定
     */
    private getErrorCode;
    /**
     * エラーラッピング
     */
    private wrapError;
}
