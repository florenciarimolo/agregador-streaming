/**
 * Language normalization for TMDB videos
 * Extracts all supported language ISO codes and converts to TMDB format
 */

import { SUPPORTED_LANGUAGE_ISO_CODES } from '@/constants/languages';

/**
 * Get video language parameter for TMDB API
 * Returns comma-separated string of language codes in TMDB format (e.g., 'ca,es,en')
 * Uses all supported languages from i18n system
 */
export function getVideoLanguageParam(): string {
  // Extract base language codes (e.g., 'es-ES' -> 'es')
  const languageCodes = SUPPORTED_LANGUAGE_ISO_CODES.map((code) => {
    const parts = code.split('-');
    return parts[0]?.toLowerCase() || code.toLowerCase();
  });

  // Remove duplicates and return comma-separated string
  const uniqueCodes = Array.from(new Set(languageCodes));
  return uniqueCodes.join(',');
}

