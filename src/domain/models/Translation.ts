/**
 * Translation Domain Model
 * Clean Architecture: Domain Layer
 * 
 * 翻訳に関する責任を明確に分離
 */

export interface Translation {
  id: string;                     // 翻訳の一意識別子
  
  // ソース情報
  sourceId: string;               // 翻訳元のID（SegmentID or CombinedSentenceID）
  sourceText: string;             
  sourceLanguage: string;         // ISO 639-1 言語コード
  
  // ターゲット情報
  targetText: string;
  targetLanguage: string;         // ISO 639-1 言語コード
  
  // メタデータ
  timestamp: number;              // 翻訳完了時刻
  model: string;                  // 使用モデル（例: gpt-5-nano, gpt-5-mini）
  quality: TranslationQuality;    
  processingTimeMs: number;       // 処理時間（ミリ秒）
  
  // オプション
  confidence?: number;            // 翻訳の信頼度（0.0-1.0）
  metadata?: Record<string, any>; // 追加のメタデータ
}

export enum TranslationQuality {
  REALTIME = 'realtime',  // リアルタイム翻訳（gpt-5-nano）
  HIGH = 'high',          // 高品質翻訳（gpt-5-mini）
  PREMIUM = 'premium'     // プレミアム翻訳（gpt-5）- 将来用
}

/**
 * 翻訳リクエスト
 */
export interface TranslationRequest {
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  quality?: TranslationQuality;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * 翻訳結果
 */
export interface TranslationResult {
  translation: Translation;
  cached?: boolean;
  error?: Error;
}

/**
 * Translation Factory
 */
export class TranslationFactory {
  static create(
    sourceId: string,
    sourceText: string,
    targetText: string,
    languages: { source: string; target: string },
    metadata: {
      model: string;
      quality?: TranslationQuality;
      processingTimeMs: number;
    }
  ): Translation {
    return {
      id: this.generateId(),
      sourceId,
      sourceText,
      sourceLanguage: languages.source,
      targetText,
      targetLanguage: languages.target,
      timestamp: Date.now(),
      model: metadata.model,
      quality: metadata.quality || TranslationQuality.REALTIME,
      processingTimeMs: metadata.processingTimeMs
    };
  }

  private static generateId(): string {
    return `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Translation Domain Service Interface
 */
export interface TranslationService {
  translate(request: TranslationRequest): Promise<TranslationResult>;
  getTranslation(id: string): Promise<Translation | null>;
  getTranslationsBySourceId(sourceId: string): Promise<Translation[]>;
}