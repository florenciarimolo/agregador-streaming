import { createClient } from '@supabase/supabase-js';
import { createError, readBody } from 'h3';
import { getTMDBConfig } from '@/server/utils/config';
import { getUserTMDBParams } from '@/server/utils/user-preferences';
import { TITLES_COLUMNS } from '@/constants/db/columns';
import { TABLES } from '@/constants/db/tables';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { type MultiLanguageText } from '@/services/titles';

/**
 * Endpoint to fetch and save tagline from TMDB when it's missing in the database
 * POST /api/titles/fetch-tagline
 * Body: { tmdb_id: number, type: 'movie' | 'tv' }
 */
export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const body = await readBody(event);
    const { tmdb_id, type } = body;

    if (!tmdb_id || !type) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: tmdb_id and type',
      });
    }

    if (type !== MEDIA_TYPE.MOVIE && type !== MEDIA_TYPE.TV) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid type. Must be "movie" or "tv"',
      });
    }

    // Get user preferences for language
    const { language: userLanguage, region } = await getUserTMDBParams(event);
    const tmdbConfig = getTMDBConfig(userLanguage, region);

    // Connect to Supabase
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;
    const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // Check if title exists in DB and if tagline is missing
    const { data: titleFromDb, error: dbError } = await supabase
      .from(TABLES.TITLES)
      .select('*')
      .eq(TITLES_COLUMNS.TMDB_ID, tmdb_id)
      .eq(TITLES_COLUMNS.TYPE, type)
      .maybeSingle();

    if (dbError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Error querying database',
        data: dbError,
      });
    }

    if (!titleFromDb) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Title not found in database',
      });
    }

    // Check if tagline already exists
    const existingTagline = titleFromDb.tagline as MultiLanguageText | null;
    const hasTaglineInLanguage =
      existingTagline &&
      typeof existingTagline === 'object' &&
      existingTagline[userLanguage] &&
      existingTagline[userLanguage].trim() !== '';

    if (hasTaglineInLanguage) {
      // Tagline already exists, return it
      return {
        success: true,
        tagline: existingTagline,
        message: 'Tagline already exists in database',
      };
    }

    // Fetch tagline from TMDB
    const endpoint = type === MEDIA_TYPE.MOVIE ? `/movie/${tmdb_id}` : `/tv/${tmdb_id}`;
    const tmdbResponse = await $fetch<{
      tagline?: string;
    }>(`${tmdbConfig.baseUrl}${endpoint}`, {
      query: {
        api_key: tmdbConfig.apiKey,
        language: tmdbConfig.language,
        region: tmdbConfig.region,
      },
    }).catch(() => null);

    if (!tmdbResponse || !tmdbResponse.tagline || tmdbResponse.tagline.trim() === '') {
      return {
        success: false,
        message: 'Tagline not available in TMDB',
        tagline: null,
      };
    }

    // Update database with tagline
    const updatedTagline: MultiLanguageText = {
      ...(existingTagline || {}),
      [userLanguage]: tmdbResponse.tagline,
    };

    const { error: updateError } = await supabase
      .from(TABLES.TITLES)
      .update({
        tagline: updatedTagline,
      })
      .eq(TITLES_COLUMNS.TMDB_ID, tmdb_id)
      .eq(TITLES_COLUMNS.TYPE, type);

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Error updating tagline in database',
        data: updateError,
      });
    }

    return {
      success: true,
      tagline: updatedTagline,
      message: 'Tagline fetched and saved successfully',
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching tagline',
      data: error,
    });
  }
});

