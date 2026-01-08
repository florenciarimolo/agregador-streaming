/**
 * Legacy redirect middleware
 * Redirects URLs without language prefix to /:lang/ with priority-based language detection
 *
 * Priority order:
 * 1. Language cookie (if exists, remembers user preference)
 * 2. Browser Accept-Language header (first visit only, sets cookie)
 * 3. Default language (en)
 *
 * Rules:
 * - Only applies to routes without language prefix
 * - / should never render content, only redirect
 * - Uses 302 for browser detection, 301 for default
 * - Once cookie is set, language is determined from URL (cookie is only for initial redirect)
 */

import {
  DEFAULT_LANGUAGE_URL_CODE,
  VALID_URL_CODES,
  URL_TO_I18N_MAP,
} from '@/constants/urlLanguageCodes';
import { LanguageCode } from '@/types/enums/LanguageCode';
import { LanguageIsoCode } from '@/types/enums/LanguageIsoCode';
import { getUrlCodeFromI18nCode } from '@/composables/useLangFromUrl';
import { STORAGE_KEYS } from '@/constants/storage/keys';

/**
 * Map i18n codes to URL codes
 * Built from URL_TO_I18N_MAP to ensure type safety
 */
const buildI18nToUrlMap = (): Record<string, string> => {
  const map: Record<string, string> = {};

  // Build map from URL_TO_I18N_MAP (inverse mapping)
  for (const [urlCode, i18nCode] of Object.entries(URL_TO_I18N_MAP)) {
    // Add both original case and lowercase versions for header parsing
    map[i18nCode] = urlCode;
    map[i18nCode.toLowerCase()] = urlCode;
  }

  return map;
};

const I18N_TO_URL_MAP = buildI18nToUrlMap();

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
    return null;
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

  // Try to match each language in order of preference
  for (const { code } of languages) {
    // Try exact match first (e.g., "en-gb" -> "en-gb", "es" -> "es")
    if (VALID_URL_CODES.includes(code as (typeof VALID_URL_CODES)[number])) {
      return code;
    }

    // Extract language code for use in subsequent checks
    const langCode = code.split('-')[0];
    const parts = code.split('-');

    // Try i18n code match first (e.g., "es-ES" -> "es", "ca-ES" -> "ca")
    // This handles cases like "es-es" (lowercase) or "es-ES" (mixed case)
    // Normalize to proper case (language-REGION format)
    const normalizedCode =
      parts.length > 1 ? `${parts[0]}-${parts[1].toUpperCase()}` : code;
    const urlCode =
      I18N_TO_URL_MAP[code] ||
      I18N_TO_URL_MAP[normalizedCode] ||
      I18N_TO_URL_MAP[`${langCode}-${LanguageCode.SPANISH.split('-')[1]}`] ||
      I18N_TO_URL_MAP[`${langCode}-${LanguageCode.ENGLISH.split('-')[1]}`];
    if (urlCode) {
      return urlCode;
    }

    // Try language code match (e.g., "en" -> "en", "en-US" -> "en", "es-ES" -> "es")
    const GB_REGION = LanguageCode.ENGLISH_UK.split('-')[1].toLowerCase();
    if (langCode === LanguageIsoCode.ENGLISH && code.includes(GB_REGION)) {
      const urlCode = getUrlCodeFromI18nCode(LanguageCode.ENGLISH_UK);
      if (urlCode) {
        return urlCode;
      }
      // Fallback: find URL code from URL_TO_I18N_MAP by value
      const fallbackUrlCode = Object.keys(URL_TO_I18N_MAP).find(
        (key) =>
          URL_TO_I18N_MAP[key as keyof typeof URL_TO_I18N_MAP] ===
          LanguageCode.ENGLISH_UK
      );
      return fallbackUrlCode || DEFAULT_LANGUAGE_URL_CODE;
    }
    if (
      VALID_URL_CODES.includes(langCode as (typeof VALID_URL_CODES)[number])
    ) {
      return langCode;
    }
  }

  return null;
};

/**
 * Get language from cookie (Priority 1)
 * Only works on server side
 */
