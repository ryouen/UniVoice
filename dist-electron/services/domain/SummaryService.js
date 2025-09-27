"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummaryService = void 0;
const events_1 = require("events");
const openai_1 = require("openai");
const contracts_1 = require("../ipc/contracts");
const logger_1 = require("../../utils/logger");
class SummaryService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.isActive = false;
        this.currentCorrelationId = null;
        this.componentLogger = logger_1.logger.child('SummaryService');
        // 要約生成用のデータ
        this.translations = [];
        this.summaries = [];
        this.totalWordCount = 0;
        this.summaryThresholds = [400, 800, 1600, 2400];
        this.reachedThresholds = new Set();
        // 進捗的要約の管理
        this.lastProgressiveThresholdIndex = -1;
        this.progressiveSummaryQueue = [];
        this.isGeneratingProgressiveSummary = false;
        this.config = config;
        this.openai = new openai_1.OpenAI({ apiKey: config.openaiApiKey });
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
    start(correlationId, sourceLanguage, targetLanguage) {
        if (this.isActive) {
            this.componentLogger.warn('SummaryService already active');
            return;
        }
        this.isActive = true;
        this.currentCorrelationId = correlationId;
        this.translations = [];
        this.summaries = [];
        // 言語設定の更新
        if (sourceLanguage)
            this.sourceLanguage = sourceLanguage;
        if (targetLanguage)
            this.targetLanguage = targetLanguage;
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
    stop() {
        if (!this.isActive)
            return;
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
    addTranslation(translation) {
        if (!this.isActive)
            return;
        this.translations.push(translation);
        // 単語数をカウント（ソース言語で）
        const wordCount = this.countWords(translation.sourceText, this.sourceLanguage);
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
    async checkProgressiveSummaryThresholds() {
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
    enqueueProgressiveSummary(baseThreshold, adjustedThreshold) {
        this.progressiveSummaryQueue.push({ baseThreshold, adjustedThreshold });
        if (!this.isGeneratingProgressiveSummary) {
            this.processProgressiveSummaryQueue();
        }
    }
    /**
     * 進捗的要約のキューを処理
     */
    async processProgressiveSummaryQueue() {
        if (this.isGeneratingProgressiveSummary || this.progressiveSummaryQueue.length === 0) {
            return;
        }
        this.isGeneratingProgressiveSummary = true;
        try {
            while (this.progressiveSummaryQueue.length > 0) {
                const { baseThreshold, adjustedThreshold } = this.progressiveSummaryQueue.shift();
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
        }
        finally {
            this.isGeneratingProgressiveSummary = false;
        }
    }
    /**
     * 進捗的要約を生成
     */
    async generateProgressiveSummary(baseThreshold, actualThreshold) {
        if (this.translations.length === 0)
            return;
        const startTime = Date.now();
        try {
            // 要約対象のコンテンツを収集
            const content = this.translations
                .slice(0, this.lastProgressiveThresholdIndex + 1)
                .map(t => t.sourceText)
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
                const summary = {
                    id: `summary-progressive-${baseThreshold}-${Date.now()}`,
                    timestamp: Date.now(),
                    sourceText: summaryTextInSourceLang,
                    targetText: summaryTextInTargetLang,
                    wordCount: actualThreshold,
                    startTime: this.translations[0].timestamp,
                    endTime: this.translations[this.translations.length - 1].timestamp
                };
                this.summaries.push(summary);
                // イベントを発火
                if (this.currentCorrelationId) {
                    const progressiveSummaryEvent = (0, contracts_1.createProgressiveSummaryEvent)({
                        sourceText: summary.sourceText,
                        targetText: summary.targetText,
                        sourceLanguage: this.sourceLanguage,
                        targetLanguage: this.targetLanguage,
                        wordCount: this.totalWordCount,
                        threshold: baseThreshold,
                        startTime: summary.startTime,
                        endTime: summary.endTime
                    }, this.currentCorrelationId);
                    this.emit('progressiveSummary', progressiveSummaryEvent);
                }
                this.componentLogger.info('Progressive summary generated', {
                    baseThreshold,
                    actualThreshold,
                    actualWordCount: this.totalWordCount,
                    duration: Date.now() - startTime
                });
            }
        }
        catch (error) {
            this.componentLogger.error('Failed to generate progressive summary', { error, baseThreshold });
            if (this.currentCorrelationId) {
                const errorEvent = (0, contracts_1.createErrorEvent)({
                    code: 'PROGRESSIVE_SUMMARY_GENERATION_FAILED',
                    message: 'Failed to generate progressive summary',
                    recoverable: true,
                    details: error instanceof Error ? { message: error.message } : {}
                }, this.currentCorrelationId);
                this.emit('error', errorEvent);
            }
        }
    }
    /**
     * ターゲット言語へ翻訳
     */
    async translateToTargetLanguage(text) {
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
        }
        catch (error) {
            this.componentLogger.error('Translation failed', { error });
            return text;
        }
    }
    /**
     * 要約を取得
     */
    getSummaries() {
        return [...this.summaries];
    }
    // ========== ユーティリティメソッド ==========
    /**
     * 単語数をカウント
     */
    countWords(text, language) {
        if (this.isCharacterBasedLanguage(language)) {
            // 日本語の場合は文字数をカウント
            return text.replace(/[\s\n]+/g, '').length;
        }
        else {
            // その他の言語は単語数をカウント
            return text.split(/\s+/).filter(word => word.length > 0).length;
        }
    }
    /**
     * 文字ベースの言語かチェック
     */
    isCharacterBasedLanguage(language) {
        return language === 'ja'; // 現在は日本語のみ
    }
    // ========== プロンプト生成メソッド ==========
    /**
     * 進捗的要約用のプロンプト
     */
    getProgressiveSummaryPrompt(content, threshold) {
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
    getSummarySystemPrompt() {
        return `You are an expert summarizer. Create clear, concise summaries that capture the essential information while maintaining readability. Preserve important details and context.`;
    }
    /**
     * 翻訳システムプロンプト
     */
    getTranslationSystemPrompt() {
        const languageNames = this.getLanguageNames();
        return `You are a professional translator. Translate the following text from ${languageNames.source} to ${languageNames.target}. Maintain the tone and meaning while ensuring natural expression in the target language.`;
    }
    /**
     * 言語名を取得
     */
    getLanguageNames() {
        const languageMap = {
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
    destroy() {
        this.stop();
        this.removeAllListeners();
    }
}
exports.SummaryService = SummaryService;
