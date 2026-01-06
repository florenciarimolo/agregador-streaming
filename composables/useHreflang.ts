/**
 * Composable to generate hreflang tags for multi-language SEO
 * Only generates hreflang for indexable pages (excludes private routes, auth, onboarding, etc.)
 */

import { computed } from 'vue';
import { DEFAULT_LANGUAGE_URL_CODE } from '@/constants/urlLanguageCodes';

/**
 * List of non-indexable route patterns
 * These routes should NOT have hreflang tags
 */
const NON_INDEXABLE_ROUTES = [
  '/auth/',
  '/onboarding',
  '/my-account',
  '/preferences',
  '/watchlist',
  '/lists',
  '/reset-password',
];

/**
 * Supported languages with their URL codes and hreflang codes
 */
const SUPPORTED_LANGUAGES = [
  { urlCode: 'es', hreflang: 'es', i18nCode: 'es-ES' },
  { urlCode: 'ca', hreflang: 'ca', i18nCode: 'ca-ES' },
  { urlCode: 'eu', hreflang: 'eu', i18nCode: 'eu-ES' },
  { urlCode: 'gl', hreflang: 'gl', i18nCode: 'gl-ES' },
  { urlCode: 'en', hreflang: 'en', i18nCode: 'en-US' },
  { urlCode: 'en-gb', hreflang: 'en-gb', i18nCode: 'en-GB' },
] as const;

/**
 * Check if current route is indexable
 * @param path - Route path
 * @returns true if route is indexable, false otherwise
 */
const isIndexableRoute = (path: string): boolean => {
  // Check if path matches any non-indexable pattern
  return !NON_INDEXABLE_ROUTES.some((pattern) => path.startsWith(pattern));
};

/**
 * Get path without language prefix
 * @param fullPath - Full route path (e.g., '/es/movie/123')
 * @returns Path without language prefix (e.g., '/movie/123' or '/' for index)
 */
const getPathWithoutLang = (fullPath: string): string => {
  // Remove leading slash and split
  const parts = fullPath.split('/').filter(Boolean);

  // If no parts, return root path
  if (parts.length === 0) {
    return '/';
  }

  // Check if first part is a language code
  const firstPart = parts[0];
  const isLangCode = SUPPORTED_LANGUAGES.some(
    (lang) => lang.urlCode === firstPart
  );

  // If first part is a language code
  if (isLangCode) {
    // If only language code (e.g., '/es' or '/es/'), return root
    if (parts.length === 1) {
      return '/';
    }

    // Get remaining parts after language code
    const remainingParts = parts.slice(1);
    
    // If remaining part is also a language code (e.g., '/es/es'), treat as index
    const secondPart = remainingParts[0];
    const isSecondPartLangCode = SUPPORTED_LANGUAGES.some(
      (lang) => lang.urlCode === secondPart
    );
    
    if (isSecondPartLangCode && remainingParts.length === 1) {
      // This is likely a malformed route like '/es/es', treat as index
      return '/';
    }

    // Reconstruct path without language prefix
    return '/' + remainingParts.join('/');
  }

  // If no language prefix, return original path (normalize to start with /)
  return fullPath.startsWith('/') ? fullPath : `/${fullPath}`;
};

/**
 * Generate hreflang tags for current page
 * @returns Array of hreflang link objects, or empty array if page is not indexable
 */
export const useHreflang = () => {
  const route = useRoute();
  const config = useRuntimeConfig();

  // Make hreflangLinks reactive using computed
  // This ensures it updates when route changes and is always iterable
  const hreflangLinks = computed(() => {
    // Check if route is indexable
    if (!isIndexableRoute(route.path)) {
      return [];
    }

    // Get base URL (remove trailing slash if present)
    // CRITICAL: baseUrl must NOT end with / to prevent // when concatenating
    const baseUrl = (config.public.baseUrl || '').replace(/\/$/, '');

    // Get path without language prefix
    const pathWithoutLang = getPathWithoutLang(route.path);

    // CRITICAL: Ensure pathWithoutLang starts with / to prevent missing slash
    // getPathWithoutLang should already return path starting with /, but normalize for safety
    const normalizedPath = pathWithoutLang.startsWith('/')
      ? pathWithoutLang
      : `/${pathWithoutLang}`;

    // Generate hreflang links for all languages
    // Result: baseUrl (no trailing /) + "/" + langCode + path (starts with /) = clean URL
    // Example: "https://example.com" + "/es" + "/movie/123" = "https://example.com/es/movie/123" ✅
    const links: Array<{
      rel: 'alternate';
      hreflang: string;
      href: string;
    }> = SUPPORTED_LANGUAGES.map((lang) => ({
      rel: 'alternate' as const,
      hreflang: lang.hreflang,
      href: `${baseUrl}/${lang.urlCode}${normalizedPath}`,
    }));

    // Add x-default pointing to default language (es)
    links.push({
      rel: 'alternate' as const,
      hreflang: 'x-default',
      href: `${baseUrl}/${DEFAULT_LANGUAGE_URL_CODE}${normalizedPath}`,
    });

    return links;
  });

  return {
    hreflangLinks,
  };
};
