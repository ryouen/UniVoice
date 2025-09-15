/**
 * Deepgram language support configuration
 * Based on official Deepgram Nova-3 documentation
 */
import { LanguageCode } from './LanguageConfig';
/**
 * Languages supported by Deepgram Nova-3
 * Source: https://developers.deepgram.com/docs/models-languages-overview
 */
export declare const DEEPGRAM_NOVA3_SUPPORTED_LANGUAGES: LanguageCode[];
/**
 * Check if a language is supported by Deepgram Nova-3
 */
export declare function isDeepgramSupported(language: LanguageCode): boolean;
/**
 * Get fallback language for unsupported languages
 * Returns 'multi' for multilingual mode or 'en' as default
 */
export declare function getDeepgramLanguageFallback(language: LanguageCode): string;
