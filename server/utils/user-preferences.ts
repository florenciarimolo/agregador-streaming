import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import type { H3Event } from 'h3';
import {
  TABLES,
  PROFILES_FIELDS,
  USER_PREFERENCES_FIELDS,
} from '@/composables/database/constants';
import { LanguageCode, toTMDBLanguageCode } from '@/constants/languages';

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
    .eq(USER_PREFERENCES_FIELDS.USER_ID, userId)
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
    .select(`${PROFILES_FIELDS.SETTINGS}`)
    .eq(PROFILES_FIELDS.ID, userId)
    .single();

  if (profileError || !profile) {
    return { data: null, error: profileError };
  }

  return {
    data:
      (profile[PROFILES_FIELDS.SETTINGS] as Record<string, unknown>) || null,
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
    // Get settings (for region only - language is NOT stored in DB, only in cookies)
    const settingsResult = await getSettingsServer(userId);

    // Language is always from cookies, not from database
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
 * Language is read from cookies (i18n_redirected), NOT from database
 * Region is read from database (profiles.settings.region)
 * Returns default values if user is not authenticated or preferences not set
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

  try {
    // Get language from cookies (i18n_redirected cookie from Nuxt i18n)
    let language = defaults.language;
    try {
      const cookies = parseCookies(event);
      const i18nCookie = cookies['i18n_redirected'];
      if (i18nCookie) {
        language = toTMDBLanguageCode(i18nCookie);
      }
    } catch {
      // If error reading cookies, use default
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

    return {
      language,
      region,
    };
  } catch (error) {
    // If any error occurs, return defaults
    if (import.meta.dev) {
      console.error('Error getting user TMDB params from event:', error);
    }
    return defaults;
  }
}
