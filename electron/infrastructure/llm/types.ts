/**
 * LLM Gateway 型定義
 * 
 * ⚠️ 重要: これらの型は既存の実装に影響を与えない
 * 新しい抽象化レイヤーのための型定義のみ
 */

// LLMGatewayインターフェースを再エクスポート
export type { LLMGateway } from './LLMGateway';

/**
 * LLMの用途を定義
 * 既存のモデル設定と1:1で対応
 */
export enum LLMPurpose {
  TRANSLATION = 'translation',           // gpt-5-nano
  SUMMARY = 'summary',                   // gpt-5-mini
  SUMMARY_TRANSLATE = 'summary_translate', // gpt-5-nano
  USER_TRANSLATE = 'user_translate',     // gpt-5-nano
  VOCABULARY = 'vocabulary',             // gpt-5-mini
  REPORT = 'report'                      // gpt-5
}

/**
 * LLMリクエストの基本型
 */
export interface LLMRequest {
  purpose: LLMPurpose;
  systemPrompt: string;
  userContent: string;
  maxTokens?: number;
  stream?: boolean;
  metadata?: {
    segmentId?: string;
    correlationId?: string;
    [key: string]: unknown;
  };
}

/**
 * LLMレスポンスの基本型
 */
export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: {
    model?: string;
    latencyMs?: number;
    [key: string]: unknown;
  };
}

/**
 * ストリーミングレスポンスのチャンク
 */
export interface LLMStreamChunk {
  delta: string;
  isComplete: boolean;
}

/**
 * LLMエラー型
 */
export interface LLMError extends Error {
  code: string;
  retryable: boolean;
  details?: unknown;
}

/**
 * LLM設定型
 * 環境変数から読み込まれる設定
 */
export interface LLMConfig {
  apiKey: string;
  models: {
    [K in LLMPurpose]: string;
  };
  maxTokens: {
    [K in LLMPurpose]: number;
  };
}

/**
 * メトリクス型
 * Shadow Mode での比較用
 */
export interface LLMMetrics {
  requestId: string;
  purpose: LLMPurpose;
  model: string;
  latencyMs: number;
  tokenCount: number;
  success: boolean;
  errorCode?: string;
}