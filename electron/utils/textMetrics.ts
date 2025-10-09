/**
 * Text metrics helpers shared across Electron services.
 * Provides language-aware word counting that treats CJK scripts as character-based languages.
 */

export interface CountWordsOptions {
  language?: string;
}

const CHARACTER_BASED_LANGUAGE_PREFIXES = ['ja', 'zh', 'ko'];
const CJK_CHAR_PATTERN = /[\u3040-\u30ff\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uF900-\uFAFF\uFF66-\uFF9D]/u;
const STRIP_PATTERN = /[。、，．？！,.!?\s]/g;

function normalizeLanguageCode(language?: string): string | undefined {
  if (!language) return undefined;
  return language.toLowerCase();
}

export function isCharacterBasedLanguage(language?: string): boolean {
  const normalized = normalizeLanguageCode(language);
  if (!normalized) return false;
  return CHARACTER_BASED_LANGUAGE_PREFIXES.some(prefix => normalized === prefix || normalized.startsWith(`${prefix}-`));
}

export function containsCJKCharacters(text: string): boolean {
  return CJK_CHAR_PATTERN.test(text);
}

function countCharacters(text: string): number {
  if (!text) return 0;
  return text.replace(STRIP_PATTERN, '').length;
}

/**
 * Count words in multilingual text. English-like languages are measured by whitespace-delimited tokens,
 * while character-based languages (Japanese, Chinese, Korean) are measured by character length.
 */
export function countWords(text: string, languageOrOptions?: string | CountWordsOptions): number {
  if (!text) {
    return 0;
  }

  const language = typeof languageOrOptions === 'string'
    ? languageOrOptions
    : languageOrOptions?.language;

  const normalizedLanguage = normalizeLanguageCode(language);

  if (isCharacterBasedLanguage(normalizedLanguage)) {
    return countCharacters(text);
  }

  // Auto-detect when language is unknown or "multi"
  if (!normalizedLanguage || normalizedLanguage === 'multi') {
    if (containsCJKCharacters(text)) {
      return countCharacters(text);
    }
  }

  return text.trim().split(/\s+/).filter(Boolean).length;
}
