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
 * NOTE: This plugin is now minimal - the sync-lang middleware handles all locale synchronization.
 * This plugin only exists for documentation and potential future initialization needs.
 * 
 * CRITICAL: With prefix strategy, language comes from URL, not cookies.
 * The sync-lang middleware ensures i18n.locale stays synchronized with route.params.lang.
 * 
 * IMPORTANT: We cannot use useI18n() in plugins with enforce: 'pre' because Vue context
 * is not fully initialized. The middleware/sync-lang.ts handles all locale synchronization.
 */
export default defineNuxtPlugin({
  name: 'i18n-init',
  enforce: 'pre', // Run before other plugins
  setup() {
    // Plugin is intentionally minimal - sync-lang middleware handles locale sync
    // Cannot use useI18n() here because Vue context is not ready in pre-enforce plugins
    // The middleware/sync-lang.ts runs on every route change and handles synchronization
  },
});
