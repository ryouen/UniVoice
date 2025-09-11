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
import { OpenAI } from 'openai';
import { 
  createProgressiveSummaryEvent,
  createErrorEvent
} from '../ipc/contracts';
import { logger } from '../../utils/logger';

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
  original: string;
  translated: string;
  timestamp: number;
}

interface Summary {
  id: string;
  timestamp: number;
  english: string;  // TODO: sourceText に変更
  japanese: string;  // TODO: targetText に変更
  wordCount: number;
  startTime: number;
  endTime: number;
}

export class SummaryService extends EventEmitter {
  private config: SummaryServiceConfig;
  private openai: OpenAI;
  private isActive = false;
  private currentCorrelationId: string | null = null;
  private componentLogger = logger.child('SummaryService');
  
  // 要約生成用のデータ
  private translations: SummaryTranslation[] = [];
  private summaries: Summary[] = [];
  private totalWordCount = 0;
  private summaryThresholds: number[] = [400, 800, 1600, 2400];
  private reachedThresholds = new Set<number>();
  
  // 進捗的要約の管理
  private lastProgressiveThresholdIndex = -1;
  private progressiveSummaryQueue: Array<{ baseThreshold: number; adjustedThreshold: number }> = [];
  private isGeneratingProgressiveSummary = false;
  
  // 言語設定
  private sourceLanguage: string;
  private targetLanguage: string;

  constructor(config: SummaryServiceConfig) {
    super();
    this.config = config;
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    
    if (config.summaryThresholds) {
      this.summaryThresholds = config.summaryThresholds;
    }
    
    this.sourceLanguage = config.sourceLanguage || 'en';
    this.targetLanguage = config.targetLanguage || 'ja';
    
    this.componentLogger.info('SummaryService initialized', {
      model: config.summaryModel,
      thresholds: this.summaryThresholds,
      sourceLanguage: this.sourceLanguage,
      targetLanguage: this.targetLanguage
    });
  }

  /**
   * サービスを開始
   */
  start(correlationId: string, sourceLanguage?: string, targetLanguage?: string): void {
    if (this.isActive) {
      this.componentLogger.warn('SummaryService already active');
      return;
    }
    
    this.isActive = true;
    this.currentCorrelationId = correlationId;
    this.translations = [];
    this.summaries = [];
    
    // 言語設定の更新
    if (sourceLanguage) this.sourceLanguage = sourceLanguage;
    if (targetLanguage) this.targetLanguage = targetLanguage;
    
    // 進捗的要約のリセット
    this.totalWordCount = 0;
    this.reachedThresholds.clear();
    this.lastProgressiveThresholdIndex = -1;
    this.progressiveSummaryQueue = [];
    this.isGeneratingProgressiveSummary = false;
    
    this.componentLogger.info('SummaryService started', {
      correlationId,
      sourceLanguage: this.sourceLanguage,
      targetLanguage: this.targetLanguage
    });
  }

  /**
   * サービスを停止
   */
  stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.currentCorrelationId = null;
    
