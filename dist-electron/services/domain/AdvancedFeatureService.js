"use strict";
/**
 * AdvancedFeatureService - 高度な機能の実装
 *
 * - 定期要約（10分ごと）
 * - 語彙抽出
 * - 最終レポート生成
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedFeatureService = void 0;
const events_1 = require("events");
const openai_1 = __importDefault(require("openai"));
const logger_1 = require("../../utils/logger");
const contracts_1 = require("../ipc/contracts");
class AdvancedFeatureService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.summaryTimer = null;
        this.translations = [];
        this.summaries = [];
        this.isActive = false;
        this.currentCorrelationId = null;
        this.componentLogger = logger_1.logger.child('AdvancedFeatureService');
        // 段階的要約のための追加プロパティ
        this.totalWordCount = 0;
        this.summaryThresholds = [400, 800, 1600, 2400];
        this.reachedThresholds = new Set();
        // 言語設定
        this.sourceLanguage = 'en';
        this.targetLanguage = 'ja';
        this.lastProgressiveSummary = null; // For cumulative summary
        this.lastProgressiveThresholdIndex = -1; // Track last processed translation index
        // Progressive summary generation control
        this.isGeneratingProgressiveSummary = false;
        this.progressiveSummaryQueue = [];
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
        this.openai = new openai_1.default({
            apiKey: this.config.openaiApiKey
        });
    }
    /**
     * STRUCTURAL FIX: Add a method to update languages without re-creating the instance.
     */
    updateLanguages(sourceLanguage, targetLanguage) {
        this.sourceLanguage = sourceLanguage;
        this.targetLanguage = targetLanguage;
        this.componentLogger.info('AdvancedFeatureService languages updated', { sourceLanguage, targetLanguage });
    }
    /**
     * Start the advanced features service
     */
    start(correlationId, sourceLanguage, targetLanguage) {
        if (this.isActive) {
            this.componentLogger.warn('AdvancedFeatureService already active, resetting for new session.');
            this.stop(); // Stop existing timers and processes before restarting
        }
        this.isActive = true;
        this.currentCorrelationId = correlationId;
        this.translations = [];
        this.summaries = [];
        // Update languages if provided
        if (sourceLanguage)
            this.sourceLanguage = sourceLanguage;
        if (targetLanguage)
            this.targetLanguage = targetLanguage;
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
    async stop() {
        if (!this.isActive)
            return;
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
    addTranslation(translation) {
        if (!this.isActive)
            return;
        this.translations.push(translation);
        // Count words in SOURCE language for summary thresholds
        // This ensures consistent counting regardless of translation target
        const wordCount = this.countWords(translation.original, this.sourceLanguage);
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
    async checkProgressiveSummaryThresholds() {
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
    enqueueProgressiveSummary(baseThreshold, adjustedThreshold) {
        this.progressiveSummaryQueue.push({ baseThreshold, adjustedThreshold });
        if (!this.isGeneratingProgressiveSummary) {
            this.processProgressiveSummaryQueue();
        }
    }
    /**
     * Process progressive summary queue
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
    async generateSummary(isFinal = false) {
        if (this.translations.length === 0)
            return;
        const startTime = Date.now();
        const wordCount = this.translations.reduce((sum, t) => sum + this.countWords(t.original, this.sourceLanguage), 0);
        this.componentLogger.info('Generating summary', {
            isFinal,
            wordCount,
            translationCount: this.translations.length,
            sourceLanguage: this.sourceLanguage,
            targetLanguage: this.targetLanguage
        });
        try {
            const content = this.translations
                .map(t => t.original)
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
                const summary = {
                    id: `summary-${Date.now()}`,
                    timestamp: Date.now(),
                    english: this.sourceLanguage === 'en' ? summaryTextInSourceLang : summaryTextInTargetLang,
                    japanese: this.targetLanguage === 'ja' ? summaryTextInTargetLang : summaryTextInSourceLang,
                    wordCount,
                    startTime: this.translations[0].timestamp,
                    endTime: this.translations[this.translations.length - 1].timestamp
                };
                this.summaries.push(summary);
                if (this.currentCorrelationId) {
                    const summaryEvent = (0, contracts_1.createSummaryEvent)({
                        english: summary.english,
                        japanese: summary.japanese,
                        wordCount,
                        startTime: summary.startTime,
                        endTime: summary.endTime
                    }, this.currentCorrelationId);
                    this.emit('summaryGenerated', summaryEvent);
                }
                if (!isFinal) {
                    this.translations = [];
                }
                this.componentLogger.info('Summary generated', {
                    isFinal,
                    wordCount,
                    duration: Date.now() - startTime
                });
            }
        }
        catch (error) {
            this.componentLogger.error('Failed to generate summary', { error });
            if (this.currentCorrelationId) {
                const errorEvent = (0, contracts_1.createErrorEvent)({
                    code: 'SUMMARY_GENERATION_FAILED',
                    message: 'Failed to generate summary',
                    recoverable: true,
                    details: error instanceof Error ? { message: error.message } : {}
                }, this.currentCorrelationId);
                this.emit('error', errorEvent);
            }
        }
    }
    /**
     * Generate progressive summary at word count thresholds
     */
    async generateProgressiveSummary(baseThreshold, actualThreshold) {
        if (this.translations.length === 0)
            return;
        const startTime = Date.now();
        try {
            let translationsToInclude = [];
            let newContent = '';
            let actualWordCount = 0;
            if (this.lastProgressiveSummary) {
                translationsToInclude = this.translations.slice(this.lastProgressiveThresholdIndex + 1);
                newContent = translationsToInclude.map(t => t.original).join(' ');
                actualWordCount = translationsToInclude.reduce((sum, t) => sum + this.countWords(t.original, this.sourceLanguage), 0);
            }
            else {
                for (let i = 0; i < this.translations.length; i++) {
                    const translation = this.translations[i];
                    const words = this.countWords(translation.original, this.sourceLanguage);
                    if (actualWordCount + words <= actualThreshold) {
                        translationsToInclude.push(translation);
                        actualWordCount += words;
                        this.lastProgressiveThresholdIndex = i;
                    }
                    else {
                        break;
                    }
                }
            }
            const prompt = this.lastProgressiveSummary
                ? this.getCumulativeProgressiveSummaryPrompt(this.lastProgressiveSummary, newContent, baseThreshold)
                : this.getProgressiveSummaryPrompt(translationsToInclude.map(t => t.original).join(' '), baseThreshold);
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
                const summary = {
                    id: `summary-progressive-${baseThreshold}-${Date.now()}`,
                    timestamp: Date.now(),
                    english: this.sourceLanguage === 'en' ? summaryTextInSourceLang : summaryTextInTargetLang,
                    japanese: this.targetLanguage === 'ja' ? summaryTextInTargetLang : summaryTextInSourceLang,
                    wordCount: actualThreshold,
                    startTime: translationsToInclude[0].timestamp,
                    endTime: translationsToInclude[translationsToInclude.length - 1].timestamp
                };
                this.lastProgressiveSummary = summaryTextInSourceLang;
                this.summaries.push(summary);
                if (this.currentCorrelationId) {
                    const progressiveSummaryEvent = (0, contracts_1.createProgressiveSummaryEvent)({
                        english: summary.english,
                        japanese: summary.japanese,
                        wordCount: actualWordCount,
                        threshold: baseThreshold,
                        startTime: summary.startTime,
                        endTime: summary.endTime
                    }, this.currentCorrelationId);
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
        }
        catch (error) {
            this.componentLogger.error('Failed to generate progressive summary', { error, baseThreshold });
        }
    }
    /**
     * Generate vocabulary list from content
     */
    async generateVocabulary() {
        if (this.translations.length === 0)
            return [];
        try {
            const content = this.translations
                .map(t => t.original)
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
                let vocabulary;
                try {
                    vocabulary = JSON.parse(vocabularyResponse);
                }
                catch {
                    // BUILD FIX: Correct the regular expression to be valid.
                    const jsonMatch = vocabularyResponse.match(/[\s\S]*]/);
                    if (jsonMatch) {
                        vocabulary = JSON.parse(jsonMatch[0]);
                    }
                    else {
                        vocabulary = [];
                    }
                }
                if (Array.isArray(vocabulary) && vocabulary.length > 0) {
                    if (this.currentCorrelationId) {
                        const vocabEvent = (0, contracts_1.createVocabularyEvent)({
                            items: vocabulary,
                            totalTerms: vocabulary.length
                        }, this.currentCorrelationId);
                        this.emit('vocabularyGenerated', vocabEvent);
                    }
                }
                return vocabulary;
            }
            catch (error) {
                this.componentLogger.error('Failed to parse vocabulary response', { error });
                return [];
            }
        }
        catch (error) {
            this.componentLogger.error('Failed to generate vocabulary', { error });
            return [];
        }
    }
    /**
     * Generate final report
     */
    async generateFinalReport() {
        if (this.translations.length === 0 && this.summaries.length === 0) {
            return '';
        }
        try {
            const totalWordCount = this.translations.reduce((sum, t) => sum + this.countWords(t.original, this.sourceLanguage), 0);
            const content = this.translations
                .map(t => t.original)
                .join(' ');
            const summariesContent = this.summaries
                .map(s => this.targetLanguage === 'ja' ? s.japanese : s.english)
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
                const reportEvent = (0, contracts_1.createFinalReportEvent)({
                    report,
                    totalWordCount,
                    summaryCount: this.summaries.length,
                    vocabularyCount: vocabulary.length
                }, this.currentCorrelationId);
                this.emit('finalReportGenerated', reportEvent);
            }
            return report;
        }
        catch (error) {
            this.componentLogger.error('Failed to generate final report', { error });
            return '';
        }
    }
    // =======================================================================
    // REFACTORED PROMPTS (based on user feedback)
    // =======================================================================
    getLanguageName(code) {
        const names = {
            ja: 'Japanese', en: 'English'
        };
        return names[code] || code;
    }
    getSummarySystemPrompt() {
        return 'You are an expert at summarizing lecture content. Create concise and clear summaries in English.';
    }
    getPeriodicSummaryPrompt(content, wordCount) {
        return `The following is the lecture content from the past 10 minutes (approximately ${wordCount} words). ` +
            `The original language is ${this.getLanguageName(this.sourceLanguage)}. ` +
            `Please summarize the important points in 3-5 bullet points in English.\n\n` +
            `Lecture content:\n${content}`;
    }
    getFinalSummaryPrompt(content, wordCount) {
        return `The following is the entire lecture content (approximately ${wordCount} words). ` +
            `The original language is ${this.getLanguageName(this.sourceLanguage)}. ` +
            `Please comprehensively summarize the main themes and key points of the lecture in English.\n\n` +
            `Lecture content:\n${content}`;
    }
    getProgressiveSummaryPrompt(content, threshold) {
        return `This is a progressive summary of a lecture. The lecture is in ${this.getLanguageName(this.sourceLanguage)}. ` +
            `Please summarize the following content (up to the ${threshold} word mark) in English.\n\n` +
            `Lecture content:\n${content}`;
    }
    getCumulativeProgressiveSummaryPrompt(previousSummary, newContent, threshold) {
        return `You are creating a cumulative summary of a lecture in ${this.getLanguageName(this.sourceLanguage)}. ` +
            `Below is the summary so far, and the new content that follows. ` +
            `Integrate the new content into the previous summary to create an updated, cohesive summary in English. ` +
            `This summary is for the ${threshold} word mark.\n\n` +
            `Previous summary:\n${previousSummary}\n\n` +
            `New content:\n${newContent}`;
    }
    getVocabularySystemPrompt() {
        return 'You are an expert at extracting key vocabulary from academic lectures. Output only valid JSON.';
    }
    getVocabularyPrompt(content) {
        return `Extract 5-10 important technical terms from the following lecture content, which is in ${this.getLanguageName(this.sourceLanguage)}. ` +
            `Provide a concise definition for each term in English.\n\n` +
            `Lecture content:\n${content}\n\n` +
            `Output in the following JSON format:\n` +
            `[{"term": "term", "definition": "definition", "context": "context where it was used (optional)"}]`;
    }
    getFinalReportSystemPrompt() {
        return 'You are an educational content expert. Create reports that are easy for students to understand and helpful for learning. The report should be in English.';
    }
    getFinalReportPrompt(content, summariesContent, vocabulary, totalWordCount) {
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
    async translateToTargetLanguage(text) {
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
        }
        catch (error) {
            this.componentLogger.error('Failed to translate to target language', { error });
            return text;
        }
    }
    getSummaries() {
        return [...this.summaries];
    }
    isCharacterBasedLanguage(language) {
        return language === 'ja';
    }
    countWords(text, language) {
        if (this.isCharacterBasedLanguage(language)) {
            const cleanedText = text.replace(/[。、！？,.!?\s]/g, '');
            return cleanedText.length;
        }
        else {
            return text.trim().split(/\s+/).filter(word => word.length > 0).length;
        }
    }
    destroy() {
        this.stop();
        this.removeAllListeners();
    }
}
exports.AdvancedFeatureService = AdvancedFeatureService;
