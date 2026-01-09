/**
 * Server middleware to handle legacy redirects (routes without language prefix)
 * This runs BEFORE the @nuxtjs/i18n module, so it can intercept / and redirect properly
 *
 * Priority order:
 * 1. Language cookie (if exists, remembers user preference)
 * 2. Browser Accept-Language header (first visit only, sets cookie)
 * 3. Default language (en)
 */

// Import constants directly (server middleware can't use @/ aliases easily)
const URL_TO_I18N_MAP = {
  es: 'es-ES',
  ca: 'ca-ES',
  eu: 'eu-ES',
  gl: 'gl-ES',
  en: 'en-US',
  'en-gb': 'en-GB',
} as const;

const VALID_URL_CODES = ['es', 'ca', 'eu', 'gl', 'en', 'en-gb'] as const;
const DEFAULT_LANGUAGE_URL_CODE = 'en';
const STORAGE_KEYS = {
  LANGUAGE: 'language',
} as const;

/**
 * Get URL code from i18n code
 */
const getUrlCodeFromI18nCode = (i18nCode: string): string | null => {
  const entry = Object.entries(URL_TO_I18N_MAP).find(
    ([, i18n]) => i18n === i18nCode
  );
  return entry ? entry[0] : null;
};

/**
 * Map i18n codes to URL codes
 */
const buildI18nToUrlMap = (): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const [urlCode, i18nCode] of Object.entries(URL_TO_I18N_MAP)) {
    map[i18nCode] = urlCode;
    map[i18nCode.toLowerCase()] = urlCode;
  }
  return map;
};

const I18N_TO_URL_MAP = buildI18nToUrlMap();

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
 * Get language from cookie
 */
