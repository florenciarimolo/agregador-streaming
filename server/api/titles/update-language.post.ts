import { createClient } from '@supabase/supabase-js';
import { getTMDBConfig } from '../../utils/config';
import { getUserTMDBParams } from '../../utils/user-preferences';
import { TABLES, TITLES_FIELDS } from '@/composables/database/constants';
import type { MultiLanguageText } from '@/composables/database/titles';

/**
 * Update title and overview JSONB with missing language from TMDB
 */
export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const body = await readBody(event);
    const { tmdb_id, type } = body;

    if (!tmdb_id || !type) {
      throw createError({
        statusCode: 400,
        statusMessage: 'tmdb_id and type are required',
      });
    }

    // Get user preferences for language
    const { language: userLanguage, region } = await getUserTMDBParams(event);
    // IMPORTANT: Use the full ISO/TMDB format (e.g., 'ca-ES', 'es-ES') for consistency
    // This matches the format used by TMDB API and ensures no inconsistencies

    // Create Supabase client
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;
    const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // Get title from database
    const { data: titleFromDb, error: dbError } = await supabase
      .from(TABLES.TITLES)
      .select('*')
      .eq(TITLES_FIELDS.TMDB_ID, tmdb_id)
      .eq(TITLES_FIELDS.TYPE, type)
      .maybeSingle();

    if (dbError || !titleFromDb) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Title not found in database',
      });
    }

    const titleJsonb = titleFromDb.title as MultiLanguageText;
    const overviewJsonb = titleFromDb.overview as MultiLanguageText | null;
    const posterPathJsonb = titleFromDb.poster_path as MultiLanguageText | null;

    // Check if we already have the user's language (using ISO/TMDB format)
    const hasTitleLanguage =
      titleJsonb && typeof titleJsonb === 'object' && titleJsonb[userLanguage];
    const hasOverviewLanguage =
      overviewJsonb &&
      typeof overviewJsonb === 'object' &&
      overviewJsonb[userLanguage];
    const hasPosterPathLanguage =
      posterPathJsonb &&
      typeof posterPathJsonb === 'object' &&
      posterPathJsonb[userLanguage];

    // If all are available, no need to fetch, but still return the values
    if (hasTitleLanguage && hasOverviewLanguage && hasPosterPathLanguage) {
      return {
        success: true,
        title: titleJsonb[userLanguage] || '',
        overview: overviewJsonb?.[userLanguage] || '',
        poster_path: posterPathJsonb[userLanguage] || '',
      };
    }

    // Fetch missing language from TMDB
    const tmdbConfig = getTMDBConfig(userLanguage, region);
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const tmdbResponse = await $fetch<{
      title?: string;
      name?: string;
      overview?: string;
      poster_path?: string;
    }>(`${tmdbConfig.baseUrl}/${endpoint}/${tmdb_id}`, {
      query: {
        api_key: tmdbConfig.apiKey,
        language: tmdbConfig.language,
        region: tmdbConfig.region,
      },
    }).catch(() => null);

    if (!tmdbResponse) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch from TMDB',
      });
    }

    // Update JSONB with new language
    // IMPORTANT: Use the full ISO/TMDB format (e.g., 'ca-ES', 'es-ES') for consistency
    // This matches the format used by TMDB API and ensures no inconsistencies
    const updatedTitle: MultiLanguageText = {
      ...(titleJsonb || {}),
    };
    const updatedOverview: MultiLanguageText = {
      ...(overviewJsonb || {}),
    };
    const updatedPosterPath: MultiLanguageText = {
      ...(posterPathJsonb || {}),
    };

    // Add title if missing (using ISO/TMDB format)
    if (!hasTitleLanguage && (tmdbResponse.title || tmdbResponse.name)) {
      updatedTitle[userLanguage] =
        tmdbResponse.title || tmdbResponse.name || '';
    }

    // Add overview if missing (using ISO/TMDB format)
    if (!hasOverviewLanguage && tmdbResponse.overview) {
      updatedOverview[userLanguage] = tmdbResponse.overview || '';
    }

    // Add poster_path if missing (using ISO/TMDB format)
    if (!hasPosterPathLanguage && tmdbResponse.poster_path) {
      updatedPosterPath[userLanguage] = tmdbResponse.poster_path || '';
    }

    // Update database with the updated JSONB objects
    // This ensures the language code in JSONB matches the ISO/TMDB format used throughout
    const { error: updateError } = await supabase
      .from(TABLES.TITLES)
      .update({
        title: updatedTitle,
        overview: updatedOverview,
        poster_path: updatedPosterPath,
      })
      .eq(TITLES_FIELDS.TMDB_ID, tmdb_id)
      .eq(TITLES_FIELDS.TYPE, type);

    if (updateError) {
      console.error('[update-language] Error updating database:', updateError);
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update title in database',
      });
    }

    return {
      success: true,
      title: updatedTitle[userLanguage] || titleJsonb[userLanguage] || '',
      overview:
        updatedOverview[userLanguage] || overviewJsonb?.[userLanguage] || '',
      poster_path:
        updatedPosterPath[userLanguage] ||
        posterPathJsonb?.[userLanguage] ||
        '',
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
