/**
 * Legacy redirect middleware
 * Redirects URLs without language prefix to /:lang/ with priority-based language detection
 *
 * Priority order:
 * 1. Browser Accept-Language header (first visit only)
 * 2. Default language (en)
 *
 * Rules:
 * - Only applies to routes without language prefix
 * - / should never render content, only redirect
 * - Uses 302 for browser detection, 301 for default
 * - NOTE: No cookies are used - language is determined solely from URL
 */

import {
  DEFAULT_LANGUAGE_URL_CODE,
  VALID_URL_CODES,
} from '@/constants/urlLanguageCodes';

/**
 * Map i18n codes to URL codes
 */
const I18N_TO_URL_MAP: Record<string, string> = {
  'es-ES': 'es',
  'ca-ES': 'ca',
  'eu-ES': 'eu',
  'gl-ES': 'gl',
  'en-US': 'en',
  'en-GB': 'en-gb',
};

/**
 * Default language code
 */
const DEFAULT_LANG = DEFAULT_LANGUAGE_URL_CODE;

/**
 * Check if path has language prefix
 */
const hasLangPrefix = (path: string): boolean => {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) {
    return false;
  }
  const firstPart = parts[0].toLowerCase();
  return VALID_URL_CODES.includes(
    firstPart as (typeof VALID_URL_CODES)[number]
  );
};

/**
 * Parse Accept-Language header and find best match
 * @param acceptLanguage - Accept-Language header value
 * @returns URL language code or null
 */
const detectLanguageFromHeader = (
  acceptLanguage: string | null | undefined
): string | null => {
  if (!acceptLanguage) return null;

  // Parse Accept-Language header (e.g., "en-GB,en;q=0.9,es;q=0.8")
  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [code, q = 'q=1.0'] = lang.trim().split(';');
      const quality = parseFloat(q.replace('q=', ''));
      return { code: code.trim().toLowerCase(), quality };
    })
    .sort((a, b) => b.quality - a.quality);

  // Try to match each language in order of preference
  for (const { code } of languages) {
    // Try exact match first (e.g., "en-gb" -> "en-gb")
    if (VALID_URL_CODES.includes(code as (typeof VALID_URL_CODES)[number])) {
      return code;
    }

    // Try language code match (e.g., "en" -> "en", "en-US" -> "en")
    const langCode = code.split('-')[0];
    if (langCode === 'en' && code.includes('gb')) {
      return 'en-gb';
    }
    if (
      VALID_URL_CODES.includes(langCode as (typeof VALID_URL_CODES)[number])
    ) {
      return langCode;
    }

    // Try i18n code match (e.g., "es-ES" -> "es")
    const urlCode =
      I18N_TO_URL_MAP[code] ||
      I18N_TO_URL_MAP[code.split('-')[0] + '-ES'] ||
      I18N_TO_URL_MAP[code.split('-')[0] + '-US'];
    if (urlCode) {
      return urlCode;
    }
  }

  return null;
};

// NOTE: Language cookies removed - language is determined solely from URL

/**
 * Get language from Accept-Language header (Priority 2)
 * Only works on server side
 */
const getLanguageFromHeader = (): string | null => {
  if (!import.meta.server) return null;

  try {
    // In Nuxt middleware, we can access headers via useRequestHeaders
    const headers = useRequestHeaders(['accept-language']);
    const acceptLanguage = headers['accept-language'];
    return detectLanguageFromHeader(acceptLanguage);
  } catch {
    return null;
  }
};

/**
 * Determine redirect language with priority order
 * NOTE: Cookies removed - language is determined from browser header or default
 */
const getRedirectLanguage = (): { lang: string; isPermanent: boolean } => {
  // Priority 1: Browser Accept-Language (first visit) - only on server
  if (import.meta.server) {
    const headerLang = getLanguageFromHeader();
    if (headerLang) {
      return { lang: headerLang, isPermanent: false }; // 302 - browser detection
    }
  }

  // Priority 2: Default
  return { lang: DEFAULT_LANG, isPermanent: true }; // 301 - default
};

export default defineNuxtRouteMiddleware((to) => {
  // Skip if path already has language prefix
  if (hasLangPrefix(to.path)) {
    return;
  }

  // Skip API routes
  if (to.path.startsWith('/api/')) {
    return;
  }

  // Determine redirect language
  const { lang, isPermanent } = getRedirectLanguage();

  // Build redirect path
  // If path is '/', redirect to '/{lang}/' (with trailing slash)
  // Otherwise, redirect to '/{lang}{path}' (preserve original path)
  const redirectPath = to.path === '/' ? `/${lang}/` : `/${lang}${to.path}`;

  // Preserve query string if present
  const queryString = to.fullPath.includes('?')
    ? to.fullPath.substring(to.fullPath.indexOf('?'))
    : '';

  // Redirect with appropriate code (301 for known/default, 302 for browser detection)
  return navigateTo(`${redirectPath}${queryString}`, {
    redirectCode: isPermanent ? 301 : 302,
    external: false,
  });
});
