/**
 * Composable to build routes with language prefix
 * Helper to ensure all routes include the /:lang prefix
 */

import { computed } from 'vue';
import {
  DEFAULT_LANGUAGE_URL_CODE,
  VALID_URL_CODES,
  type UrlLanguageCode,
} from '@/constants/urlLanguageCodes';

// Fallback array literal in case import fails (should never happen, but ensures runtime safety)
// Uses the same values as VALID_URL_CODES but as plain strings for runtime safety
const VALID_URL_CODES_FALLBACK: UrlLanguageCode[] = [
  'es',
  'ca',
  'eu',
  'gl',
  'en',
  'en-gb',
];

/**
 * Extract language code from path if route.params.lang is not available
 * This is a fallback for cases where i18n module hasn't processed the route yet
 * @param path - Route path (e.g., '/eu', '/es/discover')
 * @returns Language code or null
 */
export const extractLangFromPath = (path: string): string | null => {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  const firstPart = parts[0].toLowerCase();
  // Use imported VALID_URL_CODES if available, otherwise use fallback
  const validCodes =
    VALID_URL_CODES && Array.isArray(VALID_URL_CODES)
      ? VALID_URL_CODES
      : VALID_URL_CODES_FALLBACK;

  if (validCodes.includes(firstPart)) {
    return firstPart;
  }
  return null;
};

/**
 * Get current language URL code from route (reactive)
 * @returns Language URL code (e.g., 'es', 'en') or DEFAULT_LANGUAGE_URL_CODE as default
 *
 * NOTE: This function is NOT reactive by itself. Use the `lang` computed from `useRouteWithLang()`
 * for reactive language access, or call this function inside a computed().
 */
export const getCurrentLangUrlCode = (): string => {
  const route = useRoute();
  const langParam = route.params?.lang as string | undefined;
  if (langParam) {
    return langParam.toLowerCase();
  }
  // Fallback: try to extract from path if params.lang is not available
  const langFromPath = extractLangFromPath(route.path);
  if (langFromPath) {
    return langFromPath;
  }
  // Default to DEFAULT_LANGUAGE_URL_CODE if no lang param
  return DEFAULT_LANGUAGE_URL_CODE;
};

/**
 * Build a route path with language prefix
 * @param path - Path without language prefix (e.g., '/', '/discover', '/movie/123')
 * @param lang - Optional language code. If not provided, uses current route language
 * @returns Path with language prefix (e.g., '/es/', '/es/discover', '/es/movie/123')
 */
export const routeWithLang = (path: string, lang?: string): string => {
  const currentLang = lang || getCurrentLangUrlCode();

  // Normalize path (ensure it starts with /)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // If path is just '/', return '/{lang}/'
  if (normalizedPath === '/') {
    return `/${currentLang}/`;
  }

  // Otherwise, return /{lang}{path}
  return `/${currentLang}${normalizedPath}`;
};

/**
 * Composable to get route helpers with language prefix
 * Returns reactive values that update when route.params.lang changes
 *
 * CRITICAL: All routes must be derived directly from route.params.lang
 * No caching, no stored state - always read from route
 */
export const useRouteWithLang = () => {
  // Make lang reactive using computed - explicitly depend on route.params.lang
  // CRITICAL: Call useRoute() inside the computed to ensure we always get the current route
  // This ensures reactivity when the computed is accessed
  const lang = computed(() => {
    // CRITICAL: Call useRoute() inside the computed to get the current route
    // This ensures Vue tracks the dependency correctly
    const currentRoute = useRoute();
    const langParam = currentRoute.params?.lang as string | undefined;
    if (langParam) {
      return langParam.toLowerCase();
    }
    // Fallback: try to extract from path if params.lang is not available
    const langFromPath = extractLangFromPath(currentRoute.path);
    if (langFromPath) {
      return langFromPath;
    }
    // Default to DEFAULT_LANGUAGE_URL_CODE if no lang param
    return DEFAULT_LANGUAGE_URL_CODE;
  });

  /**
   * Build route with language prefix - ALWAYS reactive
   *
   * CRITICAL: This function MUST call useRoute() inside to get the current route
   * when called from a computed(). This ensures Vue tracks the dependency correctly.
   *
   * When called from a computed():
   * - It will call useRoute() to get the current route
   * - It will access route.params.lang directly
   * - Vue will track this as a dependency
   * - The computed will re-evaluate when route.params.lang changes
   */
  const routeWithLang = (path: string, langOverride?: string): string => {
    // CRITICAL: Call useRoute() inside the function to get the current route
    // This ensures that when called from a computed(), Vue tracks the dependency on route.params.lang
    let currentLang: string;
    if (langOverride) {
      currentLang = langOverride;
    } else {
      // CRITICAL: Call useRoute() here to get the current route (not use the route from outer scope)
      // This ensures reactivity when called from computed()
      const currentRoute = useRoute();
      const langParam = currentRoute.params?.lang as string | undefined;
      if (langParam) {
        currentLang = langParam.toLowerCase();
      } else {
        // Fallback: try to extract from path if params.lang is not available
        const langFromPath = extractLangFromPath(currentRoute.path);
        currentLang = langFromPath || DEFAULT_LANGUAGE_URL_CODE;
      }
    }

    // Normalize path (ensure it starts with /)
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // If path is just '/', return '/{lang}/'
    if (normalizedPath === '/') {
      return `/${currentLang}/`;
    }

    // Otherwise, return /{lang}{path}
    return `/${currentLang}${normalizedPath}`;
  };

  return {
    lang, // Return computed directly, not .value
    routeWithLang, // Function that reads from reactive lang computed
    getCurrentLangUrlCode,
  };
};
