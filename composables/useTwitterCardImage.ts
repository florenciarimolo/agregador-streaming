/**
 * Composable to get Twitter card image URL based on current language
 * Returns the absolute URL to the language-specific Twitter card image
 * Format: {baseUrl}/twitter-cards/{iso}-twitter-card.jpg
 *
 * Supported languages: es, en, eu, ca, gl
 *
 * CRITICAL: Twitter cards require absolute URLs, not relative paths
 */

import { computed } from 'vue';
import { getCurrentLangUrlCode } from '@/composables/useRouteWithLang';
import {
  DEFAULT_LANGUAGE_URL_CODE,
  URL_TO_I18N_MAP,
} from '@/constants/urlLanguageCodes';

/**
 * Get Twitter card image absolute URL for current language
 * @returns Absolute URL to Twitter card image (e.g., 'https://example.com/twitter-cards/es-twitter-card.jpg')
 */
export const useTwitterCardImage = () => {
  const route = useRoute();
  const config = useRuntimeConfig();

  const twitterCardImage = computed(() => {
    // Get current language URL code (e.g., 'es', 'en', 'eu', 'ca', 'gl', 'en-gb')
    const langCode = getCurrentLangUrlCode(route);

    // Use default language if no language code found
    let iso = langCode || DEFAULT_LANGUAGE_URL_CODE;

    // Normalize en-gb to en (only 2-letter codes are supported for Twitter cards)
    // Use constant from URL_TO_I18N_MAP instead of hardcoded string
    const enGbCode: keyof typeof URL_TO_I18N_MAP = 'en-gb';
    if (iso === enGbCode) {
      iso = 'en';
    }

    // Get base URL (remove trailing slash if present)
    // CRITICAL: baseUrl must NOT end with / to prevent // when concatenating
    const baseUrl = (config.public.baseUrl || '').replace(/\/$/, '');

    // Return absolute URL to language-specific Twitter card image
    // Result: baseUrl (no trailing /) + "/twitter-cards/..." = clean absolute URL
    return `${baseUrl}/twitter-cards/${iso}-twitter-card.jpg`;
  });

  return {
    twitterCardImage,
  };
};
