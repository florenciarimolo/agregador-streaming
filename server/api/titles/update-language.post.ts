import { createClient } from '@supabase/supabase-js';
import { getTMDBConfig } from '../../utils/config';
import { getUserTMDBParams } from '../../utils/user-preferences';
import { TABLES, TITLES_FIELDS } from '@/composables/database/constants';
import { extractLanguageCode } from '@/constants/languages';
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
    const langCode = extractLanguageCode(userLanguage);

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

    // Check if we already have the user's language
    const hasTitleLanguage =
      titleJsonb && typeof titleJsonb === 'object' && titleJsonb[langCode];
    const hasOverviewLanguage =
      overviewJsonb &&
      typeof overviewJsonb === 'object' &&
      overviewJsonb[langCode];

    // If both are available, no need to fetch, but still return the values
    if (hasTitleLanguage && hasOverviewLanguage) {
      return {
        success: true,
        title: titleJsonb[langCode] || '',
        overview: overviewJsonb?.[langCode] || '',
      };
    }

    // Fetch missing language from TMDB
    const tmdbConfig = getTMDBConfig(userLanguage, region);
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const tmdbResponse = await $fetch(`${tmdbConfig.baseUrl}/${endpoint}/${tmdb_id}`, {
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
    const updatedTitle: MultiLanguageText = {
      ...(titleJsonb || {}),
    };
    const updatedOverview: MultiLanguageText = {
      ...(overviewJsonb || {}),
    };

    // Add title if missing
    if (!hasTitleLanguage && (tmdbResponse.title || tmdbResponse.name)) {
      updatedTitle[langCode] = tmdbResponse.title || tmdbResponse.name || '';
    }

    // Add overview if missing
    if (!hasOverviewLanguage && tmdbResponse.overview) {
      updatedOverview[langCode] = tmdbResponse.overview || '';
    }

    // Update database
    const { error: updateError } = await supabase
      .from(TABLES.TITLES)
      .update({
        title: updatedTitle,
        overview: updatedOverview,
      })
      .eq(TITLES_FIELDS.TMDB_ID, tmdb_id)
      .eq(TITLES_FIELDS.TYPE, type);

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update title in database',
      });
    }

    return {
      success: true,
      title: updatedTitle[langCode] || titleJsonb[langCode] || '',
      overview: updatedOverview[langCode] || overviewJsonb?.[langCode] || '',
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

