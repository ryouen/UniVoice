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
        this.config = {
            openaiApiKey: config.openaiApiKey,
            summaryInterval: config.summaryInterval ?? parseInt(process.env.SUMMARY_INTERVAL_MS || '600000'), // Default 10 minutes, can be overridden by env
            summaryModel: config.summaryModel ?? 'gpt-5-mini',
            vocabularyModel: config.vocabularyModel ?? 'gpt-5-mini',
            reportModel: config.reportModel ?? 'gpt-5',
            summaryThresholds: config.summaryThresholds ?? [400, 800, 1600, 2400],
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
     * Start the advanced features service
     */
    start(correlationId, sourceLanguage, targetLanguage) {
        if (this.isActive) {
            this.componentLogger.warn('AdvancedFeatureService already active');
            return;
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
        // Start periodic summary generation
        this.startPeriodicSummary();
        this.componentLogger.info('AdvancedFeatureService started', {
            correlationId,
            summaryInterval: this.config.summaryInterval
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
        this.checkProgressiveSummaryThresholds();
    }
    /**
     * Check if progressive summary thresholds are reached
     */
    async checkProgressiveSummaryThresholds() {
        for (const threshold of this.summaryThresholds) {
            if (this.totalWordCount >= threshold && !this.reachedThresholds.has(threshold)) {
                this.reachedThresholds.add(threshold);
                this.componentLogger.info('Progressive summary threshold reached', {
                    threshold,
                    totalWordCount: this.totalWordCount
                });
                // 段階的要約を生成
                await this.generateProgressiveSummary(threshold);
            }
        }
    }
    /**
     * Start periodic summary generation
     */
    startPeriodicSummary() {
        this.summaryTimer = setInterval(async () => {
            if (this.translations.length > 0) {
                await this.generateSummary(false);
            }
        }, this.config.summaryInterval);
    }
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
            // For summary generation, use ONLY the original source content
            // This ensures summaries are based on actual lecture content, not translations
            const content = this.translations
                .map(t => t.original)
                .join(' ');
            const prompt = isFinal
                ? this.getFinalSummaryPrompt(content, wordCount)
                : this.getPeriodicSummaryPrompt(content, wordCount);
            // Generate summary
            // 🔴 CRITICAL: responses.create を使用（chat.completions.createではない）
            // UnifiedPipelineService.tsの正しいパターンに準拠
            const response = await this.openai.responses.create({
                model: this.config.summaryModel,
                input: [
                    {
                        role: 'system',
                        content: this.getSummarySystemPrompt() // 言語に応じたプロンプトを使用
                    },
                    { role: 'user', content: prompt }
                ],
                max_output_tokens: this.config.maxTokens.summary,
                reasoning: { effort: 'low' } // 要約には少し推論を使用
            });
            const summaryTextInSourceLang = response.output_text || '';
            if (summaryTextInSourceLang) {
                // Translate summary to target language if needed
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
                // Emit summary event
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
                // Clear translations after summary (for periodic summaries)
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
    async generateProgressiveSummary(threshold) {
        if (this.translations.length === 0)
            return;
        const startTime = Date.now();
        try {
            // Calculate word count up to threshold
            let wordCount = 0;
            let translationsToInclude = [];
            for (const translation of this.translations) {
                const words = this.countWords(translation.original, this.sourceLanguage);
                if (wordCount + words <= threshold) {
                    translationsToInclude.push(translation);
                    wordCount += words;
                }
                else {
                    break;
                }
            }
            // For summary generation, use ONLY the original source content
            // This ensures summaries are based on actual lecture content, not translations
            const content = translationsToInclude
                .map(t => t.original)
                .join(' ');
            const prompt = this.getProgressiveSummaryPrompt(content, threshold);
            // Generate summary
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
                // Translate summary to target language if needed
                const summaryTextInTargetLang = this.sourceLanguage !== this.targetLanguage
                    ? await this.translateToTargetLanguage(summaryTextInSourceLang)
                    : summaryTextInSourceLang;
                const summary = {
                    id: `summary-progressive-${threshold}-${Date.now()}`,
                    timestamp: Date.now(),
                    english: this.sourceLanguage === 'en' ? summaryTextInSourceLang : summaryTextInTargetLang,
                    japanese: this.targetLanguage === 'ja' ? summaryTextInTargetLang : summaryTextInSourceLang,
                    wordCount: threshold,
                    startTime: translationsToInclude[0].timestamp,
                    endTime: translationsToInclude[translationsToInclude.length - 1].timestamp
                };
                this.summaries.push(summary);
                // Emit progressive summary event
                if (this.currentCorrelationId) {
                    const progressiveSummaryEvent = (0, contracts_1.createProgressiveSummaryEvent)({
                        english: summary.english,
                        japanese: summary.japanese,
                        wordCount: wordCount,
                        threshold: threshold,
                        startTime: summary.startTime,
                        endTime: summary.endTime
                    }, this.currentCorrelationId);
                    this.emit('progressiveSummary', progressiveSummaryEvent);
                }
                this.componentLogger.info('Progressive summary generated', {
                    threshold,
                    actualWordCount: wordCount,
                    duration: Date.now() - startTime
                });
            }
        }
        catch (error) {
            this.componentLogger.error('Failed to generate progressive summary', { error, threshold });
        }
    }
    /**
     * Generate vocabulary list from content
     * This method both returns the vocabulary and emits an event
     */
    async generateVocabulary() {
        if (this.translations.length === 0)
            return [];
        try {
            const content = this.translations
                .map(t => t.original)
                .join(' ');
            const prompt = this.getVocabularyPrompt(content);
            // 🔴 CRITICAL: responses.create を使用（chat.completions.createではない）
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
                // Note: response_format is not supported in responses API, JSON output is handled through prompt instructions
            });
            const vocabularyResponse = response.output_text || '[]';
            try {
                let vocabulary;
                try {
                    vocabulary = JSON.parse(vocabularyResponse);
                }
                catch {
                    // Try to extract JSON from the response
                    const jsonMatch = vocabularyResponse.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        vocabulary = JSON.parse(jsonMatch[0]);
                    }
                    else {
                        vocabulary = [];
                    }
                }
                if (Array.isArray(vocabulary) && vocabulary.length > 0) {
                    // Emit vocabulary event
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
    /**
     * Generate final report
     * This method both returns the report and emits an event
     */
    async generateFinalReport() {
        if (this.translations.length === 0 && this.summaries.length === 0) {
            return '';
        }
        try {
            const totalWordCount = this.translations.reduce((sum, t) => sum + this.countWords(t.original, this.sourceLanguage), 0);
            // Use only source content for final report
            const content = this.translations
                .map(t => t.original)
                .join(' ');
            // Use appropriate language field based on target language
            const summariesContent = this.summaries
                .map(s => this.targetLanguage === 'ja' ? s.japanese : s.english)
                .join('\n\n');
            const vocabulary = await this.generateVocabulary();
            const prompt = this.getFinalReportPrompt(content, summariesContent, vocabulary, totalWordCount);
            // 🔴 CRITICAL: responses.create を使用（chat.completions.createではない）
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
                reasoning: { effort: 'high' } // レポートには高度な推論を使用
            });
            const report = response.output_text || '';
            this.componentLogger.info('Final report generated', {
                wordCount: totalWordCount,
                summaryCount: this.summaries.length,
                vocabularyCount: vocabulary.length
            });
            // Emit final report event
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
    /**
     * Get progressive summary prompt based on threshold
     */
    getProgressiveSummaryPrompt(content, threshold) {
        const promptMap = {
            400: this.getProgressiveSummaryPromptForThreshold(content, 400),
            800: this.getProgressiveSummaryPromptForThreshold(content, 800),
            1600: this.getProgressiveSummaryPromptForThreshold(content, 1600),
            2400: this.getProgressiveSummaryPromptForThreshold(content, 2400)
        };
        return promptMap[threshold] || this.getPeriodicSummaryPrompt(content, threshold);
    }
    /**
     * Get periodic summary prompt
     */
    getPeriodicSummaryPrompt(content, wordCount) {
        const promptMap = {
            'ja': `以下は過去10分間の講義内容です（約${wordCount}語）。
重要なポイントを箇条書きで3-5個にまとめてください。

講義内容：
${content}

要約は以下の形式で：
- ポイント1
- ポイント2
- ポイント3
（必要に応じて追加）`,
            'en': `The following is the lecture content from the past 10 minutes (approximately ${wordCount} words).
Please summarize the important points in 3-5 bullet points.

Lecture content:
${content}

Summary in the following format:
- Point 1
- Point 2
- Point 3
(Add more if necessary)`,
            'zh': `以下是过去10分钟的讲座内容（约${wordCount}词）。
请用 3-5 个要点总结重要内容。

讲座内容：
${content}

按以下格式总结：
- 要点1
- 要点2
- 要点3
（如需要可添加更多）`
        };
        return promptMap[this.sourceLanguage] || promptMap['en'];
    }
    /**
     * Get final summary prompt
     */
    getFinalSummaryPrompt(content, wordCount) {
        const promptMap = {
            'ja': `以下は講義全体の内容です（約${wordCount}語）。
講義の主要なテーマと重要ポイントを包括的にまとめてください。

講義内容：
${content}

以下の構成でまとめてください：
1. 主要テーマ（1-2文）
2. 重要ポイント（3-5個）
3. 結論または要点`,
            'en': `The following is the entire lecture content (approximately ${wordCount} words).
Please comprehensively summarize the main themes and key points of the lecture.

Lecture content:
${content}

Please organize the summary as follows:
1. Main themes (1-2 sentences)
2. Key points (3-5 items)
3. Conclusion or main takeaways`,
            'zh': `以下是整个讲座内容（约${wordCount}词）。
请全面总结讲座的主要主题和重点。

讲座内容：
${content}

请按以下结构总结：
1. 主要主题（1-2句）
2. 重点（3-5项）
3. 结论或要点`
        };
        return promptMap[this.sourceLanguage] || promptMap['en'];
    }
    /**
     * Translate text to target language
     */
    async translateToTargetLanguage(text) {
        try {
            // ソース言語とターゲット言語が同じ場合は翻訳不要
            if (this.sourceLanguage === this.targetLanguage) {
                return text;
            }
            // 🔴 CRITICAL: responses.create を使用（chat.completions.createではない）
            const response = await this.openai.responses.create({
                model: 'gpt-5-nano',
                input: [
                    {
                        role: 'system',
                        content: this.getTranslationSystemPrompt()
                    },
                    { role: 'user', content: text }
                ],
                // temperature パラメータは削除済み（GPT-5では1.0のみサポート）
                max_output_tokens: this.config.maxTokens.summary,
                reasoning: { effort: 'minimal' } // 単純な翻訳なので最小限の推論
            });
            return response.output_text || text;
        }
        catch (error) {
            this.componentLogger.error('Failed to translate to target language', { error });
            return text;
        }
    }
    /**
     * Get current summaries
     */
    getSummaries() {
        return [...this.summaries];
    }
    /**
     * Get summary system prompt based on source language
     */
    getSummarySystemPrompt() {
        const promptMap = {
            'ja': 'あなたは講義内容を要約する専門家です。簡潔で分かりやすい要約を作成してください。',
            'en': 'You are an expert at summarizing lecture content. Create concise and clear summaries.',
            'zh': '您是总结讲座内容的专家。请创建简洁明了的摘要。',
            'es': 'Eres un experto en resumir contenidos de conferencias. Crea resúmenes concisos y claros.',
            'fr': 'Vous êtes un expert dans la synthèse de contenu de cours. Créez des résumés concis et clairs.',
            'de': 'Sie sind ein Experte für die Zusammenfassung von Vorlesungsinhalten. Erstellen Sie prägnante und klare Zusammenfassungen.',
            'ko': '강의 내용 요약 전문가입니다. 간결하고 명확한 요약을 작성해주세요.',
            'pt': 'Você é um especialista em resumir conteúdo de palestras. Crie resumos concisos e claros.',
            'ru': 'Вы эксперт по обобщению лекционного материала. Создавайте краткие и понятные резюме.',
            'it': 'Sei un esperto nel riassumere contenuti di lezioni. Crea riassunti concisi e chiari.',
            'ar': 'أنت خبير في تلخيص محتوى المحاضرات. قم بإنشاء ملخصات موجزة وواضحة.',
            'hi': 'आप व्याख्यान सामग्री को सारांशित करने में विशेषज्ञ हैं। संक्षिप्त और स्पष्ट सारांश बनाएं।',
            'vi': 'Bạn là chuyên gia tóm tắt nội dung bài giảng. Tạo các bản tóm tắt ngắn gọn và rõ ràng.',
            'th': 'คุณเป็นผู้เชี่ยวชาญในการสรุปเนื้อหาการบรรยาย สร้างสรุปที่กระชับและชัดเจน',
            'tr': 'Ders içeriğini özetleme konusunda uzmansınız. Özlü ve net özetler oluşturun.',
            'pl': 'Jesteś ekspertem w podsumowywaniu treści wykładów. Twórz zwięzłe i jasne podsumowania.'
        };
        return promptMap[this.sourceLanguage] || promptMap['en'];
    }
    /**
     * Get translation system prompt
     */
    getTranslationSystemPrompt() {
        const languageNames = {
            'ja': 'Japanese', 'en': 'English', 'zh': 'Chinese', 'es': 'Spanish',
            'fr': 'French', 'de': 'German', 'ko': 'Korean', 'pt': 'Portuguese',
            'ru': 'Russian', 'it': 'Italian', 'ar': 'Arabic', 'hi': 'Hindi',
            'vi': 'Vietnamese', 'th': 'Thai', 'tr': 'Turkish', 'pl': 'Polish'
        };
        const sourceLang = languageNames[this.sourceLanguage] || 'English';
        const targetLang = languageNames[this.targetLanguage] || 'Japanese';
        return `Translate the following ${sourceLang} text into natural ${targetLang}. Output ONLY the translation, no explanations.`;
    }
    /**
     * Get vocabulary prompt based on target language
     */
    getVocabularyPrompt(content) {
        const promptMap = {
            'ja': `以下の講義内容から、重要な専門用語を5-10個抽出し、それぞれに簡潔な定義を付けてください。

講義内容：
${content}

以下のJSON形式で出力してください：
[
  {
    "term": "用語",
    "definition": "定義",
    "context": "使用された文脈（オプション）"
  }
]`,
            'en': `Extract 5-10 important technical terms from the following lecture content, and provide a concise definition for each.

Lecture content:
${content}

Output in the following JSON format:
[
  {
    "term": "term",
    "definition": "definition",
    "context": "context where it was used (optional)"
  }
]`,
            'zh': `从以下讲座内容中提取 5-10 个重要的专业术语，并为每个术语提供简洁的定义。

讲座内容：
${content}

以下列 JSON 格式输出：
[
  {
    "term": "术语",
    "definition": "定义",
    "context": "使用上下文（可选）"
  }
]`
        };
        // 他の言語は英語プロンプトを使用
        return promptMap[this.sourceLanguage] || promptMap['en'];
    }
    /**
     * Get vocabulary system prompt
     */
    getVocabularySystemPrompt() {
        return 'You are an expert at extracting key vocabulary from academic lectures. Output only valid JSON.';
    }
    /**
     * Get final report prompt based on target language
     */
    getFinalReportPrompt(content, summariesContent, vocabulary, totalWordCount) {
        const wordCountRounded = Math.floor(totalWordCount / 100) * 100;
        const vocabList = vocabulary.map(v => `- ${v.term}: ${v.definition}`).join('\n');
        const promptMap = {
            'ja': `以下は${wordCountRounded}語程度の講義の内容です。
高校生にも理解しやすい形でMarkdown形式のレポートにまとめてください。

講義内容：
${content}

これまでの要約：
${summariesContent}

重要用語：
${vocabList}

必ず、次の構成で作成してください：
1. **概要** - 講義全体の内容を2-3文で
2. **トピック一覧** - 箇条書きで主要トピックを列挙
3. **キーポイント** - 重要ポイントを3-5個
4. **重要用語** - 専門用語とその説明
5. **Q&A / ディスカッション** - もしあれば
6. **まとめ** - 学んだことの要点`,
            'en': `The following is a lecture of approximately ${wordCountRounded} words.
Please create a Markdown report that is easy to understand for high school students.

Lecture content:
${content}

Previous summaries:
${summariesContent}

Key vocabulary:
${vocabList}

Please create the report with the following structure:
1. **Overview** - Summarize the entire lecture in 2-3 sentences
2. **Topic List** - List the main topics in bullet points
3. **Key Points** - 3-5 important points
4. **Important Terms** - Technical terms with explanations
5. **Q&A / Discussion** - If applicable
6. **Conclusion** - Key takeaways`,
            'zh': `以下是约 ${wordCountRounded} 词的讲座内容。
请创建一份高中生也能轻松理解的 Markdown 格式报告。

讲座内容：
${content}

之前的总结：
${summariesContent}

重要术语：
${vocabList}

请按照以下结构创建：
1. **概述** - 用 2-3 句话总结整个讲座
2. **主题列表** - 用项目符号列出主要主题
3. **关键要点** - 3-5 个重要要点
4. **重要术语** - 专业术语及其解释
5. **问答/讨论** - 如果适用
6. **总结** - 学习要点`
        };
        // 他の言語は英語プロンプトを使用
        return promptMap[this.sourceLanguage] || promptMap['en'];
    }
    /**
     * Get final report system prompt
     */
    getFinalReportSystemPrompt() {
        const promptMap = {
            'ja': 'あなたは教育コンテンツの専門家です。学生にとって分かりやすく、学習に役立つレポートを作成してください。',
            'en': 'You are an educational content expert. Create reports that are easy for students to understand and helpful for learning.',
            'zh': '您是教育内容专家。请创建学生易于理解且有助于学习的报告。',
            'es': 'Eres un experto en contenido educativo. Crea informes que sean fáciles de entender para los estudiantes y útiles para el aprendizaje.',
            'fr': 'Vous êtes un expert en contenu éducatif. Créez des rapports faciles à comprendre pour les étudiants et utiles pour l\'apprentissage.',
            'de': 'Sie sind ein Experte für Bildungsinhalte. Erstellen Sie Berichte, die für Studenten leicht verständlich und für das Lernen hilfreich sind.',
            'ko': '당신은 교육 콘텐츠 전문가입니다. 학생들이 이해하기 쉽고 학습에 도움이 되는 보고서를 작성해주세요.',
            'pt': 'Você é um especialista em conteúdo educacional. Crie relatórios fáceis de entender para os estudantes e úteis para a aprendizagem.',
            'ru': 'Вы эксперт по образовательному контенту. Создавайте отчеты, которые студентам легко понять и которые полезны для обучения.',
            'it': 'Sei un esperto di contenuti educativi. Crea rapporti facili da capire per gli studenti e utili per l\'apprendimento.',
            'ar': 'أنت خبير في المحتوى التعليمي. قم بإنشاء تقارير سهلة الفهم للطلاب ومفيدة للتعلم.',
            'hi': 'आप शैक्षिक सामग्री के विशेषज्ञ हैं। छात्रों के लिए समझने में आसान और सीखने में मददगार रिपोर्ट बनाएं।',
            'vi': 'Bạn là chuyên gia về nội dung giáo dục. Tạo các báo cáo dễ hiểu cho sinh viên và hữu ích cho việc học tập.',
            'th': 'คุณเป็นผู้เชี่ยวชาญด้านเนื้อหาการศึกษา สร้างรายงานที่นักเรียนเข้าใจง่ายและเป็นประโยชน์ต่อการเรียนรู้',
            'tr': 'Eğitim içeriği uzmanısınız. Öğrencilerin kolayca anlayabileceği ve öğrenmeye yardımcı raporlar oluşturun.',
            'pl': 'Jesteś ekspertem w dziedzinie treści edukacyjnych. Twórz raporty łatwe do zrozumienia dla studentów i pomocne w nauce.'
        };
        return promptMap[this.sourceLanguage] || promptMap['en'];
    }
    /**
     * Get progressive summary prompt for specific threshold
     */
    getProgressiveSummaryPromptForThreshold(content, threshold) {
        const promptsMap = {
            'ja': {
                400: `これまでの講義内容（約400語）の導入部分をまとめてください。
講義の主題と初期の重要ポイントを2-3点挙げてください。

講義内容：
${content}

簡潔に要約してください。`,
                800: `これまでの講義内容（約800語）の前半部分をまとめてください。
主要なトピックと重要なポイントを3-4点挙げてください。

講義内容：
${content}

構造的に要約してください。`,
                1600: `これまでの講義内容（約1600語）の中間まとめを作成してください。
主要テーマ、重要な概念、そして議論の流れを整理してください。

講義内容：
${content}

以下の形式でまとめてください：
1. 主要テーマ
2. 重要な概念（3-5個）
3. 議論の流れ`,
                2400: `これまでの講義内容（約2400語）の包括的なまとめを作成してください。
全体的なテーマ、主要な論点、重要な詳細を整理してください。

講義内容：
${content}

以下の形式でまとめてください：
1. 講義の概要
2. 主要な論点（4-6個）
3. 重要な詳細と例
4. ここまでの結論`
            },
            'en': {
                400: `Please summarize the introductory portion of the lecture so far (approximately 400 words).
Identify the main topic and 2-3 initial key points.

Lecture content:
${content}

Please provide a concise summary.`,
                800: `Please summarize the first half of the lecture so far (approximately 800 words).
Identify the main topics and 3-4 important points.

Lecture content:
${content}

Please provide a structured summary.`,
                1600: `Please create a mid-point summary of the lecture so far (approximately 1600 words).
Organize the main themes, important concepts, and flow of discussion.

Lecture content:
${content}

Please organize as follows:
1. Main themes
2. Important concepts (3-5 items)
3. Flow of discussion`,
                2400: `Please create a comprehensive summary of the lecture so far (approximately 2400 words).
Organize the overall themes, main arguments, and important details.

Lecture content:
${content}

Please organize as follows:
1. Lecture overview
2. Main arguments (4-6 items)
3. Important details and examples
4. Conclusions so far`
            },
            'zh': {
                400: `请总结目前为止讲座的引言部分（约400词）。
确定主题和 2-3 个初始要点。

讲座内容：
${content}

请提供简洁的总结。`,
                800: `请总结目前为止讲座的前半部分（约800词）。
确定主要主题和 3-4 个重要要点。

讲座内容：
${content}

请提供结构化的总结。`,
                1600: `请创建目前为止讲座的中期总结（约1600词）。
整理主要主题、重要概念和讨论流程。

讲座内容：
${content}

请按以下结构整理：
1. 主要主题
2. 重要概念（3-5项）
3. 讨论流程`,
                2400: `请创建目前为止讲座的全面总结（约2400词）。
整理整体主题、主要论点和重要细节。

讲座内容：
${content}

请按以下结构整理：
1. 讲座概述
2. 主要论点（4-6项）
3. 重要细节和例子
4. 目前的结论`
            }
        };
        const langPrompts = promptsMap[this.sourceLanguage] || promptsMap['en'];
        return langPrompts[threshold] || this.getPeriodicSummaryPrompt(content, threshold);
    }
    /**
     * Count words based on language
     * For Japanese/Chinese: count characters (excluding punctuation)
     * For other languages: count space-separated words
     *
     * NOTE: For summary thresholds, we always use the SOURCE language word count
     * to maintain consistency with the original content.
     */
    countWords(text, language) {
        if (language === 'ja' || language === 'zh') {
            // For Japanese/Chinese, count characters excluding common punctuation
            const cleanedText = text.replace(/[。、！？,.!?\s]/g, '');
            return cleanedText.length;
        }
        else {
            // For other languages, count space-separated words
            return text.trim().split(/\s+/).filter(word => word.length > 0).length;
        }
    }
    /**
     * Destroy the service
     */
    destroy() {
        this.stop();
        this.removeAllListeners();
    }
}
exports.AdvancedFeatureService = AdvancedFeatureService;
