/**
 * LLM Gateway インターフェース
 *
 * すべてのLLM通信を抽象化する統一インターフェース
 *
 * ⚠️ 実装時の注意:
 * - 現在はOpenAI Responses APIを使用（GPT-5シリーズ）
 * - モデル名、API呼び出し方法は変更禁止
 * - このインターフェースは既存コードに影響しない
 */
import { LLMRequest, LLMResponse, LLMStreamChunk, LLMPurpose, LLMMetrics } from './types';
/**
 * LLM通信の統一インターフェース
 */
export interface LLMGateway {
    /**
     * 同期的なLLM呼び出し（通常の完了型）
     */
    complete(request: LLMRequest): Promise<LLMResponse>;
    /**
     * ストリーミングLLM呼び出し
     * リアルタイム翻訳で使用
     */
    stream(request: LLMRequest): AsyncIterableIterator<LLMStreamChunk>;
    /**
     * 特定用途のモデル名を取得（読み取り専用）
     * 環境変数の設定ミスを検出するため
     */
    getModelForPurpose(purpose: LLMPurpose): string;
    /**
     * 現在のレート制限状態
     */
    getRateLimitStatus(): {
        remaining: number;
        resetAt: Date;
    };
    /**
     * ヘルスチェック
     * 起動時やエラー発生時の診断用
     */
    isHealthy(): Promise<boolean>;
    /**
     * メトリクス取得（Shadow Mode用）
     * 既存実装との比較に使用
     */
    getLastMetrics(): LLMMetrics | null;
}
/**
 * LLM Gateway のファクトリ関数の型
 */
export type LLMGatewayFactory = (config: {
    apiKey: string;
    models: Record<LLMPurpose, string>;
    maxTokens?: Partial<Record<LLMPurpose, number>>;
}) => LLMGateway;
