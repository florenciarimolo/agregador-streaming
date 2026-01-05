/**
 * Composable to get the current Language object based on route
 * Returns the Language object that matches the current route's language parameter
 */

import { computed } from 'vue';
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE, type Language } from '@/constants/languages';
import { getCurrentLangUrlCode } from '@/composables/useRouteWithLang';
import { getI18nCodeFromUrlCode } from '@/composables/useLangFromUrl';
import { DEFAULT_LANGUAGE_URL_CODE } from '@/constants/urlLanguageCodes';

/**
 * Get current Language object based on route language
 * Uses route.params.lang as source of truth, with fallback to path extraction
 * @returns Language object matching current route language, or default language
 */
export const useCurrentLanguage = () => {
  const route = useRoute();

  const currentLanguage = computed<Language>(() => {
    // Get URL code from route (handles both params.lang and path extraction)
    const urlCode = getCurrentLangUrlCode();

    // Map URL code to i18n code (e.g., 'es' -> 'es-ES', 'gl' -> 'gl-ES')
    const i18nCode = getI18nCodeFromUrlCode(urlCode);

    if (i18nCode) {
      // Find the language object that matches the i18n code
      const found = AVAILABLE_LANGUAGES.find((l) => l.i18nCode === i18nCode);
      if (found) {
        return found;
      }
    }

    // Fallback to default language if mapping fails (should never happen)
    const defaultLang = AVAILABLE_LANGUAGES.find(
      (l) => l.i18nCode === DEFAULT_LANGUAGE
    );
    return defaultLang || AVAILABLE_LANGUAGES[0];
  });

  return {
    currentLanguage,
  };
};

