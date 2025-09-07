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
/**
 * ② Translation Function (gpt-5-nano)
 * Fixed model, no switching logic in Phase 1
 */
export declare function translateText(text: string, context?: string, glossary?: string[]): Promise<string>;
/**
 * ③ Periodic Summary (gpt-5-mini)
 * 10-minute interval summaries
 */
export declare function generateSummary(text: string, previousSummary?: string): Promise<string>;
/**
 * ⑤ Vocabulary Generation (gpt-5-mini)
 * Extract domain-specific terms
 */
export declare function generateVocabulary(summariesText: string): Promise<any[]>;
/**
 * ⑥ Final Report Generation (gpt-5 + high reasoning)
 * Comprehensive lecture report with deep analysis
 */
export declare function generateFinalReport(allSummaries: string, studentNotes?: string, glossaryJson?: any[]): Promise<string>;
/**
 * Summary Translation (gpt-5-nano)
 * Translate English summaries to Japanese
 */
export declare function translateSummary(summaryText: string): Promise<string>;
/**
 * User Input Translation (gpt-5-nano)
 * Translate Japanese questions to English
 */
export declare function translateUserInput(japaneseText: string): Promise<string>;
export declare function estimateCost(operation: string, tokenCount: number): number;
export declare const GPT5_MODELS: {
    TRANSLATE: string;
    SUMMARY: string;
    VOCABULARY: string;
    REPORT: string;
};
export interface GPT5TranslationContext {
    previousSegments: string;
    glossary: string[];
    speaker?: string;
}
/**
 * Context-aware translation for StreamingBuffer integration
 */
export declare function translateWithContext(text: string, context: GPT5TranslationContext): Promise<string>;
