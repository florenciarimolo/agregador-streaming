import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import type { H3Event } from 'h3';
import { TABLES, PROFILES_FIELDS } from '@/composables/database/constants';

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
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
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

    // Priority: preferences.preferred_languages > settings.language > default
    let language = defaults.language;
    if (preferencesResult.data?.preferred_languages?.length > 0) {
      // Use first preferred language, convert to TMDB format (e.g., 'es' -> 'es-ES')
      const lang = String(preferencesResult.data.preferred_languages[0]);
      // Map common language codes to TMDB format
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
    // If any error occurs, return defaults
    console.error('Error getting user TMDB params from event:', error);
    return defaults;
  }
}
