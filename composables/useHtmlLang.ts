/**
 * Composable to set HTML lang attribute dynamically based on URL language
 * 
 * Rules:
 * - lang must match the language in the URL (/:lang)
 * - Must be deterministic (derived from route.params.lang, not cookies)
 * - Must be consistent with canonical and hreflang
 * 
 * Mapping:
 * /es     → <html lang="es">
 * /ca     → <html lang="ca">
 * /eu     → <html lang="eu">
 * /gl     → <html lang="gl">
 * /en     → <html lang="en">
 * /en-gb  → <html lang="en-GB"> (note: can use regional variant in lang attribute)
 */

/**
 * Map URL language codes to HTML lang attribute values
 */
const URL_TO_HTML_LANG_MAP: Record<string, string> = {
  es: 'es',
  ca: 'ca',
  eu: 'eu',
  gl: 'gl',
  en: 'en',
  'en-gb': 'en-GB', // Use regional variant for HTML lang
};

/**
 * Default HTML lang (fallback)
 */
const DEFAULT_HTML_LANG = 'es';

/**
 * Get HTML lang attribute value from URL language code
 * @param urlCode - URL language code (e.g., 'es', 'en', 'en-gb')
 * @returns HTML lang value (e.g., 'es', 'en', 'en-GB')
 */
export const getHtmlLangFromUrlCode = (urlCode: string | undefined): string => {
  if (!urlCode) {
    return DEFAULT_HTML_LANG;
  }

  const normalized = urlCode.toLowerCase();
  return URL_TO_HTML_LANG_MAP[normalized] || DEFAULT_HTML_LANG;
};

/**
 * Composable to set HTML lang attribute based on current route
 * @returns HTML lang value for current page
 */
export const useHtmlLang = () => {
  const route = useRoute();
  
  // Get language from URL parameter
  const langFromUrl = route.params.lang as string | undefined;
  
  // Map to HTML lang value
  const htmlLang = getHtmlLangFromUrlCode(langFromUrl);
  
  return {
    htmlLang,
  };
};

