/**
 * Detect if a text uses a non-Latin alphabet
 * This helps identify cases where TMDB returns titles in non-Latin scripts (e.g., Japanese, Chinese, Hindi)
 * Only checks for ES region languages (es, ca, eu, gl)
 *
 * @param text The text to check
 * @param expectedLanguage The expected language code (e.g., 'es', 'ca', 'eu', 'gl')
 * @returns true if the text uses a non-Latin alphabet (more than 50% non-Latin characters)
 */
export function hasUnexpectedCharacters(
  text: string | null | undefined,
  expectedLanguage: string
): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // Languages in ES region that use Latin script
  const latinLanguages = ['es', 'ca', 'eu', 'gl'];

  // If the expected language is not a Latin script language in ES region, don't check
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
    /[\u0370-\u03FF]/g, // Greek
  ];

  // Count non-Latin characters
  let nonLatinCount = 0;
  let totalChars = 0;

  // Count only printable characters (ignore spaces, punctuation, numbers)
  for (const char of text) {
    // Skip whitespace, numbers, and common punctuation
    if (/[\s0-9.,;:!?\-_()[\]{}'"/\\]/.test(char)) {
      continue;
    }
    totalChars++;

    // Check if character is non-Latin
    for (const pattern of nonLatinPatterns) {
      if (pattern.test(char)) {
        nonLatinCount++;
        break;
      }
    }
  }

  // If we have no meaningful characters, don't flag as unexpected
  if (totalChars === 0) {
    return false;
  }

  // If more than 50% of characters are non-Latin, consider it non-Latin alphabet
  const nonLatinRatio = nonLatinCount / totalChars;
  if (nonLatinRatio > 0.5) {
    if (import.meta.dev) {
      console.log(
        `[LanguageDetection] Found non-Latin alphabet in ${expectedLanguage} text (${Math.round(nonLatinRatio * 100)}% non-Latin):`,
        text.substring(0, 50)
      );
    }
    return true;
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
