/**
 * Composable to get and map language from URL parameter
 * Maps URL language codes (es, ca, eu, gl, en, en-gb) to i18n codes (es-ES, ca-ES, etc.)
 * 
 * CRITICAL: If language is invalid, throws 404 error (no silent fallback)
 */

import { computed } from 'vue';
import {
  URL_TO_I18N_MAP,
  VALID_URL_CODES,
  DEFAULT_LANGUAGE_URL_CODE,
  type UrlLanguageCode,
} from '@/constants/urlLanguageCodes';

// Re-export for backward compatibility
export { VALID_URL_CODES, DEFAULT_LANGUAGE_URL_CODE };

/**
 * Get language from URL parameter and map to i18n code
 * @returns i18n code (e.g., 'es-ES', 'en-US')
 * @throws 404 error if language is invalid
 * 
 * CRITICAL: Returns reactive computed values that update when route.params.lang changes
 */
export const useLangFromUrl = () => {
  const route = useRoute();

  // Make langUrlCode reactive using computed
  const langUrlCode = computed(() => {
    const langFromUrl = route.params.lang as string | undefined;

    // If no lang param, this might be a legacy route - will be handled by legacy-redirect middleware
    if (!langFromUrl) {
      return null;
    }

    // Normalize: convert to lowercase and handle any case variations
    const normalizedLang = langFromUrl.toLowerCase() as UrlLanguageCode;

    // Validate language code
    if (!VALID_URL_CODES.includes(normalizedLang)) {
      // Invalid language - return 404
      throw createError({
        statusCode: 404,
        statusMessage: `Invalid language code: ${langFromUrl}`,
      });
    }

    return normalizedLang;
  });

  // Make langI18nCode reactive using computed
  const langI18nCode = computed(() => {
    const urlCode = langUrlCode.value;
    if (!urlCode) {
      return null;
    }

    // Map to i18n code
    // Type assertion is safe because urlCode is validated in langUrlCode computed
    const i18nCode = URL_TO_I18N_MAP[urlCode as UrlLanguageCode];

    if (!i18nCode) {
      // This should never happen if VALID_URL_CODES is correct, but safety check
      throw createError({
        statusCode: 404,
        statusMessage: `Language mapping not found for: ${urlCode}`,
      });
    }

    return i18nCode;
  });

  // Make isValid reactive using computed
  const isValid = computed(() => {
    return langUrlCode.value !== null && langI18nCode.value !== null;
  });

  return {
    langUrlCode,
    langI18nCode,
    isValid,
  };
};

/**
 * Get i18n code from URL language code
 * @param urlCode - URL language code (e.g., 'es', 'en', 'en-gb')
 * @returns i18n code (e.g., 'es-ES', 'en-US', 'en-GB')
 */
export const getI18nCodeFromUrlCode = (urlCode: string): string | null => {
  const normalized = urlCode.toLowerCase();
  // Type assertion needed because URL_TO_I18N_MAP is const and TypeScript
  // can't infer that normalized is a valid key
  const mapped = URL_TO_I18N_MAP[normalized as keyof typeof URL_TO_I18N_MAP];
  return mapped || null;
};

/**
 * Get URL code from i18n code
 * @param i18nCode - i18n code (e.g., 'es-ES', 'en-US', 'en-GB')
 * @returns URL code (e.g., 'es', 'en', 'en-gb')
 */
export const getUrlCodeFromI18nCode = (i18nCode: string): string | null => {
  const entry = Object.entries(URL_TO_I18N_MAP).find(
    ([, i18n]) => i18n === i18nCode
  );
  return entry ? entry[0] : null;
};

