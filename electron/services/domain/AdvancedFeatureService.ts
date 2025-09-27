/**
 * AdvancedFeatureService - 高度な機能の実装
 * 
 * - 定期要約（10分ごと）
 * - 語彙抽出
 * - 最終レポート生成
 */

import { EventEmitter } from 'events';
import OpenAI from 'openai';
import { logger } from '../../utils/logger';
import { 
  createProgressiveSummaryEvent,
  createErrorEvent,
  createVocabularyEvent,
  createFinalReportEvent
} from '../ipc/contracts';

interface AdvancedFeatureConfig {
  openaiApiKey: string;
  summaryInterval?: number; // Default: 10 minutes
  summaryModel?: string;    // Default: gpt-5-mini
  vocabularyModel?: string;  // Default: gpt-5-mini
  reportModel?: string;      // Default: gpt-5
  summaryThresholds?: number[]; // Default: [400, 800, 1600, 2400]
  maxTokens?: {
    summary?: number;
    vocabulary?: number;
    report?: number;
  };
  sourceLanguage?: string;  // 講義の言語
  targetLanguage?: string;  // 翻訳先言語
}

// Domain types for AdvancedFeatureService
interface Translation {
  id: string;
  sourceText: string;
  targetText: string;  // 言語非依存の名前に変更
  timestamp: number;
}

interface Summary {
  id: string;
  timestamp: number;
  sourceText: string;    // 原文（音声認識された言語）
  targetText: string;    // 翻訳文（翻訳後の言語）
  wordCount: number;
  startTime: number;
  endTime: number;
}

interface VocabularyItem {
  term: string;
  definition: string;
  context?: string;
}

export class AdvancedFeatureService extends EventEmitter {
  private openai: OpenAI;
  private config: Required<AdvancedFeatureConfig>;
  private summaryTimer: NodeJS.Timeout | null = null;
  private translations: Translation[] = [];
  private summaries: Summary[] = [];
  private isActive: boolean = false;
  private currentCorrelationId: string | null = null;
  private componentLogger = logger.child('AdvancedFeatureService');
  
  // 段階的要約のための追加プロパティ
  private totalWordCount: number = 0;
  private summaryThresholds: number[] = [400, 800, 1600, 2400];
  private reachedThresholds: Set<number> = new Set();
  
  // 言語設定
  private sourceLanguage: string = 'en';
  private targetLanguage: string = 'ja';
  private lastProgressiveSummary: string | null = null; // For cumulative summary
  private lastProgressiveThresholdIndex: number = -1; // Track last processed translation index
  
  // Progressive summary generation control
  private isGeneratingProgressiveSummary: boolean = false;
  private progressiveSummaryQueue: Array<{ baseThreshold: number; adjustedThreshold: number }> = [];
  
  constructor(config: AdvancedFeatureConfig) {
    super();
    
    this.config = {
      openaiApiKey: config.openaiApiKey,
      summaryInterval: config.summaryInterval ?? parseInt(process.env.SUMMARY_INTERVAL_MS || '600000'), // Default 10 minutes, can be overridden by env
      summaryModel: config.summaryModel ?? 'gpt-5-mini',
      vocabularyModel: config.vocabularyModel ?? 'gpt-5-mini',
      reportModel: config.reportModel ?? 'gpt-5',
      summaryThresholds: config.summaryThresholds ?? (process.env.TEST_MODE === 'true' ? [50, 100, 200, 400] : [400, 800, 1600, 2400]),
      maxTokens: {
        summary: config.maxTokens?.summary ?? 1500,
        vocabulary: config.maxTokens?.vocabulary ?? 1500,
        report: config.maxTokens?.report ?? 8192
      },
      sourceLanguage: config.sourceLanguage ?? 'en',
      targetLanguage: config.targetLanguage ?? 'ja'
    };
    
    this.sourceLanguage = this.config.sourceLanguage;
    this.targetLanguage = this.config.targetLanguage;
    
    // Update summaryThresholds after config is initialized
    this.summaryThresholds = this.config.summaryThresholds;
    
    this.openai = new OpenAI({
      apiKey: this.config.openaiApiKey
    });
  }

