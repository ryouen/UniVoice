# LLMGateway インターフェース設計書

作成日: 2025-08-28

## 目的

すべてのLLM（Large Language Model）通信を抽象化し、将来のモデル変更に対応可能な統一インターフェースを提供する。
ただし、**現在のGPT-5シリーズとResponses APIは変更しない**。

## 設計原則

1. **現在の実装を維持**: responses.createの使用方法を変えない
2. **抽象化と具体実装の分離**: インターフェースは汎用的に、実装は現在のAPIに特化
3. **型安全性**: TypeScriptの型システムを最大限活用
4. **テスタビリティ**: モックしやすい設計

## インターフェース定義

```typescript
// electron/infrastructure/llm/types.ts

/**
 * LLMの用途を定義
 */
export enum LLMPurpose {
  TRANSLATION = 'translation',
  SUMMARY = 'summary', 
  VOCABULARY = 'vocabulary',
  REPORT = 'report',
  USER_TRANSLATION = 'user_translation'
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
  metadata?: Record<string, unknown>;
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
  metadata?: Record<string, unknown>;
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
```

## LLMGateway インターフェース

```typescript
// electron/infrastructure/llm/LLMGateway.ts

import { LLMRequest, LLMResponse, LLMStreamChunk, LLMPurpose } from './types';

/**
 * LLM通信の統一インターフェース
 * 
 * 実装時の注意:
 * - 現在はOpenAI Responses APIを使用
 * - モデル名は変更禁止
 * - API呼び出し方法は変更禁止
 */
export interface LLMGateway {
  /**
   * 同期的なLLM呼び出し
   */
  complete(request: LLMRequest): Promise<LLMResponse>;

  /**
   * ストリーミングLLM呼び出し
   * 現在の実装: responses.create with stream: true
   */
  stream(request: LLMRequest): AsyncIterableIterator<LLMStreamChunk>;

  /**
   * モデル設定の取得（読み取り専用）
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
   */
  isHealthy(): Promise<boolean>;
}
```

## 実装クラスの設計

```typescript
// electron/infrastructure/llm/OpenAIGateway.ts

import OpenAI from 'openai';
import { LLMGateway, LLMRequest, LLMResponse, LLMStreamChunk } from './LLMGateway';
import { logger } from '../../utils/logger';

/**
 * OpenAI Responses API実装
 * 
 * ⚠️ 重要: GPT-5シリーズとResponses APIは実在する
 * - 2025年8月現在、本番環境で動作確認済み
 * - chat.completions.createは使用しない
 */
export class OpenAIGateway implements LLMGateway {
  private openai: OpenAI;
  private modelConfig: Record<LLMPurpose, string>;
  private componentLogger = logger.child('OpenAIGateway');

  constructor(apiKey: string, modelConfig: Record<LLMPurpose, string>) {
    this.openai = new OpenAI({ apiKey });
    this.modelConfig = modelConfig;
    
    // モデル設定の検証
    this.validateModelConfig();
  }

  /**
   * モデル設定が正しいか検証
   * GPT-5シリーズ以外への変更を防ぐ
   */
  private validateModelConfig(): void {
    const validModels = ['gpt-5-nano', 'gpt-5-mini', 'gpt-5'];
    
    Object.entries(this.modelConfig).forEach(([purpose, model]) => {
      if (!validModels.includes(model)) {
        throw new Error(
          `Invalid model ${model} for ${purpose}. ` +
          `Only GPT-5 series are allowed: ${validModels.join(', ')}`
        );
      }
    });
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = this.modelConfig[request.purpose];
    
    try {
      // ✅ 現在の動作確認済み実装を維持
      const response = await this.openai.responses.create({
        model,
        input: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userContent }
        ],
        max_output_tokens: request.maxTokens || 1500,
        reasoning: { 
          effort: this.getReasoningEffort(request.purpose) 
        },
        temperature: 1.0 // GPT-5では固定
      });

      return {
        content: response.output_text,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        } : undefined
      };
    } catch (error) {
      this.componentLogger.error('LLM completion failed', { error, request });
      throw this.wrapError(error);
    }
  }

  async *stream(request: LLMRequest): AsyncIterableIterator<LLMStreamChunk> {
    const model = this.modelConfig[request.purpose];
    
    try {
      // ✅ 現在のストリーミング実装を維持
      const stream = await this.openai.responses.create({
        model,
        input: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userContent }
        ],
        max_output_tokens: request.maxTokens || 1500,
        stream: true,
        reasoning: { 
          effort: this.getReasoningEffort(request.purpose) 
        },
        temperature: 1.0
      });

      for await (const chunk of stream) {
        if (chunk.output_text?.delta) {
          yield {
            delta: chunk.output_text.delta,
            isComplete: false
          };
        }
      }

      yield { delta: '', isComplete: true };
    } catch (error) {
      this.componentLogger.error('LLM streaming failed', { error, request });
      throw this.wrapError(error);
    }
  }

  getModelForPurpose(purpose: LLMPurpose): string {
    return this.modelConfig[purpose];
  }

  getRateLimitStatus(): { remaining: number; resetAt: Date } {
    // TODO: 実際のレート制限情報を実装
    return {
      remaining: 1000,
      resetAt: new Date(Date.now() + 3600000)
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      // 最小限のテストリクエスト
      await this.complete({
        purpose: LLMPurpose.TRANSLATION,
        systemPrompt: 'Test',
        userContent: 'Test',
        maxTokens: 1
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 用途に応じた推論努力レベルを返す
   */
  private getReasoningEffort(purpose: LLMPurpose): string {
    switch (purpose) {
      case LLMPurpose.REPORT:
        return 'high';
      case LLMPurpose.SUMMARY:
      case LLMPurpose.VOCABULARY:
        return 'low';
      default:
        return 'minimal';
    }
  }

  private wrapError(error: unknown): LLMError {
    if (error instanceof Error) {
      return {
        name: 'LLMError',
        message: error.message,
        code: 'LLM_REQUEST_FAILED',
        retryable: this.isRetryableError(error),
        details: error
      };
    }
    
    return {
      name: 'LLMError',
      message: String(error),
      code: 'LLM_UNKNOWN_ERROR',
      retryable: false
    };
  }

  private isRetryableError(error: Error): boolean {
    // レート制限やタイムアウトはリトライ可能
    const retryableMessages = ['rate_limit', 'timeout', '429', '503'];
    return retryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }
}
```