const getLanguageFromCookie = (): string | null => {
  if (!import.meta.server) {
    return null;
  }

  try {
    const languageCookie = useCookie(STORAGE_KEYS.LANGUAGE, {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    const cookieLang = languageCookie.value;

    if (
      cookieLang &&
      VALID_URL_CODES.includes(cookieLang as (typeof VALID_URL_CODES)[number])
    ) {
      return cookieLang;
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Set language cookie
 * Only works on server side
 */
const setLanguageCookie = (lang: string): void => {
  if (!import.meta.server) {
    return;
  }

  try {
    const languageCookie = useCookie(STORAGE_KEYS.LANGUAGE, {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    languageCookie.value = lang;
  } catch {
    // Silently fail
  }
};

/**
 * Get language from Accept-Language header (Priority 2)
 * Only works on server side
 * CRITICAL: Must use useRequestEvent to access headers in middleware
 */
const getLanguageFromHeader = (): string | null => {
  if (!import.meta.server) {
    console.error('[legacy-redirect] getLanguageFromHeader: Not on server');
    return null;
  }

  try {
    // In Nuxt middleware, useRequestEvent is the most reliable way to access headers
    const event = useRequestEvent();
    if (!event) {
      console.error('[legacy-redirect] useRequestEvent returned undefined');
      return null;
    }

    // Access headers directly from the request object
    const headerValue =
      event.node.req.headers['accept-language'] ||
      event.node.req.headers['Accept-Language'];

    // Headers can be string or string[], take first if array
    const acceptLanguage = headerValue
      ? Array.isArray(headerValue)
        ? headerValue[0]
        : headerValue
      : null;

    console.error('[legacy-redirect] Accept-Language header:', acceptLanguage);
    if (import.meta.dev) {
      console.log('[legacy-redirect] Accept-Language header:', acceptLanguage);
    }

    if (!acceptLanguage) {
      console.error('[legacy-redirect] No Accept-Language header found');
      return null;
    }

    const detected = detectLanguageFromHeader(acceptLanguage);

    console.error('[legacy-redirect] Detected language:', detected);
    if (import.meta.dev) {
      console.log('[legacy-redirect] Detected language:', detected);
    }

    return detected;
  } catch (error) {
    console.error('[legacy-redirect] Error in getLanguageFromHeader:', error);
    if (import.meta.dev) {
      console.error('[legacy-redirect] Error in getLanguageFromHeader:', error);
    }
    return null;
  }
};

/**
 * Determine redirect language with priority order
 * Priority: 1. Cookie, 2. Accept-Language header, 3. Default
 */
const getRedirectLanguage = (): { lang: string; isPermanent: boolean } => {
  console.error(
    '[legacy-redirect] getRedirectLanguage called, server:',
    import.meta.server
  );
  if (import.meta.dev) {
    console.log(
      '[legacy-redirect] getRedirectLanguage called, server:',
      import.meta.server
    );
  }

  // Priority 1: Language cookie (if exists)
  if (import.meta.server) {
    const cookieLang = getLanguageFromCookie();
    if (cookieLang) {
      console.error('[legacy-redirect] Using cookie language:', cookieLang);
      if (import.meta.dev) {
        console.log('[legacy-redirect] Using cookie language:', cookieLang);
      }
      return { lang: cookieLang, isPermanent: true }; // 301 - cookie preference
    } else {
      console.error('[legacy-redirect] No cookie found');
      if (import.meta.dev) {
        console.log('[legacy-redirect] No cookie found');
      }
    }
  }

  // Priority 2: Browser Accept-Language (first visit) - only on server
  if (import.meta.server) {
    const headerLang = getLanguageFromHeader();
    if (headerLang) {
      console.error('[legacy-redirect] Using header language:', headerLang);
      if (import.meta.dev) {
        console.log('[legacy-redirect] Using header language:', headerLang);
      }
      // Set cookie for future visits
      setLanguageCookie(headerLang);
      return { lang: headerLang, isPermanent: false }; // 302 - browser detection
    } else {
      console.error('[legacy-redirect] No header language detected');
      if (import.meta.dev) {
        console.log('[legacy-redirect] No header language detected');
      }
    }
  }

  // Priority 3: Default
  console.error('[legacy-redirect] Using default language:', DEFAULT_LANG);
  if (import.meta.dev) {
    console.log('[legacy-redirect] Using default language:', DEFAULT_LANG);
  }
  return { lang: DEFAULT_LANG, isPermanent: true }; // 301 - default
};

export default defineNuxtRouteMiddleware((to) => {
  // ALWAYS log to server console (use console.error to ensure visibility)
  console.error('[legacy-redirect] ===== MIDDLEWARE EXECUTING =====');
  console.error('[legacy-redirect] Path:', to.path);
  console.error('[legacy-redirect] Server:', import.meta.server);
  console.error('[legacy-redirect] Client:', import.meta.client);

  if (import.meta.dev) {
    console.log('[legacy-redirect] Middleware executing:', {
      path: to.path,
      server: import.meta.server,
      client: import.meta.client,
    });
  }

  // Skip if path already has language prefix
  if (hasLangPrefix(to.path)) {
    console.error('[legacy-redirect] Skipping - has language prefix:', to.path);
    if (import.meta.dev) {
      console.log('[legacy-redirect] Skipping - has language prefix:', to.path);
    }
    return;
  }

  // Skip API routes
  if (to.path.startsWith('/api/')) {
    console.error('[legacy-redirect] Skipping API route:', to.path);
    if (import.meta.dev) {
      console.log('[legacy-redirect] Skipping API route:', to.path);
    }
    return;
  }

  console.error('[legacy-redirect] Processing route without prefix:', to.path);
  if (import.meta.dev) {
    console.log('[legacy-redirect] Processing route without prefix:', to.path);
  }

  // Determine redirect language
  const { lang, isPermanent } = getRedirectLanguage();

  console.error('[legacy-redirect] Redirect decision:', {
    lang,
    isPermanent,
  });
  if (import.meta.dev) {
    console.log('[legacy-redirect] Redirect decision:', {
      lang,
      isPermanent,
    });
  }

  // Build redirect path
  // If path is '/', redirect to '/{lang}/' (with trailing slash)
  // Otherwise, redirect to '/{lang}{path}' (preserve original path)
  const redirectPath = to.path === '/' ? `/${lang}/` : `/${lang}${to.path}`;

  // Preserve query string if present
  const queryString = to.fullPath.includes('?')
    ? to.fullPath.substring(to.fullPath.indexOf('?'))
    : '';

  const finalPath = `${redirectPath}${queryString}`;

  console.error('[legacy-redirect] Redirecting to:', finalPath);
  if (import.meta.dev) {
    console.log('[legacy-redirect] Redirecting to:', finalPath);
  }

  // Redirect with appropriate code (301 for known/default, 302 for browser detection)
  return navigateTo(finalPath, {
    redirectCode: isPermanent ? 301 : 302,
    external: false,
  });
});
