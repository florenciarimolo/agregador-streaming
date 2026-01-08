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
  if (!acceptLanguage) {
    if (import.meta.dev) {
      console.log(
        '[legacy-redirect] detectLanguageFromHeader: No Accept-Language header'
      );
    }
    return null;
  }

  if (import.meta.dev) {
    console.log('[legacy-redirect] Parsing Accept-Language:', acceptLanguage);
  }

  // Parse Accept-Language header (e.g., "en-GB,en;q=0.9,es;q=0.8" or "es-ES,es;q=0.9")
  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [code, q = 'q=1.0'] = lang.trim().split(';');
      const quality = parseFloat(q.replace('q=', ''));
      return { code: code.trim().toLowerCase(), quality };
    })
    .sort((a, b) => b.quality - a.quality);

  if (import.meta.dev) {
    console.log(
      '[legacy-redirect] Parsed languages (sorted by quality):',
      languages
    );
  }

  // Try to match each language in order of preference
  for (const { code } of languages) {
    if (import.meta.dev) {
      console.log('[legacy-redirect] Trying to match language code:', code);
    }

    // Try exact match first (e.g., "en-gb" -> "en-gb", "es" -> "es")
    if (VALID_URL_CODES.includes(code as (typeof VALID_URL_CODES)[number])) {
      if (import.meta.dev) {
        console.log('[legacy-redirect] Exact match found:', code);
      }
      return code;
    }

    // Try language code match (e.g., "en" -> "en", "en-US" -> "en", "es-ES" -> "es")
    const langCode = code.split('-')[0];
    if (langCode === 'en' && code.includes('gb')) {
      if (import.meta.dev) {
        console.log('[legacy-redirect] English GB match found');
      }
      return 'en-gb';
    }
    if (
      VALID_URL_CODES.includes(langCode as (typeof VALID_URL_CODES)[number])
    ) {
      if (import.meta.dev) {
        console.log('[legacy-redirect] Language code match found:', langCode);
      }
      return langCode;
    }

    // Try i18n code match (e.g., "es-ES" -> "es", "ca-ES" -> "ca")
    // Normalize to proper case (language-REGION format)
    const parts = code.split('-');
    const normalizedCode =
      parts.length > 1 ? `${parts[0]}-${parts[1].toUpperCase()}` : code;
    const urlCode =
      I18N_TO_URL_MAP[code] ||
      I18N_TO_URL_MAP[normalizedCode] ||
      I18N_TO_URL_MAP[langCode + '-ES'] ||
      I18N_TO_URL_MAP[langCode + '-US'];
    if (urlCode) {
      if (import.meta.dev) {
        console.log(
          '[legacy-redirect] i18n code match found:',
          urlCode,
          'from',
          code
        );
      }
      return urlCode;
    }
  }

  if (import.meta.dev) {
    console.log('[legacy-redirect] No language match found in header');
  }
  return null;
};

// NOTE: Language cookies removed - language is determined solely from URL

/**
 * Get language from Accept-Language header (Priority 1)
 * Only works on server side
 */
const getLanguageFromHeader = (): string | null => {
  if (!import.meta.server) {
    if (import.meta.dev) {
      console.log(
        '[legacy-redirect] getLanguageFromHeader: Not on server, skipping'
      );
    }
    return null;
  }

  try {
    // In Nuxt middleware, we can access headers via useRequestHeaders
    const headers = useRequestHeaders(['accept-language']);
    const acceptLanguage = headers['accept-language'];

    if (import.meta.dev) {
      console.log('[legacy-redirect] Accept-Language header:', acceptLanguage);
    }

    const detected = detectLanguageFromHeader(acceptLanguage);

    if (import.meta.dev) {
      console.log('[legacy-redirect] Detected language from header:', detected);
    }

    return detected;
  } catch (error) {
    if (import.meta.dev) {
      console.error(
        '[legacy-redirect] Error getting language from header:',
        error
      );
    }
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
