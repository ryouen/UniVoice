/**
 * Language configuration for UniVoice
 * Supports dynamic language selection for source and target languages
 */

export interface LanguageConfig {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}

// Source languages - Limited by Deepgram Nova-3 support
export type SourceLanguageCode = 
  | 'multi'  // Multilingual (10 languages)
  | 'en'     // English
  | 'ja'     // Japanese (requires 'multi' in Nova-3)
  | 'es'     // Spanish
  | 'fr'     // French
  | 'de'     // German
  | 'hi'     // Hindi (requires 'multi' in Nova-3)
  | 'ru'     // Russian (requires 'multi' in Nova-3)
  | 'pt'     // Portuguese
  | 'it'     // Italian (requires 'multi' in Nova-3)
  | 'nl'     // Dutch
  | 'sv'     // Swedish
  | 'da';    // Danish

// Target languages - All languages supported by GPT-5
export type TargetLanguageCode = 
  | 'en'     // English
  | 'ja'     // Japanese
  | 'es'     // Spanish
  | 'fr'     // French
  | 'de'     // German
  | 'hi'     // Hindi
  | 'ru'     // Russian
  | 'pt'     // Portuguese
  | 'it'     // Italian
  | 'nl'     // Dutch
  | 'sv'     // Swedish
  | 'da'     // Danish
  | 'zh'     // Chinese (Mandarin)
  | 'ko'     // Korean
  | 'ar'     // Arabic
  | 'tr'     // Turkish
  | 'pl'     // Polish
  | 'vi'     // Vietnamese
  | 'th'     // Thai
  | 'cs'     // Czech
  | 'el'     // Greek
  | 'he'     // Hebrew
  | 'hu'     // Hungarian
  | 'id'     // Indonesian
  | 'ms'     // Malay
  | 'no'     // Norwegian
  | 'ro'     // Romanian
  | 'uk'     // Ukrainian
  | 'fi'     // Finnish
  | 'bg'     // Bulgarian
  | 'hr'     // Croatian
  | 'sk'     // Slovak
  | 'sl'     // Slovenian
  | 'lt'     // Lithuanian
  | 'lv'     // Latvian
  | 'et'     // Estonian
  | 'ca'     // Catalan
  | 'tl';    // Filipino/Tagalog

// For backward compatibility
export type LanguageCode = SourceLanguageCode | TargetLanguageCode;

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
}

