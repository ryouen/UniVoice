/**
 * Language configuration for UniVoice
 * Supports dynamic language selection for source and target languages
 */
export interface LanguageConfig {
    sourceLanguage: LanguageCode;
    targetLanguage: LanguageCode;
}
export type LanguageCode = 'en' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'ko' | 'pt' | 'ru' | 'ar' | 'hi' | 'it' | 'nl' | 'pl' | 'tr' | 'vi';
export interface LanguageInfo {
    code: LanguageCode;
    name: string;
    nativeName: string;
    direction: 'ltr' | 'rtl';
}
export declare const SUPPORTED_LANGUAGES: Record<LanguageCode, LanguageInfo>;
/**
 * Get display name for a language in the target language
 * @param sourceCode The language code to get the name for
 * @param targetCode The language to display the name in
 * @returns The localized language name
 */
export declare function getLanguageName(sourceCode: LanguageCode, targetCode?: LanguageCode): string;
/**
 * Generate translation prompt based on language pair
 * @param source Source language code
 * @param target Target language code
 * @returns System prompt for translation
 */
export declare function getTranslationPrompt(source: LanguageCode, target: LanguageCode): string;
/**
 * Get language-specific formatting rules
 * @param language Language code
 * @returns Formatting configuration
 */
export declare function getLanguageFormatting(language: LanguageCode): {
    quotationMarks: {
        open: string;
        close: string;
    };
    numberFormat: Intl.NumberFormatOptions;
    dateFormat: Intl.DateTimeFormatOptions;
};
