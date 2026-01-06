import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import type { H3Event } from 'h3';
import { getRequestURL, getRequestHeader, getQuery } from 'h3';
import { TABLES } from '@/constants/db/tables';
import { PROFILES_COLUMNS, USER_PREFERENCES_COLUMNS } from '@/constants/db/columns';
import { SCORE_WEIGHTS } from '@/constants/domain/scoring';
import { LanguageCode, toTMDBLanguageCode } from '@/constants/languages';
import { extractLangFromPath } from '@/composables/useRouteWithLang';

/**
 * Get user preferences from server-side (using createClient)
 */
async function getUserPreferencesServer(userId: string) {
  const config = useRuntimeConfig();
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;

  const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase
    .from(TABLES.USER_PREFERENCES)
    .select('*')
    .eq(USER_PREFERENCES_COLUMNS.USER_ID, userId)
    .maybeSingle();

  return { data, error };
}

/**
 * Get user settings from server-side (using createClient)
 */
async function getSettingsServer(userId: string) {
  const config = useRuntimeConfig();
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;

  const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: profile, error: profileError } = await supabase
    .from(TABLES.PROFILES)
    .select(`${PROFILES_COLUMNS.SETTINGS}`)
    .eq(PROFILES_COLUMNS.ID, userId)
    .single();

  if (profileError || !profile) {
    return { data: null, error: profileError };
  }

  return {
    data:
      (profile[PROFILES_COLUMNS.SETTINGS] as Record<string, unknown>) || null,
    error: null,
  };
}

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
    region: 'ES',
  };

  try {
    // Get settings (for region only - language is NOT stored in DB, comes from URL)
    const settingsResult = await getSettingsServer(userId);

    // Language is always from URL, not from database or cookies
    // This function should not be used for language, but we return default for compatibility
    let language = defaults.language;

    // Priority: settings.region > default
    let region = defaults.region;
    if (settingsResult.data?.region) {
      region = String(settingsResult.data.region);
    }

    return {
      language,
      region,
    };
  } catch (error) {
    // If any error occurs, return defaults
    console.error('Error getting user TMDB params:', error);
    return defaults;
  }
}

/**
 * Get user's language and region preferences for TMDB API calls from event
 * Language is read from URL (route.params.lang), NOT from cookies or database
 * Region is read from database (profiles.settings.region)
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
    region: 'ES',
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
          const { getI18nCodeFromUrlCode } = await import('@/composables/useLangFromUrl');
          const i18nCode = getI18nCodeFromUrlCode(langFromUrl.toLowerCase());
          if (i18nCode) {
            language = toTMDBLanguageCode(i18nCode);
            if (import.meta.dev) {
              console.log(
                `[getUserTMDBParams] Language extracted: URL code=${langFromUrl}, i18nCode=${i18nCode}, TMDB code=${language}`
              );
            }
          } else if (import.meta.dev) {
            console.warn(
              `[getUserTMDBParams] Could not map URL code to i18n code: ${langFromUrl}`
            );
          }
        } catch (importError) {
          // If dynamic import fails, log and use default
          if (import.meta.dev) {
            console.warn(
              `[getUserTMDBParams] Error importing getI18nCodeFromUrlCode:`,
              importError
            );
          }
          // Continue with default language
        }
      } else if (import.meta.dev) {
        console.warn(
          `[getUserTMDBParams] No language found in URL, using default: ${language}`
        );
      }
    } catch (error) {
      // If error reading from URL, use default
      if (import.meta.dev) {
        console.warn('[getUserTMDBParams] Error extracting language from URL:', error);
      }
      language = defaults.language;
    }

    // Get region from database (user settings)
    let region = defaults.region;
    try {
      // Try to get user from event
      const user = await serverSupabaseUser(event);

      if (user) {
        const userId = user.id || (user as { sub?: string }).sub;

        if (userId) {
          // Get settings (for region only)
          const settingsResult = await getSettingsServer(userId);
          if (settingsResult.data?.region) {
            region = String(settingsResult.data.region);
          }
        }
      }
    } catch (error) {
      // If error is about missing session, this is expected and we should return defaults silently
      // Only log unexpected errors
      let isAuthError = false;

      if (error && typeof error === 'object') {
        if ('statusMessage' in error) {
          const statusMsg = String(error.statusMessage);
          isAuthError =
            statusMsg === 'Auth session missing!' ||
            statusMsg.includes('Auth session');
        } else if ('message' in error && typeof error.message === 'string') {
          isAuthError = error.message.includes('Auth session');
        }
      }

      if (!isAuthError && import.meta.dev) {
        // For other unexpected errors, log them
        console.error('Error getting user region from database:', error);
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
    if (import.meta.dev) {
      console.error('Error getting user TMDB params from event:', error);
    }
    const result = defaults;
    // Cache defaults too to avoid retrying on error
    event.context[cacheKey] = result;
    return result;
  }
}
