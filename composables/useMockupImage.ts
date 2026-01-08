/**
 * Composable to get mockup image paths based on current language
 * Returns the path to the language-specific mockup images
 * Format: /mockups/{iso}-{filename}
 *
 * Supported languages: es, en, eu, ca, gl
 */

import { computed } from 'vue';
import { getCurrentLangUrlCode } from '@/composables/useRouteWithLang';
import { DEFAULT_LANGUAGE_URL_CODE } from '@/constants/urlLanguageCodes';

/**
 * Get mockup image path for current language
 * @param filename - Base filename (e.g., 'step3-result-mockup.webp')
 * @returns Path to language-specific mockup image (e.g., '/mockups/es-step3-result-mockup.webp')
 */
export const useMockupImage = (filename: string) => {
  const route = useRoute();

  const mockupImage = computed(() => {
    // Get current language URL code (e.g., 'es', 'en', 'eu', 'ca', 'gl', 'en-gb')
    const langCode = getCurrentLangUrlCode(route);

    // Use default language if no language code found
    let iso = langCode || DEFAULT_LANGUAGE_URL_CODE;

    // Normalize en-gb to en (only 2-letter codes are supported for mockups)
    if (iso === 'en-gb') {
      iso = 'en';
    }

    // Return path to language-specific mockup image
    return `/mockups/${iso}-${filename}`;
  });

  return {
    mockupImage,
  };
};
