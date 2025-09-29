"use strict";
/**
 * GPT-5 Helper Functions - Phase 1 Fixed Model Implementation
 *
 * RELEASE: GPT-5 family released August 7, 2025 (2 days ago from Aug 9)
 * PHASE: Phase 1 - Fixed models only (no nano→mini switching)
 *
 * MODEL ASSIGNMENTS (Fixed):
 * - ② Translation: gpt-5-nano
 * - ③ Summary: gpt-5-mini
 * - ⑤ Vocabulary: gpt-5-mini
 * - ⑥ Final Report: gpt-5 (high reasoning capability)
 *
 * API: Using chat.completions temporarily (responses API types need update)
 *
 * CITATIONS:
 * - Final Agreement (docs/final-agreement.md, 2025-08-09)
 * - GPT-5 chat completions compatibility layer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GPT5_MODELS = void 0;
exports.translateText = translateText;
exports.generateSummary = generateSummary;
exports.generateVocabulary = generateVocabulary;
exports.generateFinalReport = generateFinalReport;
exports.translateSummary = translateSummary;
exports.translateUserInput = translateUserInput;
exports.estimateCost = estimateCost;
exports.translateWithContext = translateWithContext;
const openai_1 = require("openai");
// Model constants (Phase 1 - Fixed assignments)
const MODEL_TRANSLATE = 'gpt-5-nano'; // ② Translation
const MODEL_SUMMARY = 'gpt-5-mini'; // ③ Summary  
const MODEL_VOCABULARY = 'gpt-5-mini'; // ⑤ Vocabulary
const MODEL_REPORT = 'gpt-5'; // ⑥ Final Report
// Initialize OpenAI client
const client = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY
});
// Error handling wrapper
async function executeGPT5Request(config) {
    try {
        // Use chat completions as fallback if responses API doesn't work
        const response = await client.chat.completions.create({
            model: config.model,
            messages: [
                { role: 'system', content: config.systemPrompt },
                { role: 'user', content: config.userPrompt }
            ],
            max_tokens: config.maxTokens,
            temperature: config.temperature
        });
        return response.choices[0]?.message?.content?.trim() ?? '';
    }
    catch (error) {
        console.error(`GPT-5 API Error (${config.model}):`, error);
        throw error;
    }
}
/**
 * ② Translation Function (gpt-5-nano)
 * Fixed model, no switching logic in Phase 1
 */
async function translateText(text, context, glossary = []) {
    const glossaryText = glossary.length > 0
        ? `Glossary (keep/mapping): ${glossary.slice(0, 15).join(', ')}`
        : '';
    const systemPrompt = `You are a real-time subtitle translator for university lectures.
Translate from English to Japanese.
Keep technical terms and proper nouns as-is, or use the provided mapping.
Use concise, neutral caption style. Add punctuation. No meta text.
${glossaryText}`;
    const contextText = context
        ? `Previous context (2 segments max):\n${context}\n\nSegment:\n${text}`
        : `Segment:\n${text}`;
    return executeGPT5Request({
        model: MODEL_TRANSLATE,
        systemPrompt,
        userPrompt: contextText,
        temperature: 0.2,
        maxTokens: 256
    });
}
/**
 * ③ Periodic Summary (gpt-5-mini)
 * 10-minute interval summaries
 */
async function generateSummary(text, previousSummary) {
    const systemPrompt = `You are an expert lecture summarizer. Write a 2–3 sentence English summary.
Preserve technical terms; avoid speculation and definitions of basics.`;
    const userPrompt = `Excerpt (~10 minutes):
${text}
Previous summary (one line, optional):
${previousSummary || ''}`;
    return executeGPT5Request({
        model: MODEL_SUMMARY,
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        maxTokens: 180
    });
}
/**
 * ⑤ Vocabulary Generation (gpt-5-mini)
 * Extract domain-specific terms
 */
async function generateVocabulary(summariesText) {
    const systemPrompt = `Extract 8–12 domain-specific terms discussed in the lecture.
For each term, output: term (source), translation (Japanese),
and a <=20-word definition in Japanese. Output JSON array only.`;
    const userPrompt = `Lecture summaries (chronological):
${summariesText}`;
    const result = await executeGPT5Request({
        model: MODEL_VOCABULARY,
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        maxTokens: 800
    });
    // Parse JSON result
    try {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    }
    catch (error) {
        console.warn('Vocabulary JSON parse error:', error);
        return [{ term: 'Parse Error', translation: 'パースエラー', definition: '語彙解析に失敗しました' }];
    }
}
/**
 * ⑥ Final Report Generation (gpt-5 + high reasoning)
 * Comprehensive lecture report with deep analysis
 */
async function generateFinalReport(allSummaries, studentNotes, glossaryJson) {
    const systemPrompt = `Write a well-structured lecture report in English using Markdown.
Sections: Overview, Topics, Key Points, Q&A (if any), Conclusion.
Be accurate and faithful; keep terms consistent with the glossary.
Target length: 900–1400 words.`;
    const userPrompt = `Summaries:
${allSummaries}

Student notes (optional):
${studentNotes || 'None provided'}

Glossary (JSON):
${glossaryJson ? JSON.stringify(glossaryJson, null, 2) : 'None generated'}`;
    return executeGPT5Request({
        model: MODEL_REPORT,
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        maxTokens: 3000
    });
}
/**
 * Summary Translation (gpt-5-nano)
 * Translate English summaries to Japanese
 */
async function translateSummary(summaryText) {
    const systemPrompt = `You are a translator specializing in academic content.
Translate from English to Japanese while preserving technical terminology.
Maintain academic tone and clarity.`;
    const userPrompt = `Translate this academic summary to Japanese:
${summaryText}

Japanese Translation:`;
    return executeGPT5Request({
        model: MODEL_TRANSLATE,
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        maxTokens: 512
    });
}
/**
 * User Input Translation (gpt-5-nano)
 * Translate Japanese questions to English
 */
async function translateUserInput(japaneseText) {
    const systemPrompt = `You are a translator for academic discussions.
Translate from Japanese to academic English.
Preserve the intent and formality level of questions.`;
    const userPrompt = `Translate this Japanese question to academic English:
"${japaneseText}"

English Translation:`;
    return executeGPT5Request({
        model: MODEL_TRANSLATE,
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        maxTokens: 256
    });
}
// Cost tracking utilities
function estimateCost(operation, tokenCount) {
    const costs = {
        'gpt-5-nano': 0.000001, // Estimated cost per token
        'gpt-5-mini': 0.000002, // Estimated cost per token  
        'gpt-5': 0.000005, // Estimated cost per token (with reasoning)
    };
    const model = operation === 'translate' ? MODEL_TRANSLATE :
        operation === 'summary' ? MODEL_SUMMARY :
            operation === 'vocabulary' ? MODEL_VOCABULARY :
                MODEL_REPORT;
    return (costs[model] || 0.000005) * tokenCount;
}
// Export model constants for testing/debugging
exports.GPT5_MODELS = {
    TRANSLATE: MODEL_TRANSLATE,
    SUMMARY: MODEL_SUMMARY,
    VOCABULARY: MODEL_VOCABULARY,
    REPORT: MODEL_REPORT
};
/**
 * Context-aware translation for StreamingBuffer integration
 */
async function translateWithContext(text, context) {
    // Get last 2 segments (≤200 tokens) as specified in final agreement
    const contextWindow = context.previousSegments
        .split(' ')
        .slice(-200) // Keep last 200 tokens
        .join(' ');
    return translateText(text, contextWindow, context.glossary);
}
