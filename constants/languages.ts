/**
 * Supported languages for content preferences
 * TMDB format: language-REGION (e.g., 'es-ES', 'ca-ES', 'en-US')
 */

import { LanguageCode } from '@/types/enums/LanguageCode';
import { LanguageIsoCode } from '@/types/enums/LanguageIsoCode';

// Re-export enums for convenience
export { LanguageCode, LanguageIsoCode };

export interface Language {
  code: LanguageCode; // TMDB format: language-REGION
  name: string; // Name in Spanish (for internal use)
  nativeName: string; // Name in the language itself
  flagCode: string; // Code for the flag icon
  i18nCode: string; // Code for i18n (ISO format: es-ES, ca-ES, eu-ES, gl-ES, en-US, en-GB)
}

export const AVAILABLE_LANGUAGES: Language[] = [
  {
    code: LanguageCode.SPANISH,
    name: 'Español',
    nativeName: 'Español',
    flagCode: 'ES',
    i18nCode: 'es-ES',
  },
  {
    code: LanguageCode.CATALAN,
    name: 'Català',
    nativeName: 'Català',
    flagCode: 'CAT',
    i18nCode: 'ca-ES',
  },
  {
    code: LanguageCode.BASQUE,
    name: 'Euskera',
    nativeName: 'Euskera',
    flagCode: 'EUS',
    i18nCode: 'eu-ES',
  },
  {
    code: LanguageCode.GALICIAN,
    name: 'Galego',
    nativeName: 'Galego',
    flagCode: 'GAL',
    i18nCode: 'gl-ES',
  },
  {
    code: LanguageCode.ENGLISH,
    name: 'Inglés (EE. UU.)',
    nativeName: 'English (US)',
    flagCode: 'US',
    i18nCode: 'en-US',
  },
  {
    code: LanguageCode.ENGLISH_UK,
    name: 'Inglés (Reino Unido)',
    nativeName: 'English (GB)',
    flagCode: 'GB',
    i18nCode: 'en-GB',
  },
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
export function toTMDBLanguageCode(
  code: string | null | undefined
): LanguageCode {
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
  return (
    AVAILABLE_LANGUAGES.find((lang) => lang.code === tmdbCode)?.name ||
    'Español'
  );
}

/**
 * Extract language code from TMDB format
 * e.g., 'ca-ES' -> 'ca', 'en-US' -> 'en'
 */
export function extractLanguageCode(
  tmdbCode: string | null | undefined
): string {
  if (!tmdbCode) return LanguageIsoCode.SPANISH;
  const parts = tmdbCode.split('-');
  return parts[0]?.toLowerCase() || LanguageIsoCode.SPANISH;
}

/**
 * Default language code (TMDB format)
 */
export const DEFAULT_LANGUAGE = LanguageCode.SPANISH;

/**
 * Default language ISO code (without region)
 */
export const DEFAULT_LANGUAGE_ISO = LanguageIsoCode.SPANISH;

/**
 * Supported language ISO codes (without region) for content
 */
export const SUPPORTED_LANGUAGE_ISO_CODES = [
  LanguageIsoCode.SPANISH,
  LanguageIsoCode.CATALAN,
  LanguageIsoCode.BASQUE,
  LanguageIsoCode.GALICIAN,
  LanguageIsoCode.ENGLISH,
] as const;

/**
 * Supported language codes (TMDB format) for content
 */
export const SUPPORTED_LANGUAGE_CODES = [
  LanguageCode.SPANISH,
  LanguageCode.CATALAN,
  LanguageCode.BASQUE,
  LanguageCode.GALICIAN,
  LanguageCode.ENGLISH,
  LanguageCode.ENGLISH_UK,
] as const;

/**
 * Latin script language ISO codes (for alphabet detection)
 */
export const LATIN_SCRIPT_LANGUAGE_ISO_CODES = [
  LanguageIsoCode.SPANISH,
  LanguageIsoCode.CATALAN,
  LanguageIsoCode.BASQUE,
  LanguageIsoCode.GALICIAN,
] as const;