## 使用例

```typescript
// 現在のUnifiedPipelineServiceでの使用イメージ

class UnifiedPipelineService {
  private llmGateway: LLMGateway;

  constructor(llmGateway: LLMGateway) {
    this.llmGateway = llmGateway;
  }

  async translateText(text: string): Promise<string> {
    // シンプルで読みやすい
    const response = await this.llmGateway.complete({
      purpose: LLMPurpose.TRANSLATION,
      systemPrompt: getTranslationPrompt(this.sourceLanguage, this.targetLanguage),
      userContent: text,
      maxTokens: 1500
    });

    return response.content;
  }

  async *streamTranslation(text: string) {
    // ストリーミングも簡潔
    const chunks = this.llmGateway.stream({
      purpose: LLMPurpose.TRANSLATION,
      systemPrompt: getTranslationPrompt(this.sourceLanguage, this.targetLanguage),
      userContent: text,
      stream: true
    });

    for await (const chunk of chunks) {
      yield chunk.delta;
    }
  }
}
```

## テスト戦略

```typescript
// tests/unit/OpenAIGateway.test.ts

describe('OpenAIGateway', () => {
  it('should use correct model for each purpose', () => {
    const gateway = new OpenAIGateway('test-key', {
      [LLMPurpose.TRANSLATION]: 'gpt-5-nano',
      [LLMPurpose.SUMMARY]: 'gpt-5-mini',
      [LLMPurpose.REPORT]: 'gpt-5'
    });

    expect(gateway.getModelForPurpose(LLMPurpose.TRANSLATION))
      .toBe('gpt-5-nano');
  });

  it('should reject invalid models', () => {
    expect(() => {
      new OpenAIGateway('test-key', {
        [LLMPurpose.TRANSLATION]: 'gpt-4' // 間違ったモデル
      });
    }).toThrow('Invalid model gpt-4');
  });

  it('should use responses.create API', async () => {
    // モックでAPIの呼び出しを検証
    const mockCreate = jest.fn();
    // ... テスト実装
  });
});
```

## 次のステップ

1. ModelConfigManager の実装
   - 環境変数からのモデル設定読み込み
   - バリデーション

2. PromptManager の実装
   - プロンプトテンプレート管理
   - 動的プロンプト生成

3. エラーハンドリングとリトライ戦略の詳細設計