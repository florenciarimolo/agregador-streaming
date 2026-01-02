/**
 * Supported languages for content preferences
 * TMDB format: language-REGION (e.g., 'es-ES', 'ca-ES', 'en-US')
 */

export enum LanguageCode {
  SPANISH = 'es-ES',
  CATALAN = 'ca-ES',
  BASQUE = 'eu-ES',
  GALICIAN = 'gl-ES',
  ENGLISH = 'en-US',
  ENGLISH_UK = 'en-GB',
}

export interface Language {
  code: LanguageCode;
  name: string;
}

export const AVAILABLE_LANGUAGES: Language[] = [
  { code: LanguageCode.SPANISH, name: 'Español' },
  { code: LanguageCode.CATALAN, name: 'Català' },
  { code: LanguageCode.BASQUE, name: 'Euskera' },
  { code: LanguageCode.GALICIAN, name: 'Galego' },
  { code: LanguageCode.ENGLISH, name: 'Inglés (EE. UU.)' },
  { code: LanguageCode.ENGLISH_UK, name: 'Inglés (Reino Unido)' },
].sort((a, b) => a.name.localeCompare(b.name));

/**
 * Map legacy simple language codes to TMDB format
 */
export const LEGACY_LANGUAGE_TO_TMDB: Record<string, LanguageCode> = {
  es: LanguageCode.SPANISH,
  ca: LanguageCode.CATALAN,
  eu: LanguageCode.BASQUE,
  gl: LanguageCode.GALICIAN,
  en: LanguageCode.ENGLISH,
};

/**
 * Convert a language code (legacy or TMDB format) to TMDB format
 */
export function toTMDBLanguageCode(code: string | null | undefined): LanguageCode {
  if (!code) {
    return LanguageCode.SPANISH; // Default
  }

  // If already in TMDB format, return it
  if (Object.values(LanguageCode).includes(code as LanguageCode)) {
    return code as LanguageCode;
  }

  // Convert legacy code to TMDB format
  return LEGACY_LANGUAGE_TO_TMDB[code] || LanguageCode.SPANISH;
}

/**
 * Get language name by code
 */
export function getLanguageName(code: string | null | undefined): string {
  const tmdbCode = toTMDBLanguageCode(code);
  return AVAILABLE_LANGUAGES.find((lang) => lang.code === tmdbCode)?.name || 'Español';
}

/**
 * Extract language code from TMDB format
 * e.g., 'ca-ES' -> 'ca', 'en-US' -> 'en'
 */
export function extractLanguageCode(tmdbCode: string | null | undefined): string {
  if (!tmdbCode) return 'es';
  const parts = tmdbCode.split('-');
  return parts[0]?.toLowerCase() || 'es';
}

