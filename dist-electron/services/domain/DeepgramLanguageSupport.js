"use strict";
/**
 * Deepgram language support configuration
 * Based on official Deepgram Nova-3 documentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEEPGRAM_NOVA3_SUPPORTED_LANGUAGES = void 0;
exports.isDeepgramSupported = isDeepgramSupported;
exports.getDeepgramLanguageFallback = getDeepgramLanguageFallback;
/**
 * Languages supported by Deepgram Nova-3
 * Source: https://developers.deepgram.com/docs/models-languages-overview
 */
exports.DEEPGRAM_NOVA3_SUPPORTED_LANGUAGES = [
    'multi', // Multilingual mode (supports 10 languages)
    'en', // English
    'ja', // Japanese
    'es', // Spanish
    'fr', // French
    'de', // German
    'hi', // Hindi
    'ru', // Russian
    'pt', // Portuguese
    'it', // Italian
    'nl', // Dutch
];
/**
 * Check if a language is supported by Deepgram Nova-3
 */
function isDeepgramSupported(language) {
    return exports.DEEPGRAM_NOVA3_SUPPORTED_LANGUAGES.includes(language);
}
/**
 * Get fallback language for unsupported languages
 * Returns 'multi' for multilingual mode or 'en' as default
 */
function getDeepgramLanguageFallback(language) {
    if (isDeepgramSupported(language)) {
        return language;
    }
    // For unsupported languages, we can either:
    // 1. Use 'multi' for multilingual mode (may have lower accuracy)
    // 2. Use 'en' as fallback (will only transcribe English)
    // 3. Throw an error (best for user awareness)
    // For now, return the language anyway and let Deepgram handle the error
    // This allows for future model updates without code changes
    return language;
}
