/**
 * CombinedSentence Domain Model
 * Clean Architecture: Domain Layer
 * 
 * 文単位の結合に関する責任を明確化
 */

import type { TranscriptSegment } from '../../shared/types/TranscriptSegment';

export interface CombinedSentence {
  id: string;                     // combined_xxx形式の一意識別子
  segmentIds: string[];           // 結合された元のセグメントID群
  
  // コンテンツ
  sourceText: string;             // 結合された原文
  sourceLanguage: string;         // 原文の言語（ISO 639-1）
  
  // タイミング情報
  startTime: number;              // 最初のセグメントの開始時刻
  endTime: number;                // 最後のセグメントの終了時刻
  duration: number;               // 期間（ミリ秒）
  
  // メタデータ
  segmentCount: number;           // 結合されたセグメント数
  averageConfidence: number;      // 平均信頼度（0.0-1.0）
  wordCount: number;              // 単語数
  
  // オプション
  metadata?: Record<string, any>; // 追加のメタデータ
}

/**
 * 文の境界判定ルール
 */
export class SentenceBoundaryRules {
  // 文末パターン（確実なもののみ）
  private static readonly SENTENCE_END_PATTERNS = [
    // 日本語
    /[。．]\s*$/,                    // 句点
    /[！？]\s*$/,                    // 感嘆符・疑問符
    
    // 英語
    /[.!?]\s*$/,                     // 文末記号
    /\.\)?\s*$/,                     // 括弧付きピリオド
    /[.!?]['"]?\s*$/,                // 引用符付き文末
  ];
  
  // 文の途中を示すパターン
  private static readonly INCOMPLETE_PATTERNS = [
    /[,、]\s*$/,                     // カンマ
    /\s+(and|or|but)\s*$/i,          // 接続詞
    /\s+(は|が|を|に|で|と|の)\s*$/,  // 日本語助詞
  ];

  /**
   * 文が完成しているかチェック
   */
  static isSentenceComplete(text: string): boolean {
    if (!text || text.trim().length === 0) {
      return false;
    }
    
    // 明らかに未完成のパターンがあれば false
    if (this.INCOMPLETE_PATTERNS.some(pattern => pattern.test(text))) {
      return false;
    }
    
    // 文末パターンに一致すれば完成
    return this.SENTENCE_END_PATTERNS.some(pattern => pattern.test(text));
  }

  /**
   * 確実に文末かチェック（短くても出力する場合）
   */
  static isDefinitelySentenceEnd(text: string): boolean {
    return /[？！?!。\.]\s*$/.test(text);
  }
}

/**
 * CombinedSentence Factory
 */
export class CombinedSentenceFactory {
  static create(segments: TranscriptSegment[]): CombinedSentence | null {
    if (segments.length === 0) {
      return null;
    }

    const sourceText = segments
      .map(s => s.text.trim())
      .filter(text => text.length > 0)
      .join(' ');

    if (!sourceText) {
      return null;
    }

    const totalConfidence = segments.reduce((sum, s) => sum + (s.confidence || 1), 0);
    const averageConfidence = totalConfidence / segments.length;

    const startTime = segments[0].timestamp;
    const endTime = segments[segments.length - 1].timestamp;
    const duration = endTime - startTime;

    // 単語数の計算（言語に応じて調整が必要）
    const wordCount = this.countWords(sourceText, segments[0].language);

    return {
      id: this.generateId(),
      segmentIds: segments.map(s => s.id),
      sourceText,
      sourceLanguage: segments[0].language || 'unknown',
      startTime,
      endTime,
      duration,
      segmentCount: segments.length,
      averageConfidence,
      wordCount
    };
  }

  private static generateId(): string {
    return `combined_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static countWords(text: string, language?: string): number {
    // 日本語・中国語の場合は文字数ベース
    if (language && ['ja', 'zh', 'ko'].includes(language)) {
      return text.replace(/\s+/g, '').length;
    }
    
    // その他の言語は空白区切りで単語数をカウント
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}

/**
 * Sentence Combiner Options
 */
export interface SentenceCombinerOptions {
  maxSegments: number;        // 最大セグメント数（デフォルト: 10）
  timeoutMs: number;          // タイムアウト時間（デフォルト: 2000ms）
  minSegments: number;        // 最小セグメント数（デフォルト: 1）
}