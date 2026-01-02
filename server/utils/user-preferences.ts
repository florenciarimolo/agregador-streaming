import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import type { H3Event } from 'h3';
import {
  TABLES,
  PROFILES_FIELDS,
  USER_PREFERENCES_FIELDS,
} from '@/composables/database/constants';

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
    language: 'es-ES',
    region: 'ES',
  };

  try {
    // Get preferences (for content language) and settings (for app language/region)
    const [preferencesResult, settingsResult] = await Promise.all([
      getUserPreferencesServer(userId),
      getSettingsServer(userId),
    ]);

    // Priority: preferences.preferred_language > settings.language > default
    let language = defaults.language;
    if (preferencesResult.data?.preferred_language) {
      // Use preferred language (should already be in TMDB format)
      const { toTMDBLanguageCode } = await import('@/constants/languages');
      language = toTMDBLanguageCode(preferencesResult.data.preferred_language);
    } else if (settingsResult.data?.language) {
      // Fallback to app language setting
      const lang = String(settingsResult.data.language);
      const langMap: Record<string, string> = {
        es: 'es-ES',
        ca: 'ca-ES', // Catalan (Spain)
        eu: 'eu-ES', // Basque (Spain)
        gl: 'gl-ES', // Galician (Spain)
        en: 'en-US',
        fr: 'fr-FR',
        de: 'de-DE',
        it: 'it-IT',
        pt: 'pt-PT',
        ja: 'ja-JP',
        ko: 'ko-KR',
        zh: 'zh-CN',
      };
      language = langMap[lang] || `${lang}-${lang.toUpperCase()}`;
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
    language: 'es-ES',
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
