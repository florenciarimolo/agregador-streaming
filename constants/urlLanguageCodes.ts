/**
 * URL language codes constants
 * These are the language codes used in URLs (e.g., /es/, /en/, /ca/)
 * Separate from i18n codes to avoid circular dependencies
 */

/**
 * Map URL language codes to i18n codes
 */
export const URL_TO_I18N_MAP = {
  es: 'es-ES',
  ca: 'ca-ES',
  eu: 'eu-ES',
  gl: 'gl-ES',
  en: 'en-US',
  'en-gb': 'en-GB',
} as const;

/**
 * Type for valid URL language codes
 * Derived from URL_TO_I18N_MAP keys to ensure type safety
 */
export type UrlLanguageCode = keyof typeof URL_TO_I18N_MAP;

/**
 * Valid URL language codes
 * Defined as array literal to ensure it's always available at runtime
 */
export const VALID_URL_CODES: readonly UrlLanguageCode[] = [
  'es',
  'ca',
  'eu',
  'gl',
  'en',
  'en-gb',
] as const;

/**
 * Default language URL code (used for fallback when no lang param in URL)
 */
export const DEFAULT_LANGUAGE_URL_CODE = 'es';

