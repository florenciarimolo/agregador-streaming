/**
 * i18n initialization plugin
 * With strategy: 'prefix', Nuxt i18n automatically derives language from URL
 * This plugin only handles legacy routes without language prefix (will be redirected)
 * 
 * CRITICAL: With prefix strategy, language comes from URL, not cookies
 */
import {
  AVAILABLE_LANGUAGES,
  DEFAULT_LANGUAGE,
  LEGACY_LANGUAGE_TO_TMDB,
} from '@/constants/languages';
import { LanguageCode } from '@/types/enums/LanguageCode';
import { getI18nCodeFromUrlCode } from '@/composables/useLangFromUrl';

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

/**
 * i18n initialization plugin (initial setup only)
 * 
 * NOTE: This plugin only runs once on initial load.
 * For ongoing synchronization, see middleware/sync-lang.ts which runs on every route change.
 * 
 * CRITICAL: With prefix strategy, language comes from URL, not cookies.
 * The sync-lang middleware ensures i18n.locale stays synchronized with route.params.lang.
 */
export default defineNuxtPlugin({
  name: 'i18n-init',
  enforce: 'pre', // Run before other plugins
  async setup() {
    if (import.meta.client && typeof document !== 'undefined') {
      try {
        const route = useRoute();
        const { locale, setLocale } = useI18n();

        // With strategy: 'prefix', get language from URL
        const langFromUrl = route.params?.lang as string | undefined;

        if (langFromUrl) {
          // Map URL code to i18n code
          const i18nCode = getI18nCodeFromUrlCode(langFromUrl);
          
          if (i18nCode) {
            // Set locale from URL - initial sync only
            // The sync-lang middleware will handle ongoing synchronization
            if (locale.value !== i18nCode) {
              await setLocale(i18nCode);
            }
            // NOTE: No cookies are set - language is determined solely from URL
          }
        } else {
          // No language prefix - this is a legacy route
          // detectBrowserLanguage in nuxt.config.ts will handle redirect
          // The sync-lang middleware will handle locale sync after redirect
          const defaultI18nCode = getDefaultI18nCode();
          
          // Set default locale (no cookie - language comes from URL only)
          if (locale.value !== defaultI18nCode) {
            await setLocale(defaultI18nCode);
          }
        }
      } catch (error) {
        // If setting locale fails, fall back silently
        // The sync-lang middleware will handle synchronization on route changes
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error in i18n-init plugin:', error);
        }
      }
    }
  },
});