  /**
   * STRUCTURAL FIX: Add a method to update languages without re-creating the instance.
   */
  updateLanguages(sourceLanguage: string, targetLanguage: string): void {
    this.sourceLanguage = sourceLanguage;
    this.targetLanguage = targetLanguage;
    this.componentLogger.info('AdvancedFeatureService languages updated', { sourceLanguage, targetLanguage });
  }
  
  /**
   * Start the advanced features service
   */
  start(correlationId: string, sourceLanguage?: string, targetLanguage?: string): void {
    if (this.isActive) {
      this.componentLogger.warn('AdvancedFeatureService already active, resetting for new session.');
      this.stop(); // Stop existing timers and processes before restarting
    }
    
    this.isActive = true;
    this.currentCorrelationId = correlationId;
    this.translations = [];
    this.summaries = [];
    
    // Update languages if provided
    if (sourceLanguage) this.sourceLanguage = sourceLanguage;
    if (targetLanguage) this.targetLanguage = targetLanguage;
    
    // 段階的要約のリセット
    this.totalWordCount = 0;
    this.reachedThresholds.clear();
    this.lastProgressiveSummary = null;
    this.lastProgressiveThresholdIndex = -1;
    
    // Start periodic summary generation
    // DISABLED: User requested to disable periodic summaries (10-minute intervals)
    // this._startPeriodicSummary();
    
    this.componentLogger.info('AdvancedFeatureService started', {
      correlationId,
      summaryInterval: this.config.summaryInterval,
      sourceLanguage: this.sourceLanguage,
      targetLanguage: this.targetLanguage
    });
  }
  
  /**
   * Stop the advanced features service
   */
  async stop(): Promise<void> {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Stop periodic summary
    if (this.summaryTimer) {
      clearInterval(this.summaryTimer);
      this.summaryTimer = null;
    }
    
    // Generate final summary if we have content
    if (this.translations.length > 0) {
      await this.generateSummary(true);
    }
    
    this.componentLogger.info('AdvancedFeatureService stopped');
  }
  
  /**
   * Add a translation for processing
   */
  addTranslation(translation: Translation): void {
    if (!this.isActive) return;
    
    this.translations.push(translation);
    
    // Count words in SOURCE language for summary thresholds
    // This ensures consistent counting regardless of translation target
    const wordCount = this.countWords(translation.sourceText, this.sourceLanguage);
    this.totalWordCount += wordCount;
    
    this.componentLogger.info('Translation added', {
      translationCount: this.translations.length,
      wordCount: wordCount,
      totalWordCount: this.totalWordCount,
      sourceLanguage: this.sourceLanguage,
      targetLanguage: this.targetLanguage
    });
    
    // Check progressive summary thresholds based on source word count
    setImmediate(() => {
      this.checkProgressiveSummaryThresholds().catch(error => {
        this.componentLogger.error('Failed to check progressive summary thresholds', { error });
      });
    });
  }
  
