/**
 * Composable to get Twitter card image path based on current language
 * Returns the path to the language-specific Twitter card image
 * Format: /twitter-cards/{iso}-twitter-card.jpg
 *
 * Supported languages: es, en, eu, ca, gl
 */

import { computed } from 'vue';
import { getCurrentLangUrlCode } from '@/composables/useRouteWithLang';
import { DEFAULT_LANGUAGE_URL_CODE } from '@/constants/urlLanguageCodes';

/**
 * Get Twitter card image path for current language
 * @returns Path to Twitter card image (e.g., '/twitter-cards/es-twitter-card.jpg')
 */
export const useTwitterCardImage = () => {
  const route = useRoute();

  const twitterCardImage = computed(() => {
    // Get current language URL code (e.g., 'es', 'en', 'eu', 'ca', 'gl', 'en-gb')
    const langCode = getCurrentLangUrlCode(route);

    // Use default language if no language code found
    let iso = langCode || DEFAULT_LANGUAGE_URL_CODE;

    // Normalize en-gb to en (only 2-letter codes are supported for Twitter cards)
    if (iso === 'en-gb') {
      iso = 'en';
    }

    // Return path to language-specific Twitter card image
    return `/twitter-cards/${iso}-twitter-card.jpg`;
  });

  return {
    twitterCardImage,
  };
};
