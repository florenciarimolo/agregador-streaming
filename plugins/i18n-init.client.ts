/**
 * i18n initialization plugin
 * Detects browser language when user hasn't selected a language preference
 * Runs before the app mounts to set the correct locale
 */
import {
  AVAILABLE_LANGUAGES,
  DEFAULT_LANGUAGE,
  LEGACY_LANGUAGE_TO_TMDB,
} from '@/constants/languages';
import { LanguageCode } from '@/types/enums/LanguageCode';

/**
 * Map browser language code to i18n locale code
 * @param browserLang Browser language code (e.g., 'es', 'en-US', 'ca-ES')
 * @returns i18n locale code (e.g., 'es-ES', 'en-US', 'ca-ES') or null if not found
 */
function mapBrowserLanguageToI18nCode(browserLang: string): string | null {
  if (!browserLang) return null;

  const normalizedBrowserLang = browserLang.toLowerCase().trim();
  const supportedI18nCodes = AVAILABLE_LANGUAGES.map((lang) => lang.i18nCode);

  // Try exact match first
  const exactMatch = supportedI18nCodes.find(
    (code) => code.toLowerCase() === normalizedBrowserLang
  );
  if (exactMatch) return exactMatch;

  // Extract language code (e.g., 'en-US' -> 'en', 'es' -> 'es')
  const browserLangCode = normalizedBrowserLang.split('-')[0];

  // Try to match by language code (e.g., 'es' matches 'es-ES')
  const langCodeMatch = supportedI18nCodes.find(
    (code) => code.split('-')[0].toLowerCase() === browserLangCode
  );
  if (langCodeMatch) return langCodeMatch;

  // Try to map using legacy language codes to TMDB format, then find i18nCode
  const tmdbCode = LEGACY_LANGUAGE_TO_TMDB[browserLangCode];
  if (tmdbCode) {
    const language = AVAILABLE_LANGUAGES.find((lang) => lang.code === tmdbCode);
    if (language) return language.i18nCode;
  }

  return null;
}

/**
 * Get default i18n locale code
 * @returns Default i18n locale code
 */
function getDefaultI18nCode(): string {
  const defaultLanguage = AVAILABLE_LANGUAGES.find(
    (lang) => lang.code === DEFAULT_LANGUAGE
  );
  // Fallback to first available language if default not found (should never happen)
  return (
    defaultLanguage?.i18nCode ||
    AVAILABLE_LANGUAGES[0]?.i18nCode ||
    LanguageCode.SPANISH
  );
}

export default defineNuxtPlugin({
  name: 'i18n-init',
  enforce: 'pre', // Run before other plugins
  async setup() {
    if (import.meta.client && typeof document !== 'undefined') {
      // Check if user has already selected a language (cookie exists)
      // Use document.cookie directly to avoid issues with useCookie in plugin context
      const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith('i18n_redirected='))
        ?.split('=')[1];

      // If no cookie exists, detect browser language
      if (!cookieValue) {
        try {
          // Get browser language
          const browserLang =
            navigator.language ||
            (navigator as Navigator & { userLanguage?: string }).userLanguage;

          let detectedLocale: string | null = null;

          if (browserLang) {
            // Map browser language to i18n code using enums and constants
            detectedLocale = mapBrowserLanguageToI18nCode(browserLang);
          }

          // Fall back to default if no match found
          if (!detectedLocale) {
            detectedLocale = getDefaultI18nCode();
          }

          // Set the locale using the i18n instance and save to cookie
          if (detectedLocale) {
            const nuxtApp = useNuxtApp();
            const i18n = nuxtApp.$i18n as
              | { setLocale: (locale: string) => Promise<void> }
              | undefined;
            if (i18n?.setLocale) {
              await i18n.setLocale(detectedLocale);
            }
            
            // Ensure cookie is saved with the same format as when selecting from selector
            // Use useCookie to match the same format and options as Nuxt i18n
            // This ensures the cookie is saved even if setLocale doesn't save it immediately
            const cookie = useCookie('i18n_redirected', {
              path: '/',
              sameSite: 'lax',
              secure: false, // Will be true in production with HTTPS
              httpOnly: false, // Must be false for client-side access
              maxAge: 60 * 60 * 24 * 365, // 1 year (same as Nuxt i18n default)
            });
            cookie.value = detectedLocale;
          }
        } catch (error) {
          // If detection fails, fall back to default
          if (process.env.NODE_ENV === 'development') {
            console.warn('Error detecting browser language:', error);
          }
        }
      }
    }
  },
});
