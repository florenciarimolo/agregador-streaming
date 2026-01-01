import { serverSupabaseUser } from '#supabase/server';
import type { H3Event } from 'h3';
import { getUserPreferences } from '@/composables/database/preferences';
import { getSettings } from '@/composables/database/profiles';

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
      getUserPreferences(userId),
      getSettings(userId),
    ]);

    // Priority: preferences.preferred_languages > settings.language > default
    let language = defaults.language;
    if (preferencesResult.data?.preferred_languages?.length > 0) {
      // Use first preferred language, convert to TMDB format (e.g., 'es' -> 'es-ES')
      const lang = preferencesResult.data.preferred_languages[0];
      // Map common language codes to TMDB format
      const langMap: Record<string, string> = {
        es: 'es-ES',
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
      const lang = settingsResult.data.language;
      const langMap: Record<string, string> = {
        es: 'es-ES',
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
      region = settingsResult.data.region;
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