  /**
   * Check if progressive summary thresholds are reached
   */
  private async checkProgressiveSummaryThresholds(): Promise<void> {
    // Adjust thresholds for character-based languages
    const isCharacterBased = this.isCharacterBasedLanguage(this.sourceLanguage);
    const multiplier = isCharacterBased ? parseInt(process.env.CHARACTER_LANGUAGE_MULTIPLIER || '4') : 1;
    
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
   * Enqueue progressive summary generation
   */
  private enqueueProgressiveSummary(baseThreshold: number, adjustedThreshold: number): void {
    this.progressiveSummaryQueue.push({ baseThreshold, adjustedThreshold });
    
    if (!this.isGeneratingProgressiveSummary) {
      this.processProgressiveSummaryQueue();
    }
  }
  
  /**
   * Process progressive summary queue
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
   * Start periodic summary generation
   * @deprecated Disabled per user request - progressive summaries are used instead
   * 
   * This method is kept for reference but is no longer used.
   * Progressive summaries at 400, 800*n word thresholds are used instead.
   */
  /*
  private _startPeriodicSummary(): void {
    if (process.env.DISABLE_PERIODIC_SUMMARY === 'true') {
      this.componentLogger.info('Periodic summary disabled by environment variable');
      return;
    }
    
    this.summaryTimer = setInterval(async () => {
      if (this.translations.length > 0) {
        await this.generateSummary(false);
      }
    }, this.config.summaryInterval);
  }
  */
  
  /**
   * Generate a summary of recent translations
   */
  async generateSummary(isFinal: boolean = false): Promise<void> {
    if (this.translations.length === 0) return;
    
    const startTime = Date.now();
    const wordCount = this.translations.reduce(
      (sum, t) => sum + this.countWords(t.sourceText, this.sourceLanguage), 
      0
    );
    
    this.componentLogger.info('Generating summary', {
      isFinal,
      wordCount,
      translationCount: this.translations.length,
      sourceLanguage: this.sourceLanguage,
      targetLanguage: this.targetLanguage
    });
    
    try {
      const content = this.translations
        .map(t => t.sourceText)
        .join(' ');
      
      const prompt = isFinal
        ? this.getFinalSummaryPrompt(content, wordCount)
        : this.getPeriodicSummaryPrompt(content, wordCount);
      
      const response = await this.openai.responses.create({
        model: this.config.summaryModel,
        input: [
          {
            role: 'system',
            content: this.getSummarySystemPrompt()
          },
          { role: 'user', content: prompt }
        ],
        max_output_tokens: this.config.maxTokens.summary,
        reasoning: { effort: 'low' }
      });
      
      const summaryTextInSourceLang = response.output_text || '';
      
      if (summaryTextInSourceLang) {
        const summaryTextInTargetLang = this.sourceLanguage !== this.targetLanguage 
          ? await this.translateToTargetLanguage(summaryTextInSourceLang)
          : summaryTextInSourceLang;
        
        const summary: Summary = {
          id: `summary-${Date.now()}`,
          timestamp: Date.now(),
          sourceText: summaryTextInSourceLang,
          targetText: summaryTextInTargetLang,
          wordCount,
          startTime: this.translations[0].timestamp,
          endTime: this.translations[this.translations.length - 1].timestamp
        };
        
        this.summaries.push(summary);
        
        // Note: Regular summary events are deprecated
        // Only progressive summaries are used now
        
        if (!isFinal) {
          this.translations = [];
        }
        
        this.componentLogger.info('Summary generated', {
          isFinal,
          wordCount,
          duration: Date.now() - startTime
        });
      }
      
    } catch (error) {
      this.componentLogger.error('Failed to generate summary', { error });
      
      if (this.currentCorrelationId) {
        const errorEvent = createErrorEvent(
          {
            code: 'SUMMARY_GENERATION_FAILED',
            message: 'Failed to generate summary',
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
   * Generate progressive summary at word count thresholds
   */
  async generateProgressiveSummary(baseThreshold: number, actualThreshold: number): Promise<void> {
    if (this.translations.length === 0) return;
    
    const startTime = Date.now();
    
    try {
      let translationsToInclude: Translation[] = [];
      let newContent = '';
      let actualWordCount = 0;
      
      if (this.lastProgressiveSummary) {
        translationsToInclude = this.translations.slice(this.lastProgressiveThresholdIndex + 1);
        newContent = translationsToInclude.map(t => t.sourceText).join(' ');
        actualWordCount = translationsToInclude.reduce((sum, t) => sum + this.countWords(t.sourceText, this.sourceLanguage), 0);
      } else {
        for (let i = 0; i < this.translations.length; i++) {
          const translation = this.translations[i];
          const words = this.countWords(translation.sourceText, this.sourceLanguage);
          if (actualWordCount + words <= actualThreshold) {
            translationsToInclude.push(translation);
            actualWordCount += words;
            this.lastProgressiveThresholdIndex = i;
          } else {
            break;
          }
        }
      }
      
      const prompt = this.lastProgressiveSummary 
        ? this.getCumulativeProgressiveSummaryPrompt(this.lastProgressiveSummary, newContent, baseThreshold)
        : this.getProgressiveSummaryPrompt(translationsToInclude.map(t => t.sourceText).join(' '), baseThreshold);
      
      // Debug logging
      const systemPrompt = this.getSummarySystemPrompt();
      this.componentLogger.info('Progressive summary generation debug', {
        sourceLanguage: this.sourceLanguage,
        targetLanguage: this.targetLanguage,
        systemPromptPreview: systemPrompt.substring(0, 100),
        userPromptPreview: prompt.substring(0, 100),
        baseThreshold,
        actualThreshold
      });
      
      const response = await this.openai.responses.create({
        model: this.config.summaryModel,
        input: [
          {
            role: 'system',
            content: systemPrompt
          },
          { role: 'user', content: prompt }
        ],
        max_output_tokens: this.config.maxTokens.summary,
        reasoning: { effort: 'low' }
      });
      
      const summaryTextInSourceLang = response.output_text || '';
      
      if (summaryTextInSourceLang) {
        const summaryTextInTargetLang = this.sourceLanguage !== this.targetLanguage 
          ? await this.translateToTargetLanguage(summaryTextInSourceLang)
          : summaryTextInSourceLang;
        
        // Debug logging for summary content
        this.componentLogger.info('Progressive summary content debug', {
          summaryInSourceLangPreview: summaryTextInSourceLang.substring(0, 200),
          summaryInTargetLangPreview: summaryTextInTargetLang.substring(0, 200),
          isTranslated: this.sourceLanguage !== this.targetLanguage
        });
        
        const summary: Summary = {
          id: `summary-progressive-${baseThreshold}-${Date.now()}`,
          timestamp: Date.now(),
          sourceText: summaryTextInSourceLang,
          targetText: summaryTextInTargetLang,
          wordCount: actualThreshold,
          startTime: translationsToInclude[0].timestamp,
          endTime: translationsToInclude[translationsToInclude.length - 1].timestamp
        };
        
        this.lastProgressiveSummary = summaryTextInSourceLang;
        
        this.summaries.push(summary);
        
        if (this.currentCorrelationId) {
          const progressiveSummaryEvent = createProgressiveSummaryEvent(
            {
              sourceText: summary.sourceText,
              targetText: summary.targetText,
              sourceLanguage: this.sourceLanguage,
              targetLanguage: this.targetLanguage,
              wordCount: actualWordCount,
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
          actualWordCount,
          duration: Date.now() - startTime,
          isCumulative: !!this.lastProgressiveSummary
        });
      }
      
    } catch (error) {
      this.componentLogger.error('Failed to generate progressive summary', { error, baseThreshold });
    }
  }
  
  
  /**
   * Generate vocabulary list from content
   */
  async generateVocabulary(): Promise<VocabularyItem[]> {
    if (this.translations.length === 0) return [];
    
    try {
      const content = this.translations
        .map(t => t.sourceText)
        .join(' ');
      
      const prompt = this.getVocabularyPrompt(content);
      
      const response = await this.openai.responses.create({
        model: this.config.vocabularyModel,
        input: [
          {
            role: 'system',
            content: this.getVocabularySystemPrompt()
          },
          { role: 'user', content: prompt }
        ],
        max_output_tokens: this.config.maxTokens.vocabulary,
        reasoning: { effort: 'low' }
      });
      
      const vocabularyResponse = response.output_text || '[]';
      
      try {
        let vocabulary: VocabularyItem[];
        try {
          vocabulary = JSON.parse(vocabularyResponse) as VocabularyItem[];
        } catch {
          // BUILD FIX: Correct the regular expression to be valid.
          const jsonMatch = vocabularyResponse.match(/[\s\S]*]/);
          if (jsonMatch) {
            vocabulary = JSON.parse(jsonMatch[0]) as VocabularyItem[];
          } else {
            vocabulary = [];
          }
        }
        
        if (Array.isArray(vocabulary) && vocabulary.length > 0) {
          if (this.currentCorrelationId) {
            const vocabEvent = createVocabularyEvent({
              items: vocabulary,
              totalTerms: vocabulary.length
            }, this.currentCorrelationId);
            this.emit('vocabularyGenerated', vocabEvent);
          }
        }
        
        return vocabulary;
      } catch (error) {
        this.componentLogger.error('Failed to parse vocabulary response', { error });
        return [];
      }
      
    } catch (error) {
      this.componentLogger.error('Failed to generate vocabulary', { error });
      return [];
    }
  }
  
  /**
   * Generate final report
   */
  async generateFinalReport(): Promise<string> {
    if (this.translations.length === 0 && this.summaries.length === 0) {
      return '';
    }
    
    try {
      const totalWordCount = this.translations.reduce(
        (sum, t) => sum + this.countWords(t.sourceText, this.sourceLanguage), 
        0
      );
      
      const content = this.translations
        .map(t => t.sourceText)
        .join(' ');
      
      const summariesContent = this.summaries
        .map(s => s.targetText)
        .join('\n\n');
      
      const vocabulary = await this.generateVocabulary();
      
      const prompt = this.getFinalReportPrompt(content, summariesContent, vocabulary, totalWordCount);
      
      const response = await this.openai.responses.create({
        model: this.config.reportModel,
        input: [
          {
            role: 'system',
            content: this.getFinalReportSystemPrompt()
          },
          { role: 'user', content: prompt }
        ],
        max_output_tokens: this.config.maxTokens.report,
        reasoning: { effort: 'high' }
      });
      
      const report = response.output_text || '';
      
      this.componentLogger.info('Final report generated', {
        wordCount: totalWordCount,
        summaryCount: this.summaries.length,
        vocabularyCount: vocabulary.length
      });
      
      if (report && this.currentCorrelationId) {
        const reportEvent = createFinalReportEvent({
          report,
          totalWordCount,
          summaryCount: this.summaries.length,
          vocabularyCount: vocabulary.length
        }, this.currentCorrelationId);
        this.emit('finalReportGenerated', reportEvent);
      }
      
      return report;
      
    } catch (error) {
      this.componentLogger.error('Failed to generate final report', { error });
      return '';
    }
  }
  
  // =======================================================================
  // REFACTORED PROMPTS (based on user feedback)
  // =======================================================================

  private getLanguageName(code: string): string {
    const names: { [key: string]: string } = {
      ja: 'Japanese', en: 'English'
    };
    return names[code] || code;
  }

  private getSummarySystemPrompt(): string {
    return 'You are an expert at summarizing lecture content. Create concise and clear summaries in English.';
  }

  private getPeriodicSummaryPrompt(content: string, wordCount: number): string {
    return `The following is the lecture content from the past 10 minutes (approximately ${wordCount} words). ` +
           `The original language is ${this.getLanguageName(this.sourceLanguage)}. ` +
           `Please summarize the important points in 3-5 bullet points in English.\n\n` +
           `Lecture content:\n${content}`;
  }

  private getFinalSummaryPrompt(content: string, wordCount: number): string {
    return `The following is the entire lecture content (approximately ${wordCount} words). ` +
           `The original language is ${this.getLanguageName(this.sourceLanguage)}. ` +
           `Please comprehensively summarize the main themes and key points of the lecture in English.\n\n` +
           `Lecture content:\n${content}`;
  }

  private getProgressiveSummaryPrompt(content: string, threshold: number): string {
    return `This is a progressive summary of a lecture. The lecture is in ${this.getLanguageName(this.sourceLanguage)}. ` +
           `Please summarize the following content (up to the ${threshold} word mark) in English.\n\n` +
           `Lecture content:\n${content}`;
  }

  private getCumulativeProgressiveSummaryPrompt(previousSummary: string, newContent: string, threshold: number): string {
    return `You are creating a cumulative summary of a lecture in ${this.getLanguageName(this.sourceLanguage)}. ` +
           `Below is the summary so far, and the new content that follows. ` +
           `Integrate the new content into the previous summary to create an updated, cohesive summary in English. ` +
           `This summary is for the ${threshold} word mark.\n\n` +
           `Previous summary:\n${previousSummary}\n\n` +
           `New content:\n${newContent}`;
  }

  private getVocabularySystemPrompt(): string {
    return 'You are an expert at extracting key vocabulary from academic lectures. Output only valid JSON.';
  }

  private getVocabularyPrompt(content: string): string {
    return `Extract 5-10 important technical terms from the following lecture content, which is in ${this.getLanguageName(this.sourceLanguage)}. ` +
           `Provide a concise definition for each term in English.\n\n` +
           `Lecture content:\n${content}\n\n` +
           `Output in the following JSON format:\n` +
           `[{"term": "term", "definition": "definition", "context": "context where it was used (optional)"}]`;
  }

  private getFinalReportSystemPrompt(): string {
    return 'You are an educational content expert. Create reports that are easy for students to understand and helpful for learning. The report should be in English.';
  }

  private getFinalReportPrompt(content: string, summariesContent: string, vocabulary: VocabularyItem[], totalWordCount: number): string {
    const wordCountRounded = Math.floor(totalWordCount / 100) * 100;
    const vocabList = vocabulary.map(v => `- ${v.term}: ${v.definition}`).join('\n');
    return `The following is a lecture of approximately ${wordCountRounded} words, delivered in ${this.getLanguageName(this.sourceLanguage)}. ` +
           `Please create a Markdown report in English that is easy to understand for high school students.\n\n` +
           `Lecture content:\n${content}\n\n` +
           `Previous summaries (in English):\n${summariesContent}\n\n` +
           `Key vocabulary (in English):\n${vocabList}\n\n` +
           `Please create the report with the following structure:\n` +
           `1. **Overview** - Summarize the entire lecture in 2-3 sentences\n` +
           `2. **Topic List** - List the main topics in bullet points\n` +
           `3. **Key Points** - 3-5 important points\n` +
           `4. **Important Terms** - Technical terms with explanations\n` +
           `5. **Q&A / Discussion** - If applicable\n` +
           `6. **Conclusion** - Key takeaways`;
  }

  private async translateToTargetLanguage(text: string): Promise<string> {
    try {
      if (this.sourceLanguage === this.targetLanguage) {
        return text;
      }
      
      const response = await this.openai.responses.create({
        model: 'gpt-5-nano',
        input: [
          {
            role: 'system',
            content: `Translate the following English text into natural ${this.getLanguageName(this.targetLanguage)}. Output ONLY the translation, no explanations.`
          },
          { role: 'user', content: text }
        ],
        max_output_tokens: this.config.maxTokens.summary,
        reasoning: { effort: 'minimal' }
      });
      
      return response.output_text || text;
      
    } catch (error) {
      this.componentLogger.error('Failed to translate to target language', { error });
      return text;
    }
  }
  
  getSummaries(): Summary[] {
    return [...this.summaries];
  }

  private isCharacterBasedLanguage(language: string): boolean {
    return language === 'ja';
  }

  private countWords(text: string, language: string): number {
    if (this.isCharacterBasedLanguage(language)) {
      const cleanedText = text.replace(/[。、！？,.!?\s]/g, '');
      return cleanedText.length;
    } else {
      return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
  }

  destroy(): void {
    this.stop();
    this.removeAllListeners();
  }
}