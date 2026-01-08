import { getTMDBConfig } from '@/server/utils/config';
import { AVAILABLE_FLAG_CODES } from '@/constants/availableFlags';

/**
 * Cache for regions data by language
 * Cache duration: 24 hours (regions don't change frequently)
 * Key: language code (e.g., 'es-ES', 'en-US')
 */
const regionsCache = new Map<
  string,
  {
    data: Array<{ iso_3166_1: string; native_name: string }>;
    timestamp: number;
  }
>();

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Get available flag codes
 * Uses the auto-generated constants file created during build
 * This works in all environments (local, Vercel, serverless) without filesystem access
 */
function getAvailableFlags(): Set<string> {
  // AVAILABLE_FLAG_CODES is generated during build from public/icons/flags/
  // This avoids filesystem access issues in serverless environments
  return AVAILABLE_FLAG_CODES;
}

/**
 * Get regions from TMDB API with caching by language
 * Uses app language (i18n locale) from cookies, or query parameter, or default
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { DEFAULT_LANGUAGE } = await import('@/constants/languages');

    // Get app language (i18n locale) from URL (route.params.lang) or query parameter
    // NOTE: No cookies - language comes from URL only
    const params = event.context.params || {};
    let language: string = DEFAULT_LANGUAGE;

    // Priority 1: URL parameter (route.params.lang) - deterministic source of truth
    const langFromUrl = params.lang as string | undefined;
    if (langFromUrl) {
      const { getI18nCodeFromUrlCode } =
        await import('@/composables/useLangFromUrl');
      const i18nCode = getI18nCodeFromUrlCode(langFromUrl.toLowerCase());
      if (i18nCode) {
        language = i18nCode;
      }
    }
    // Priority 2: Query parameter (fallback for API calls)
    // CRITICAL: Convert URL code (e.g., 'en') to i18n code (e.g., 'en-US') for TMDB
    else if (query.language && typeof query.language === 'string') {
      const langParam = query.language;

      if (import.meta.dev) {
        console.log(
          '[Regions] Processing query language parameter:',
          langParam
        );
      }

      // Check if it's already an i18n code (contains hyphen, e.g., 'es-ES', 'en-US')
      if (langParam.includes('-')) {
        // Normalize i18n code: lowercase first part, uppercase second part (e.g., 'es-ES')
        const parts = langParam.split('-');
        if (parts.length === 2) {
          const normalizedI18nCode = `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
          // Verify it's a valid i18n code by checking if we can get URL code from it
          const { getI18nCodeFromUrlCode, getUrlCodeFromI18nCode } =
            await import('@/composables/useLangFromUrl');
          const urlCode = getUrlCodeFromI18nCode(normalizedI18nCode);
          if (urlCode) {
            // Valid i18n code, use normalized version
            language = normalizedI18nCode;
            if (import.meta.dev) {
              console.log(
                '[Regions] Using normalized i18n code:',
                langParam,
                '->',
                normalizedI18nCode
              );
            }
          } else {
            // Invalid i18n code, try to convert as URL code
            const i18nCode = getI18nCodeFromUrlCode(langParam.toLowerCase());
            if (i18nCode) {
              language = i18nCode;
            } else {
              // Fallback to default
              language = DEFAULT_LANGUAGE;
            }
          }
        } else {
          // Invalid format, try to convert as URL code
          const { getI18nCodeFromUrlCode } =
            await import('@/composables/useLangFromUrl');
          const i18nCode = getI18nCodeFromUrlCode(langParam.toLowerCase());
          if (i18nCode) {
            language = i18nCode;
          } else {
            language = DEFAULT_LANGUAGE;
          }
        }
      } else {
        // No hyphen, treat as URL code (e.g., 'es', 'en')
        const { getI18nCodeFromUrlCode } =
          await import('@/composables/useLangFromUrl');
        const i18nCode = getI18nCodeFromUrlCode(langParam.toLowerCase());
        if (i18nCode) {
          language = i18nCode;
          if (import.meta.dev) {
            console.log(
              '[Regions] Converted URL code to i18n code:',
              langParam,
              '->',
              i18nCode
            );
          }
        } else {
          // Use toTMDBLanguageCode as fallback
          const { toTMDBLanguageCode } = await import('@/constants/languages');
          language = toTMDBLanguageCode(langParam);
          if (import.meta.dev) {
            console.log(
              '[Regions] Using toTMDBLanguageCode fallback:',
              langParam,
              '->',
              language
            );
          }
        }
      }
    }
    // Priority 3: Default (no cookies - language comes from URL only)

    // Get TMDB config to determine the exact language code sent to TMDB
    // This ensures the response language field matches what was sent to TMDB (for debug)
    const tmdbConfig = getTMDBConfig(language);
    // Use tmdbConfig.language as the language value in response (exactly what we send to TMDB)
    // This is the exact value that will be sent to TMDB API
    const tmdbLanguage = tmdbConfig.language;

    // Check cache for this specific language (use the language variable for cache key)
    const now = Date.now();
    const cachedData = regionsCache.get(language);
    if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
      // Return cached data for this language
      const availableFlags = await getAvailableFlags();
      const filteredRegions = cachedData.data
        .filter((region) => availableFlags.has(region.iso_3166_1))
        .map((region) => ({
          code: region.iso_3166_1,
          name: region.native_name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Set cache headers
      event.node.res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
      event.node.res.setHeader('X-Cache', 'HIT');
      event.node.res.setHeader('X-Cache-Language', language);

      return {
        success: true,
        regions: filteredRegions,
        cached: true,
        language: tmdbLanguage, // Return the exact language sent to TMDB (for debug)
      };
    }

    // Fetch from TMDB API for this language

    if (import.meta.dev) {
      console.log('[Regions] Fetching from TMDB:', {
        inputLanguage: language,
        tmdbLanguage: tmdbConfig.language,
        baseUrl: tmdbConfig.baseUrl,
      });
    }

    // The exact language code that will be sent to TMDB API
    const languageSentToTMDB = tmdbConfig.language;

    const response = await $fetch<{
      results: Array<{ iso_3166_1: string; native_name: string }>;
    }>(`${tmdbConfig.baseUrl}/watch/providers/regions`, {
      query: {
        api_key: tmdbConfig.apiKey,
        language: languageSentToTMDB,
      },
    });

    if (!response || !response.results) {
      throw new Error('Invalid response from TMDB API');
    }

    // Log TMDB response (visible in production for debugging)
    console.log('[Regions] TMDB response:', {
      totalRegions: response.results.length,
      sampleRegions: response.results.slice(0, 5),
      languageSentToTMDB: languageSentToTMDB,
      tmdbUrl: `${tmdbConfig.baseUrl}/watch/providers/regions`,
    });

    // Update cache for this language
    regionsCache.set(language, {
      data: response.results,
      timestamp: now,
    });

    // Get available flags and filter regions
    const availableFlags = getAvailableFlags();

    const filteredRegions = response.results
      .filter((region) => availableFlags.has(region.iso_3166_1))
      .map((region) => ({
        code: region.iso_3166_1,
        name: region.native_name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Debug: Show which regions from TMDB don't have flags (visible in production)
    const regionsWithoutFlags = response.results
      .filter((region) => !availableFlags.has(region.iso_3166_1))
      .slice(0, 10)
      .map((r) => r.iso_3166_1);

    console.log('[Regions] Filtered regions:', {
      totalFromTMDB: response.results.length,
      filteredCount: filteredRegions.length,
      sampleFiltered: filteredRegions.slice(0, 5),
      regionsWithoutFlags: regionsWithoutFlags,
      sampleRegionsFromTMDB: response.results.slice(0, 5).map((r) => ({
        code: r.iso_3166_1,
        hasFlag: availableFlags.has(r.iso_3166_1),
      })),
    });

    // Set cache headers
    event.node.res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
    event.node.res.setHeader('X-Cache', 'MISS');
    event.node.res.setHeader('X-Cache-Language', language);

    return {
      success: true,
      regions: filteredRegions,
      cached: false,
      language: languageSentToTMDB, // Return the exact language sent to TMDB (for debug)
    };
  } catch (error) {
    console.error('[Regions] Error fetching regions from TMDB:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch regions from TMDB',
    });
  }
});
