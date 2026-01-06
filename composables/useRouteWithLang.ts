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
 * Get current language URL code from route
 * @param route - Route object (required when called outside setup function)
 * @returns Language URL code (e.g., 'es', 'en') or DEFAULT_LANGUAGE_URL_CODE as default
 *
 * NOTE: This function is NOT reactive by itself. Use the `lang` computed from `useRouteWithLang()`
 * for reactive language access.
 * 
 * WARNING: When called outside a setup function, you MUST pass the route parameter.
 * Inside a setup function, you can call useRoute() and pass it, or use the lang computed from useRouteWithLang().
 */
export const getCurrentLangUrlCode = (route: ReturnType<typeof useRoute>): string => {
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
export const routeWithLang = (path: string, lang?: string, route?: ReturnType<typeof useRoute>): string => {
  // If lang is provided, use it. Otherwise, try to get from route if provided.
  // WARNING: If neither lang nor route is provided, this function will use DEFAULT_LANGUAGE_URL_CODE.
  // To get the current route language, use the routeWithLang function from useRouteWithLang() composable instead.
  let currentLang: string;
  if (lang) {
    currentLang = lang;
  } else if (route) {
    currentLang = getCurrentLangUrlCode(route);
  } else {
    // Fallback to default if neither lang nor route is provided
    // This should only happen if called incorrectly outside setup context
    currentLang = DEFAULT_LANGUAGE_URL_CODE;
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

/**
 * Composable to get route helpers with language prefix
 * Returns reactive values that update when route.params.lang changes
 *
 * CRITICAL: All routes must be derived directly from route.params.lang
 * No caching, no stored state - always read from route
 */
export const useRouteWithLang = () => {
  // CRITICAL: Call useRoute() at the composable level, not inside computed
  // This ensures it's called in the correct context (setup function)
  const route = useRoute();
  
  // Make lang reactive using computed - explicitly depend on route.params.lang
  // Use toRef to make route.params.lang reactive
  const lang = computed(() => {
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
  });

  /**
   * Build route with language prefix - ALWAYS reactive
   *
   * Uses the route from the composable scope, which is reactive.
   * When langOverride is provided, uses that. Otherwise, uses the reactive lang computed.
   */
  const routeWithLang = (path: string, langOverride?: string): string => {
    // Use langOverride if provided, otherwise use the reactive lang computed
    const currentLang = langOverride || lang.value;

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