    this.componentLogger.info('SummaryService stopped', {
      translationCount: this.translations.length,
      summaryCount: this.summaries.length
    });
  }

  /**
   * 翻訳を追加して要約の必要性をチェック
   */
  addTranslation(translation: SummaryTranslation): void {
    if (!this.isActive) return;
    
    this.translations.push(translation);
    
    // 単語数をカウント（ソース言語で）
    const wordCount = this.countWords(translation.original, this.sourceLanguage);
    this.totalWordCount += wordCount;
    
    this.componentLogger.debug('Translation added for summary', {
      translationCount: this.translations.length,
      wordCount,
      totalWordCount: this.totalWordCount,
      sourceLanguage: this.sourceLanguage
    });
    
    // 進捗的要約の閾値チェック
    setImmediate(() => {
      this.checkProgressiveSummaryThresholds().catch(error => {
        this.componentLogger.error('Failed to check progressive summary thresholds', { error });
      });
    });
  }

  /**
   * 進捗的要約の閾値をチェック
   */
  private async checkProgressiveSummaryThresholds(): Promise<void> {
    const isCharacterBased = this.isCharacterBasedLanguage(this.sourceLanguage);
    const multiplier = isCharacterBased ? 4 : 1;
    
    for (const baseThreshold of this.summaryThresholds) {
      const threshold = baseThreshold * multiplier;
      
      if (this.totalWordCount >= threshold && !this.reachedThresholds.has(threshold)) {
        this.reachedThresholds.add(threshold);
        
        this.componentLogger.info('Progressive summary threshold reached', {
          baseThreshold,
          adjustedThreshold: threshold,
          totalWordCount: this.totalWordCount,
          sourceLanguage: this.sourceLanguage,
          isCharacterBased
        });
        
        this.enqueueProgressiveSummary(baseThreshold, threshold);
      }
    }
  }

  /**
   * 進捗的要約をキューに追加
   */
  private enqueueProgressiveSummary(baseThreshold: number, adjustedThreshold: number): void {
    this.progressiveSummaryQueue.push({ baseThreshold, adjustedThreshold });
    
    if (!this.isGeneratingProgressiveSummary) {
      this.processProgressiveSummaryQueue();
    }
  }

  /**
   * 進捗的要約のキューを処理
   */
  private async processProgressiveSummaryQueue(): Promise<void> {
    if (this.isGeneratingProgressiveSummary || this.progressiveSummaryQueue.length === 0) {
      return;
    }
    
    this.isGeneratingProgressiveSummary = true;
    
    try {
      while (this.progressiveSummaryQueue.length > 0) {
        const { baseThreshold, adjustedThreshold } = this.progressiveSummaryQueue.shift()!;
        
        this.componentLogger.info('Processing progressive summary from queue', {
          baseThreshold,
          adjustedThreshold,
          remainingInQueue: this.progressiveSummaryQueue.length
        });
        
        await this.generateProgressiveSummary(baseThreshold, adjustedThreshold);
        
        if (this.progressiveSummaryQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } finally {
      this.isGeneratingProgressiveSummary = false;
    }
  }

  /**
   * 進捗的要約を生成
   */
  private async generateProgressiveSummary(baseThreshold: number, actualThreshold: number): Promise<void> {
    if (this.translations.length === 0) return;
    
    const startTime = Date.now();
    
    try {
      // 要約対象のコンテンツを収集
      const content = this.translations
        .slice(0, this.lastProgressiveThresholdIndex + 1)
        .map(t => t.original)
        .join(' ');
      
      const prompt = this.getProgressiveSummaryPrompt(content, baseThreshold);
      
      // GPT-5による要約生成
      const response = await this.openai.responses.create({
        model: this.config.summaryModel,
        input: [
          {
            role: 'system',
            content: this.getSummarySystemPrompt()
          },
          { role: 'user', content: prompt }
        ],
        max_output_tokens: this.config.maxTokens,
        reasoning: { effort: 'low' }
      });
      
      const summaryTextInSourceLang = response.output_text || '';
      
      if (summaryTextInSourceLang) {
        // ターゲット言語への翻訳
        const summaryTextInTargetLang = this.sourceLanguage !== this.targetLanguage 
          ? await this.translateToTargetLanguage(summaryTextInSourceLang)
          : summaryTextInSourceLang;
        
        const summary: Summary = {
          id: `summary-progressive-${baseThreshold}-${Date.now()}`,
          timestamp: Date.now(),
          english: this.sourceLanguage === 'en' ? summaryTextInSourceLang : summaryTextInTargetLang,
          japanese: this.targetLanguage === 'ja' ? summaryTextInTargetLang : summaryTextInSourceLang,
          wordCount: actualThreshold,
          startTime: this.translations[0].timestamp,
          endTime: this.translations[this.translations.length - 1].timestamp
        };
        
        this.summaries.push(summary);
        
        // イベントを発火
        if (this.currentCorrelationId) {
          const progressiveSummaryEvent = createProgressiveSummaryEvent(
            {
              english: summary.english,
              japanese: summary.japanese,
              wordCount: this.totalWordCount,
              threshold: baseThreshold,
              startTime: summary.startTime,
              endTime: summary.endTime
            },
            this.currentCorrelationId
          );
          
          this.emit('progressiveSummary', progressiveSummaryEvent);
        }
        
        this.componentLogger.info('Progressive summary generated', {
          baseThreshold,
          actualThreshold,
          actualWordCount: this.totalWordCount,
          duration: Date.now() - startTime
        });
      }
      
    } catch (error) {
      this.componentLogger.error('Failed to generate progressive summary', { error, baseThreshold });
      
      if (this.currentCorrelationId) {
        const errorEvent = createErrorEvent(
          {
            code: 'PROGRESSIVE_SUMMARY_GENERATION_FAILED',
            message: 'Failed to generate progressive summary',
            recoverable: true,
            details: error instanceof Error ? { message: error.message } : {}
          },
          this.currentCorrelationId
        );
        this.emit('error', errorEvent);
      }
    }
  }

  /**
   * ターゲット言語へ翻訳
   */
  private async translateToTargetLanguage(text: string): Promise<string> {
    try {
      const response = await this.openai.responses.create({
        model: 'gpt-5-nano',
        input: [
          {
            role: 'system',
            content: this.getTranslationSystemPrompt()
          },
          { role: 'user', content: text }
        ],
        max_output_tokens: this.config.maxTokens,
        reasoning: { effort: 'minimal' }
      });
      
      return response.output_text || text;
    } catch (error) {
      this.componentLogger.error('Translation failed', { error });
      return text;
    }
  }

  /**
   * 要約を取得
   */
  getSummaries(): Summary[] {
    return [...this.summaries];
  }

  // ========== ユーティリティメソッド ==========

  /**
   * 単語数をカウント
   */
  private countWords(text: string, language: string): number {
    if (this.isCharacterBasedLanguage(language)) {
      // 日本語の場合は文字数をカウント
      return text.replace(/[\s\n]+/g, '').length;
    } else {
      // その他の言語は単語数をカウント
      return text.split(/\s+/).filter(word => word.length > 0).length;
    }
  }

  /**
   * 文字ベースの言語かチェック
   */
  private isCharacterBasedLanguage(language: string): boolean {
    return language === 'ja';  // 現在は日本語のみ
  }

  // ========== プロンプト生成メソッド ==========

  /**
   * 進捗的要約用のプロンプト
   */
  private getProgressiveSummaryPrompt(content: string, threshold: number): string {
    return `Please provide a concise summary of the following content (approximately ${threshold} words):

${content}

Focus on:
1. Main topics and themes
2. Key points and insights
3. Important conclusions or outcomes

Keep the summary informative and well-structured.`;
  }

  /**
   * 要約システムプロンプト
   */
  private getSummarySystemPrompt(): string {
    return `You are an expert summarizer. Create clear, concise summaries that capture the essential information while maintaining readability. Preserve important details and context.`;
  }

  /**
   * 翻訳システムプロンプト
   */
  private getTranslationSystemPrompt(): string {
    const languageNames = this.getLanguageNames();
    return `You are a professional translator. Translate the following text from ${languageNames.source} to ${languageNames.target}. Maintain the tone and meaning while ensuring natural expression in the target language.`;
  }

  /**
   * 言語名を取得
   */
  private getLanguageNames(): { source: string; target: string } {
    const languageMap: Record<string, string> = {
      'en': 'English',
      'ja': 'Japanese',
      'zh': 'Chinese',
      'ko': 'Korean',
      'fr': 'French',
      'de': 'German',
      'es': 'Spanish',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'hi': 'Hindi',
      'nl': 'Dutch'
    };
    
    return {
      source: languageMap[this.sourceLanguage] || this.sourceLanguage,
      target: languageMap[this.targetLanguage] || this.targetLanguage
    };
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.stop();
    this.removeAllListeners();
  }
}