const getLanguageFromCookie = (
  cookieHeader: string | undefined
): string | null => {
  if (!cookieHeader) {
    return null;
  }

  try {
    const cookies = cookieHeader.split(';').reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) {
          acc[key.trim()] = decodeURIComponent(value);
        }
        return acc;
      },
      {} as Record<string, string>
    );

    // Try 'language' cookie first (expects URL code like 'es', 'en')
    const cookieLang = cookies[STORAGE_KEYS.LANGUAGE];

    if (
      cookieLang &&
      VALID_URL_CODES.includes(cookieLang as (typeof VALID_URL_CODES)[number])
    ) {
      return cookieLang;
    }

    // If 'language' cookie not found or invalid, try 'i18n_redirected' cookie (expects i18n code like 'es-ES')
    const i18nCode = cookies['i18n_redirected'];

    if (i18nCode) {
      // Check if it's already a URL code (legacy support)
      if (
        VALID_URL_CODES.includes(i18nCode as (typeof VALID_URL_CODES)[number])
      ) {
        return i18nCode;
      }

      // Try to convert i18n code to URL code
      // First, try direct lookup in the map (handles exact matches like 'es-ES')
      const directUrlCode = getUrlCodeFromI18nCode(i18nCode);
      if (
        directUrlCode &&
        VALID_URL_CODES.includes(
          directUrlCode as (typeof VALID_URL_CODES)[number]
        )
      ) {
        return directUrlCode;
      }

      // If direct lookup fails, try normalized version
      const normalizedI18nCode =
        i18nCode.toLowerCase().split('-').length > 1
          ? `${i18nCode.split('-')[0].toLowerCase()}-${i18nCode.split('-')[1].toUpperCase()}`
          : i18nCode.toLowerCase();

      const urlCode =
        I18N_TO_URL_MAP[normalizedI18nCode] ||
        I18N_TO_URL_MAP[i18nCode.toLowerCase()] ||
        getUrlCodeFromI18nCode(normalizedI18nCode);

      if (
        urlCode &&
        VALID_URL_CODES.includes(urlCode as (typeof VALID_URL_CODES)[number])
      ) {
        return urlCode;
      }
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Parse Accept-Language header and find best match
 */
const detectLanguageFromHeader = (
  acceptLanguage: string | null | undefined
): string | null => {
  if (!acceptLanguage) {
    return null;
  }

  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [code, q = 'q=1.0'] = lang.trim().split(';');
      const quality = parseFloat(q.replace('q=', ''));
      return { code: code.trim().toLowerCase(), quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { code } of languages) {
    // Try exact match first
    if (VALID_URL_CODES.includes(code as (typeof VALID_URL_CODES)[number])) {
      return code;
    }

    const langCode = code.split('-')[0];
    const parts = code.split('-');

    // Try i18n code match
    const normalizedCode =
      parts.length > 1 ? `${parts[0]}-${parts[1].toUpperCase()}` : code;

    const urlCode =
      I18N_TO_URL_MAP[code] ||
      I18N_TO_URL_MAP[normalizedCode] ||
      getUrlCodeFromI18nCode(normalizedCode) ||
      getUrlCodeFromI18nCode(code);

    if (urlCode) {
      return urlCode;
    }

    // Try language code match
    if (
      VALID_URL_CODES.includes(langCode as (typeof VALID_URL_CODES)[number])
    ) {
      return langCode;
    }
  }

  return null;
};

/**
 * Determine redirect language with priority order
 */
const getRedirectLanguage = (
  cookieHeader: string | undefined,
  acceptLanguage: string | undefined
): { lang: string; isPermanent: boolean; shouldSetCookie: boolean } => {
  // Priority 1: Language cookie
  const cookieLang = getLanguageFromCookie(cookieHeader);
  if (cookieLang) {
    return { lang: cookieLang, isPermanent: true, shouldSetCookie: false }; // 301 - cookie preference
  }

  // Priority 2: Browser Accept-Language
  const headerLang = detectLanguageFromHeader(acceptLanguage);
  if (headerLang) {
    return { lang: headerLang, isPermanent: false, shouldSetCookie: true }; // 302 - browser detection, set cookie
  }

  // Priority 3: Default
  return {
    lang: DEFAULT_LANGUAGE_URL_CODE,
    isPermanent: true,
    shouldSetCookie: true,
  }; // 301 - default, set cookie
};

export default defineEventHandler((event) => {
  const url = event.node.req.url;
  if (!url) {
    return;
  }

  // Skip API routes
  if (url.startsWith('/api/')) {
    return;
  }

  // Handle routes with language prefix: set cookie and return (no redirect)
  if (hasLangPrefix(url)) {
    const parts = url.split('/').filter(Boolean);
    const langFromUrl = parts[0]?.toLowerCase();

    if (
      langFromUrl &&
      VALID_URL_CODES.includes(langFromUrl as (typeof VALID_URL_CODES)[number])
    ) {
      const i18nCode =
        URL_TO_I18N_MAP[langFromUrl as keyof typeof URL_TO_I18N_MAP];
      if (i18nCode) {
        // Get current cookie value
        const cookieHeader =
          event.node.req.headers.cookie || event.node.req.headers.Cookie;
        const cookies = cookieHeader
          ? cookieHeader.split(';').reduce(
              (acc: Record<string, string>, cookie: string) => {
                const [key, value] = cookie.trim().split('=');
                if (key && value) {
                  acc[key.trim()] = decodeURIComponent(value);
                }
                return acc;
              },
              {} as Record<string, string>
            )
          : {};

        // Only set cookie if different from current value
        if (cookies['i18n_redirected'] !== i18nCode) {
          const cookieOptions = [
            `i18n_redirected=${i18nCode}`,
            `Path=/`,
            `Max-Age=${60 * 60 * 24 * 365}`, // 1 year
            `SameSite=Lax`,
            process.env.NODE_ENV === 'production' ? 'Secure' : '',
          ]
            .filter(Boolean)
            .join('; ');
          setHeader(event, 'Set-Cookie', cookieOptions);
        }
      }
    }
    // Return without redirect - let the route handler process normally
    return;
  }

  // Only process root path (routes without language prefix)
  if (url !== '/' && !url.startsWith('/?')) {
    return;
  }

  // Get cookies and headers
  const cookieHeader =
    event.node.req.headers.cookie || event.node.req.headers.Cookie;
  const acceptLanguage =
    event.node.req.headers['accept-language'] ||
    event.node.req.headers['Accept-Language'];

  // Determine redirect language
  const { lang, isPermanent, shouldSetCookie } = getRedirectLanguage(
    cookieHeader,
    acceptLanguage as string | undefined
  );

  // If we detected language from header (not cookie), set cookie for future visits
  if (shouldSetCookie) {
    const i18nCode = URL_TO_I18N_MAP[lang as keyof typeof URL_TO_I18N_MAP];
    if (i18nCode) {
      // Set i18n_redirected cookie with i18n code (e.g., 'es-ES')
      const cookieOptions = [
        `i18n_redirected=${i18nCode}`,
        `Path=/`,
        `Max-Age=${60 * 60 * 24 * 365}`, // 1 year
        `SameSite=Lax`,
        process.env.NODE_ENV === 'production' ? 'Secure' : '',
      ]
        .filter(Boolean)
        .join('; ');
      setHeader(event, 'Set-Cookie', cookieOptions);
    }
  }

  // Build redirect path
  const queryString = url.includes('?') ? url.substring(url.indexOf('?')) : '';
  const redirectPath = `/${lang}/${queryString}`;

  // Set redirect status and location
  setResponseStatus(event, isPermanent ? 301 : 302);
  setHeader(event, 'Location', redirectPath);

  // Return empty response (redirect)
  return '';
});
