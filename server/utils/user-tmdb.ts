import type { H3Event } from 'h3';
import { getRequestURL, getRequestHeader, getQuery } from 'h3';
import { LanguageCode, toTMDBLanguageCode } from '@/constants/languages';
import { extractLangFromPath } from '@/composables/useRouteWithLang';
import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { getUserPreferencesServer } from '@/server/utils/user-preferences';
import { DEFAULT_REGION } from '@/constants/regions';

/**
 * Get user's language and region preferences for TMDB API calls by userId
 * Returns default values if preferences not set
 */
export async function getUserTMDBParamsByUserId(userId: string): Promise<{
  language: string;
  region: string;
}> {
  const defaults = {
    language: LanguageCode.SPANISH,
    region: DEFAULT_REGION,
  };

  try {
    // Get region from user_preferences table (same source as preferences endpoint)
    const preferencesResult = await getUserPreferencesServer(userId);

    // Language is always from URL, not from database or cookies
    // This function should not be used for language, but we return default for compatibility
    const language = defaults.language;

    // Priority: user_preferences.region > default
    let region = defaults.region;
    if (preferencesResult.data?.region) {
      region = String(preferencesResult.data.region);
    }

    return {
      language,
      region,
    };
  } catch (error) {
    // If any error occurs, return defaults
    const { logError } = await import('@/server/utils/logger');
    logError('[UserTMDB] Error getting user TMDB params', error as Error);
    return defaults;
  }
}

/**
 * Get user's language and region preferences for TMDB API calls from event
 * Language is read from URL (route.params.lang), NOT from cookies or database
 * Region is read from database (user_preferences.region)
 * Returns default values if user is not authenticated or preferences not set
 *
 * Results are cached per request to avoid duplicate processing
 */
export async function getUserTMDBParams(event?: H3Event): Promise<{
  language: string;
  region: string;
}> {
  const defaults = {
    language: LanguageCode.SPANISH,
    region: DEFAULT_REGION,
  };

  if (!event) {
    return defaults;
  }

  // Cache result per request to avoid duplicate processing
  const cacheKey = '__getUserTMDBParams_cache__';
  if (event.context[cacheKey]) {
    return event.context[cacheKey] as { language: string; region: string };
  }

  try {
    // Get language from URL - deterministic source of truth
    // Priority: 1) query parameter (lang), 2) route.params.lang (if available), 3) extract from Referer header, 4) extract from request URL path, 5) default
    let language = defaults.language;
    try {
      const query = getQuery(event);
      let langFromUrl: string | undefined;

      // Priority 1: Query parameter (most reliable for API calls from pages)
      if (query.lang && typeof query.lang === 'string') {
        langFromUrl = query.lang.toLowerCase();
      }

      // Priority 2: Try to get lang from route params (if route has :lang parameter)
      if (!langFromUrl) {
        const params = event.context.params || {};
        langFromUrl = params.lang as string | undefined;
      }

      // Priority 3: If not in params, try to extract from Referer header
      // This handles cases where API routes don't have :lang in their route definition
      // but the request comes from a page URL that does have the language prefix (e.g., /gl/movie/123)
      if (!langFromUrl) {
        try {
          const referer = getRequestHeader(event, 'referer');
          if (referer) {
            try {
              const refererUrl = new URL(referer);
              const extractedLang = extractLangFromPath(refererUrl.pathname);
              if (extractedLang) {
                langFromUrl = extractedLang;
              }
            } catch {
              // If URL parsing fails, try direct path extraction
              const extractedLang = extractLangFromPath(referer);
              if (extractedLang) {
                langFromUrl = extractedLang;
              }
            }
          }
        } catch {
          // If referer extraction fails, continue to next priority
        }
      }

      // Priority 4: If still not found, try to extract from request URL path
      // This is a fallback for cases where referer is not available
      if (!langFromUrl) {
        try {
          const requestUrl = getRequestURL(event);
          const pathname = requestUrl.pathname;
          const extractedLang = extractLangFromPath(pathname);
          if (extractedLang) {
            langFromUrl = extractedLang;
          }
        } catch {
          // If extraction fails, continue with default
        }
      }

      if (langFromUrl) {
        // Map URL code to i18n code, then to TMDB language code
        // Use dynamic import to avoid loading Vue dependencies in server context
        try {
          const { getI18nCodeFromUrlCode } =
            await import('@/composables/useLangFromUrl');
          const i18nCode = getI18nCodeFromUrlCode(langFromUrl.toLowerCase());
          if (i18nCode) {
            language = toTMDBLanguageCode(i18nCode);
          }
        } catch (importError) {
          // If dynamic import fails, use default
          const { logWarn } = await import('@/server/utils/logger');
          logWarn('[UserTMDB] Error importing getI18nCodeFromUrlCode', {
            error:
              importError instanceof Error
                ? importError.message
                : 'Unknown error',
          });
          // Continue with default language
        }
      }
    } catch (error) {
      // If error reading from URL, use default
      const { logWarn } = await import('@/server/utils/logger');
      logWarn('[UserTMDB] Error extracting language from URL', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      language = defaults.language;
    }

    // Get region from database (user_preferences table - same source as /api/users/preferences)
    // Use the SAME function as preferences.get.ts to get userId (ensures consistency)
    let region = defaults.region;
    const userId = await getUserIdFromEvent(event);

    // If we have a userId, fetch region from database (same source as preferences endpoint)
    if (userId) {
      try {
        // Get region from user_preferences table (same source as preferences endpoint)
        const preferencesResult = await getUserPreferencesServer(userId);

        // IMPORTANT: Only use region from DB if it's a valid non-null value
        // If region is null in DB, we should return null (not default), to match preferences.get.ts behavior
        // However, for TMDB API calls, we need a valid region, so we use default as fallback
        // This is a difference: preferences.get.ts returns null, but getUserTMDBParams needs a valid region for API calls
        if (
          preferencesResult.data?.region &&
          preferencesResult.data.region !== null
        ) {
          region = String(preferencesResult.data.region);
        }
      } catch (error) {
        // If error fetching preferences, use default region
        const { logError } = await import('@/server/utils/logger');
        logError('[UserTMDB] Error fetching preferences', error as Error, {
          userId,
        });
      }
    }

    const result = {
      language,
      region,
    };

    // Cache result for this request
    event.context[cacheKey] = result;

    return result;
  } catch (error) {
    // If any error occurs, return defaults
    const { logError } = await import('@/server/utils/logger');
    logError(
      '[UserTMDB] Error getting user TMDB params from event',
      error as Error
    );
    const result = defaults;
    // Cache defaults too to avoid retrying on error
    event.context[cacheKey] = result;
    return result;
  }
}
