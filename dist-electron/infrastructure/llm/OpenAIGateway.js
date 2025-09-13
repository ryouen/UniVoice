"use strict";
/**
 * OpenAI Gateway 実装
 *
 * ⚠️ 重要:
 * - GPT-5シリーズとResponses APIは実在する（2025年8月現在）
 * - 既存の動作確認済み実装を変更しない
 * - Shadow Mode対応で安全な移行を実現
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIGateway = void 0;
const openai_1 = __importDefault(require("openai"));
const types_1 = require("./types");
const logger_1 = require("../../utils/logger");
/**
 * OpenAI Responses API 実装
 * 既存のUnifiedPipelineServiceと互換性を保つ
 */
class OpenAIGateway {
    constructor(config) {
        this.componentLogger = logger_1.logger.child('OpenAIGateway');
        this.lastMetrics = null;
        // デフォルトのトークン数（環境変数で上書き可能）
        this.DEFAULT_MAX_TOKENS = {
            [types_1.LLMPurpose.TRANSLATION]: 1500,
            [types_1.LLMPurpose.SUMMARY]: 1500,
            [types_1.LLMPurpose.SUMMARY_TRANSLATE]: 1500,
            [types_1.LLMPurpose.USER_TRANSLATE]: 1500,
            [types_1.LLMPurpose.VOCABULARY]: 1500,
            [types_1.LLMPurpose.REPORT]: 8192
        };
        this.config = config;
        this.openai = new openai_1.default({ apiKey: config.apiKey });
        // 起動時にモデル設定を検証
        this.validateModels();
    }
    /**
     * モデル設定の検証
     * GPT-5シリーズ以外の使用を防ぐ
     */
    validateModels() {
        const validModels = ['gpt-5-nano', 'gpt-5-mini', 'gpt-5'];
        const configuredModels = Object.values(this.config.models);
        configuredModels.forEach(model => {
            if (!validModels.includes(model)) {
                const error = new Error(`❌ 無効なモデル設定: ${model}\n` +
                    `✅ 有効なモデル: ${validModels.join(', ')}\n` +
                    `GPT-5シリーズは実在します（2025年8月現在）。GPT-4への変更は禁止です。`);
                this.componentLogger.error('Model validation failed', { model, validModels });
                throw error;
            }
        });
        this.componentLogger.info('Model configuration validated', {
            models: this.config.models
        });
    }
    /**
     * 同期的なLLM呼び出し
     * 既存のexecuteTranslationと互換性を保つ
     */
    async complete(request) {
        const startTime = Date.now();
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const model = this.config.models[request.purpose];
        const maxTokens = this.config.maxTokens?.[request.purpose] || this.DEFAULT_MAX_TOKENS[request.purpose];
        try {
            // ✅ 既存の動作確認済み実装と同じパラメータ
            const response = await this.openai.responses.create({
                model,
                input: [
                    { role: 'system', content: request.systemPrompt },
                    { role: 'user', content: request.userContent }
                ],
                max_output_tokens: request.maxTokens || maxTokens,
                reasoning: {
                    effort: this.getReasoningEffort(request.purpose)
                },
                temperature: 1.0, // GPT-5では固定
                stream: false
            });
            const latencyMs = Date.now() - startTime;
            // メトリクス記録（Shadow Mode用）
            this.lastMetrics = {
                requestId,
                purpose: request.purpose,
                model,
                latencyMs,
                tokenCount: response.usage?.total_tokens || 0,
                success: true
            };
            this.componentLogger.info('LLM request completed', {
                requestId,
                purpose: request.purpose,
                model,
                latencyMs,
                tokenCount: response.usage?.total_tokens
            });
            return {
                content: response.output_text,
                usage: response.usage ? {
                    promptTokens: response.usage.prompt_tokens || 0, // 🔴 元の値をそのまま使用（型アサーション）
                    completionTokens: response.usage.completion_tokens || 0, // 🔴 元の値をそのまま使用  
                    totalTokens: response.usage.total_tokens || 0
                } : undefined,
                metadata: {
                    model,
                    latencyMs,
                    requestId
                }
            };
        }
        catch (error) {
            const errorCode = this.getErrorCode(error);
            // メトリクス記録（エラー）
            this.lastMetrics = {
                requestId,
                purpose: request.purpose,
                model,
                latencyMs: Date.now() - startTime,
                tokenCount: 0,
                success: false,
                errorCode
            };
            this.componentLogger.error('LLM request failed', {
                error,
                requestId,
                purpose: request.purpose,
                model
            });
            throw this.wrapError(error);
        }
    }
    /**
     * ストリーミングLLM呼び出し
     * 既存のストリーミング翻訳と完全互換
     */
    async *stream(request) {
        const startTime = Date.now();
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const model = this.config.models[request.purpose];
        const maxTokens = this.config.maxTokens?.[request.purpose] || this.DEFAULT_MAX_TOKENS[request.purpose];
        try {
            // ✅ 既存のストリーミング実装と同じ
            const stream = await this.openai.responses.create({
                model,
                input: [
                    { role: 'system', content: request.systemPrompt },
                    { role: 'user', content: request.userContent }
                ],
                max_output_tokens: request.maxTokens || maxTokens,
                reasoning: {
                    effort: this.getReasoningEffort(request.purpose)
                },
                temperature: 1.0,
                stream: true // ストリーミング有効
            });
            let tokenCount = 0;
            for await (const chunk of stream) {
                // 既存実装と同じchunk.type判定
                if (chunk.type === 'response.output_text.delta' && chunk.delta) {
                    tokenCount++;
                    yield {
                        delta: chunk.delta,
                        isComplete: false
                    };
                }
            }
            // 完了シグナル
            yield {
                delta: '',
                isComplete: true
            };
            // メトリクス記録
            this.lastMetrics = {
                requestId,
                purpose: request.purpose,
                model,
                latencyMs: Date.now() - startTime,
                tokenCount,
                success: true
            };
            this.componentLogger.info('LLM streaming completed', {
                requestId,
                purpose: request.purpose,
                model,
                latencyMs: Date.now() - startTime,
                tokenCount
            });
        }
        catch (error) {
            const errorCode = this.getErrorCode(error);
            this.lastMetrics = {
                requestId,
                purpose: request.purpose,
                model,
                latencyMs: Date.now() - startTime,
                tokenCount: 0,
                success: false,
                errorCode
            };
            this.componentLogger.error('LLM streaming failed', {
                error,
                requestId,
                purpose: request.purpose,
                model
            });
            throw this.wrapError(error);
        }
    }
    /**
     * モデル名取得
     */
    getModelForPurpose(purpose) {
        return this.config.models[purpose];
    }
    /**
     * レート制限状態（将来実装）
     */
    getRateLimitStatus() {
        // TODO: 実際のレート制限情報を実装
        return {
            remaining: 1000,
            resetAt: new Date(Date.now() + 3600000)
        };
    }
    /**
     * ヘルスチェック
     */
    async isHealthy() {
        try {
            // 最小限のテストリクエスト
            await this.complete({
                purpose: types_1.LLMPurpose.TRANSLATION,
                systemPrompt: 'Health check',
                userContent: 'Test',
                maxTokens: 1
            });
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * 最後のメトリクス取得（Shadow Mode用）
     */
    getLastMetrics() {
        return this.lastMetrics;
    }
    /**
     * 用途に応じた推論努力レベル
     * 既存実装と同じ設定
     */
    getReasoningEffort(purpose) {
        switch (purpose) {
            case types_1.LLMPurpose.REPORT:
                return 'high';
            case types_1.LLMPurpose.SUMMARY:
            case types_1.LLMPurpose.VOCABULARY:
                return 'low';
            case types_1.LLMPurpose.TRANSLATION:
            case types_1.LLMPurpose.SUMMARY_TRANSLATE:
            case types_1.LLMPurpose.USER_TRANSLATE:
            default:
                return 'minimal';
        }
    }
    /**
     * エラーコード判定
     */
    getErrorCode(error) {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes('rate_limit') || message.includes('429')) {
                return 'RATE_LIMIT_ERROR';
            }
            if (message.includes('unauthorized') || message.includes('401')) {
                return 'AUTH_ERROR';
            }
            if (message.includes('timeout')) {
                return 'TIMEOUT_ERROR';
            }
        }
        return 'UNKNOWN_ERROR';
    }
    /**
     * エラーラッピング
     */
    wrapError(error) {
        const errorCode = this.getErrorCode(error);
        const isRetryable = ['RATE_LIMIT_ERROR', 'TIMEOUT_ERROR'].includes(errorCode);
        if (error instanceof Error) {
            return Object.assign(error, {
                code: errorCode,
                retryable: isRetryable,
                details: error
            });
        }
        const wrappedError = new Error(String(error));
        wrappedError.code = errorCode;
        wrappedError.retryable = isRetryable;
        return wrappedError;
    }
}
exports.OpenAIGateway = OpenAIGateway;
