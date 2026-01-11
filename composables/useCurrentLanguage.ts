/**
 * Composable to get the current Language object based on route
 * Returns the Language object that matches the current route's language parameter
 */

import { computed } from 'vue';
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE, type Language } from '@/constants/languages';
import { getCurrentLangUrlCode } from '@/composables/useRouteWithLang';
import { getI18nCodeFromUrlCode } from '@/composables/useLangFromUrl';

/**
 * Get current Language object based on route language
 * Uses route.params.lang as source of truth, with fallback to path extraction
 * @returns Language object matching current route language, or default language
 */
export const useCurrentLanguage = () => {
  const route = useRoute();

  const currentLanguage = computed<Language>(() => {
    // Get URL code from route (handles both params.lang and path extraction)
    // Pass route to avoid calling useRoute() again
    const urlCode = getCurrentLangUrlCode(route);

    // Map URL code to i18n code (e.g., 'es' -> 'es-ES', 'gl' -> 'gl-ES')
    const i18nCode = getI18nCodeFromUrlCode(urlCode);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fa20eabc-ceed-4124-936f-87a814c192af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'composables/useCurrentLanguage.ts:19',message:'currentLanguage computed',data:{urlCode,i18nCode,routeParamsLang:route.params?.lang},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion

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

