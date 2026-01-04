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
    // Get settings (for app language/region)
    const settingsResult = await getSettingsServer(userId);

    // Priority: settings.language > default
    let language = defaults.language;
    if (settingsResult.data?.language) {
      // Use app language setting
      const lang = String(settingsResult.data.language);
      language = toTMDBLanguageCode(lang);
    }

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
    // Try to get user from event
    const user = await serverSupabaseUser(event);

    if (!user) {
      return defaults;
    }

    const userId = user.id || (user as { sub?: string }).sub;

    if (!userId) {
      return defaults;
    }

    return await getUserTMDBParamsByUserId(userId);
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

    if (isAuthError) {
      // This is expected when user is not logged in, return defaults silently
      return defaults;
    }

    // For other unexpected errors, log them
    if (import.meta.dev) {
      console.error('Error getting user TMDB params from event:', error);
    }
    return defaults;
  }
}
