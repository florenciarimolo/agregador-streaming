import {
  LanguageIsoCode,
  DEFAULT_LANGUAGE_ISO,
  LATIN_SCRIPT_LANGUAGE_ISO_CODES,
} from '@/constants/languages';

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
  const latinLanguages = LATIN_SCRIPT_LANGUAGE_ISO_CODES.map((code) => code);

  // If the expected language is not a Latin script language in ES region, don't check
  if (!latinLanguages.includes(expectedLanguage)) {
    return false;
  }

  // Define Latin character ranges (including extended Latin with diacritics)
  // This includes: Basic Latin, Latin-1 Supplement, Latin Extended-A, Latin Extended-B
  const isLatinChar = (char: string): boolean => {
    const code = char.charCodeAt(0);
    return (
      (code >= 0x0000 && code <= 0x007f) || // Basic Latin
      (code >= 0x0080 && code <= 0x00ff) || // Latin-1 Supplement (includes à, è, é, í, ò, ó, ú, ç, etc.)
      (code >= 0x0100 && code <= 0x017f) || // Latin Extended-A
      (code >= 0x0180 && code <= 0x024f) // Latin Extended-B
    );
  };

  // Patterns for non-Latin scripts that shouldn't appear in ES region languages
  const nonLatinPatterns = [
    /[\u3040-\u309F]/, // Hiragana (Japanese)
    /[\u30A0-\u30FF]/, // Katakana (Japanese)
    /[\u4E00-\u9FAF]/, // CJK Unified Ideographs (Chinese, Japanese, Korean)
    /[\u3400-\u4DBF]/, // CJK Extension A
    /[\u20000-\u2A6DF]/, // CJK Extension B
    /[\u0900-\u097F]/, // Devanagari (Hindi, Sanskrit)
    /[\u0600-\u06FF]/, // Arabic
    /[\u0590-\u05FF]/, // Hebrew
    /[\u0400-\u04FF]/, // Cyrillic
    /[\u0370-\u03FF]/, // Greek
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

    // Check if character is non-Latin by checking if it's NOT in Latin ranges
    // and matches non-Latin patterns
    if (!isLatinChar(char)) {
      // Double-check with non-Latin patterns
      let isNonLatin = false;
      for (const pattern of nonLatinPatterns) {
        if (pattern.test(char)) {
          isNonLatin = true;
          break;
        }
      }
      if (isNonLatin) {
        nonLatinCount++;
      }
    }
  }

  // If we have no meaningful characters, don't flag as unexpected
  if (totalChars === 0) {
    return false;
  }

  // If we have no meaningful characters, don't flag as unexpected
  if (totalChars === 0) {
    return false;
  }

  // If more than 50% of characters are non-Latin, consider it non-Latin alphabet
  const nonLatinRatio = nonLatinCount / totalChars;
  
  // For very short texts (like titles), if ALL characters are non-Latin, flag it
  // This handles cases like "七つの大罪" where all characters are CJK
  if (totalChars <= 10 && nonLatinCount === totalChars && nonLatinCount > 0) {
    console.log(
      `[AlphabetDetection] 🔍 Detected non-Latin alphabet in ${expectedLanguage} text (all characters are non-Latin):`,
      {
        nonLatinCount,
        totalChars,
        nonLatinRatio: `${Math.round(nonLatinRatio * 100)}%`,
        textPreview: text.substring(0, 100),
        detectedScripts: nonLatinPatterns
          .map((pattern) => {
            const matches = text.match(pattern);
            return matches ? pattern.toString() : null;
          })
          .filter(Boolean),
      }
    );
    return true;
  }
  
  if (nonLatinRatio > 0.5) {
    // This is expected behavior when TMDB returns titles in non-Latin scripts (e.g., Japanese, Chinese)
    console.log(
      `[AlphabetDetection] 🔍 Detected non-Latin alphabet in ${expectedLanguage} text:`,
      {
        nonLatinCount,
        totalChars,
        nonLatinRatio: `${Math.round(nonLatinRatio * 100)}%`,
        textPreview: text.substring(0, 100),
        detectedScripts: nonLatinPatterns
          .map((pattern, idx) => {
            const matches = text.match(pattern);
            return matches ? pattern.toString() : null;
          })
          .filter(Boolean),
      }
    );
    return true;
  }
  
  console.log(
    `[AlphabetDetection] ✅ Alphabet is valid for ${expectedLanguage}: ${Math.round(nonLatinRatio * 100)}% non-Latin (threshold: 50%)`
  );

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
    return DEFAULT_LANGUAGE_ISO; // Default to Spanish
  }

  // Map regions to their primary languages
  const regionPrimaryLanguages: Record<string, string> = {
    ES: LanguageIsoCode.SPANISH,
    US: LanguageIsoCode.ENGLISH,
    GB: LanguageIsoCode.ENGLISH,
    FR: 'fr',
    DE: 'de',
    IT: 'it',
    PT: 'pt',
    MX: LanguageIsoCode.SPANISH,
    AR: LanguageIsoCode.SPANISH,
    CO: LanguageIsoCode.SPANISH,
    CL: LanguageIsoCode.SPANISH,
    PE: LanguageIsoCode.SPANISH,
    VE: LanguageIsoCode.SPANISH,
  };

  return regionPrimaryLanguages[region.toUpperCase()] || DEFAULT_LANGUAGE_ISO;
}