// Source languages info (for speech recognition)
export const SOURCE_LANGUAGES: Record<SourceLanguageCode, LanguageInfo> = {
  multi: { code: 'multi', name: 'Multilingual', nativeName: 'Multilingual', direction: 'ltr' },
  en: { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr' },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr' },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr' },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr' },
  it: { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr' },
  nl: { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', direction: 'ltr' },
  sv: { code: 'sv', name: 'Swedish', nativeName: 'Svenska', direction: 'ltr' },
  da: { code: 'da', name: 'Danish', nativeName: 'Dansk', direction: 'ltr' },
};

// Target languages info (for translation)
export const TARGET_LANGUAGES: Record<TargetLanguageCode, LanguageInfo> = {
  en: { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr' },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr' },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr' },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr' },
  it: { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr' },
  nl: { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', direction: 'ltr' },
  sv: { code: 'sv', name: 'Swedish', nativeName: 'Svenska', direction: 'ltr' },
  da: { code: 'da', name: 'Danish', nativeName: 'Dansk', direction: 'ltr' },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr' },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr' },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
  tr: { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', direction: 'ltr' },
  pl: { code: 'pl', name: 'Polish', nativeName: 'Polski', direction: 'ltr' },
  vi: { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', direction: 'ltr' },
  th: { code: 'th', name: 'Thai', nativeName: 'ไทย', direction: 'ltr' },
  cs: { code: 'cs', name: 'Czech', nativeName: 'Čeština', direction: 'ltr' },
  el: { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', direction: 'ltr' },
  he: { code: 'he', name: 'Hebrew', nativeName: 'עברית', direction: 'rtl' },
  hu: { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', direction: 'ltr' },
  id: { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', direction: 'ltr' },
  ms: { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', direction: 'ltr' },
  no: { code: 'no', name: 'Norwegian', nativeName: 'Norsk', direction: 'ltr' },
  ro: { code: 'ro', name: 'Romanian', nativeName: 'Română', direction: 'ltr' },
  uk: { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', direction: 'ltr' },
  fi: { code: 'fi', name: 'Finnish', nativeName: 'Suomi', direction: 'ltr' },
  bg: { code: 'bg', name: 'Bulgarian', nativeName: 'Български', direction: 'ltr' },
  hr: { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', direction: 'ltr' },
  sk: { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', direction: 'ltr' },
  sl: { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', direction: 'ltr' },
  lt: { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', direction: 'ltr' },
  lv: { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', direction: 'ltr' },
  et: { code: 'et', name: 'Estonian', nativeName: 'Eesti', direction: 'ltr' },
  ca: { code: 'ca', name: 'Catalan', nativeName: 'Català', direction: 'ltr' },
  tl: { code: 'tl', name: 'Filipino', nativeName: 'Filipino', direction: 'ltr' },
};

// For backward compatibility - includes all languages
export const SUPPORTED_LANGUAGES: Record<LanguageCode, LanguageInfo> = {
  ...SOURCE_LANGUAGES,
  ...TARGET_LANGUAGES
};

/**
 * Get display name for a language in the target language
 * @param sourceCode The language code to get the name for
 * @param targetCode The language to display the name in
 * @returns The localized language name
 */
export function getLanguageName(sourceCode: LanguageCode, targetCode: LanguageCode = 'en'): string {
  const languageInfo = SUPPORTED_LANGUAGES[sourceCode];
  
  // For now, return native name if target is the same as source,
  // otherwise return English name
  if (sourceCode === targetCode) {
    return languageInfo.nativeName;
  }
  
  return languageInfo.name;
}

/**
 * Generate translation prompt based on language pair
 * @param source Source language code
 * @param target Target language code
 * @returns System prompt for translation
 */
export function getTranslationPrompt(source: LanguageCode, target: LanguageCode): string {
  const sourceName = SUPPORTED_LANGUAGES[source].name;
  const targetName = SUPPORTED_LANGUAGES[target].name;
  
  // 親フォルダのtest-20min-production-detailed.jsで実証済みのプロンプト
  if (source === 'en' && target === 'ja') {
    return 'You are a professional translator. Translate English to natural Japanese. Output ONLY the Japanese translation without explanations / inner thoughts.';
  }
  
  // その他の言語ペア用の汎用プロンプト
  return `You are a professional translator. Translate ${sourceName} to natural ${targetName}. Output ONLY the ${targetName} translation without explanations / inner thoughts.`;
}

/**
 * Get language-specific formatting rules
 * @param language Language code
 * @returns Formatting configuration
 */
export function getLanguageFormatting(language: LanguageCode): {
  quotationMarks: { open: string; close: string };
  numberFormat: Intl.NumberFormatOptions;
  dateFormat: Intl.DateTimeFormatOptions;
} {
  switch (language) {
    case 'ja':
      return {
        quotationMarks: { open: '「', close: '」' },
        numberFormat: { useGrouping: true },
        dateFormat: { year: 'numeric', month: 'long', day: 'numeric' }
      };
    case 'fr':
      return {
        quotationMarks: { open: '« ', close: ' »' },
        numberFormat: { useGrouping: true },
        dateFormat: { year: 'numeric', month: 'long', day: 'numeric' }
      };
    case 'de':
      return {
        quotationMarks: { open: '„', close: '"' },
        numberFormat: { useGrouping: true },
        dateFormat: { year: 'numeric', month: 'long', day: 'numeric' }
      };
    default:
      return {
        quotationMarks: { open: '"', close: '"' },
        numberFormat: { useGrouping: true },
        dateFormat: { year: 'numeric', month: 'long', day: 'numeric' }
      };
  }
}