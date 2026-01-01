/**
 * Detect if a text contains non-Latin characters that don't belong to the expected language
 * This helps identify cases where TMDB returns titles in unexpected languages (e.g., Japanese, Chinese, Hindi)
 *
 * @param text The text to check
 * @param expectedLanguage The expected language code (e.g., 'es', 'ca', 'eu', 'gl')
 * @returns true if the text contains unexpected non-Latin characters
 */
export function hasUnexpectedCharacters(
  text: string | null | undefined,
  expectedLanguage: string
): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // Languages in ES region that use Latin script
  const latinLanguages = ['es', 'ca', 'eu', 'gl', 'en'];

  // If the expected language is not a Latin script language, don't check
  if (!latinLanguages.includes(expectedLanguage)) {
    return false;
  }

  // Patterns for non-Latin scripts that shouldn't appear in ES region languages
  const nonLatinPatterns = [
    /[\u3040-\u309F]/g, // Hiragana (Japanese)
    /[\u30A0-\u30FF]/g, // Katakana (Japanese)
    /[\u4E00-\u9FAF]/g, // CJK Unified Ideographs (Chinese, Japanese, Korean)
    /[\u3400-\u4DBF]/g, // CJK Extension A
    /[\u20000-\u2A6DF]/g, // CJK Extension B
    /[\u0900-\u097F]/g, // Devanagari (Hindi, Sanskrit)
    /[\u0600-\u06FF]/g, // Arabic
    /[\u0590-\u05FF]/g, // Hebrew
    /[\u0400-\u04FF]/g, // Cyrillic
    /[\u0370-\u03FF]/g, // Greek (though sometimes used, we'll flag it for ES region)
  ];

  // Check if text contains any non-Latin characters
  // Note: This should NOT match Catalan, Basque, or Galician diacritics
  // (à, è, é, í, ò, ó, ú, ç, ñ, etc.) as they are part of Latin Extended-A (00C0-00FF)
  for (const pattern of nonLatinPatterns) {
    if (pattern.test(text)) {
      // Only return true if we find actual non-Latin scripts
      // This should be very rare - only when TMDB returns titles in completely wrong scripts
      if (import.meta.dev) {
        console.log(
          `[LanguageDetection] Found unexpected characters in ${expectedLanguage} text:`,
          text.substring(0, 50)
        );
      }
      return true;
    }
  }

  return false;
}

/**
 * Get the primary language for a region
 * @param region The region code (e.g., 'ES', 'US')
 * @returns The primary language code for that region
 */
export function getPrimaryLanguageForRegion(
  region: string | null | undefined
): string {
  if (!region) {
    return 'es'; // Default to Spanish
  }

  // Map regions to their primary languages
  const regionPrimaryLanguages: Record<string, string> = {
    ES: 'es',
    US: 'en',
    GB: 'en',
    FR: 'fr',
    DE: 'de',
    IT: 'it',
    PT: 'pt',
    MX: 'es',
    AR: 'es',
    CO: 'es',
    CL: 'es',
    PE: 'es',
    VE: 'es',
  };

  return regionPrimaryLanguages[region.toUpperCase()] || 'es';
}
