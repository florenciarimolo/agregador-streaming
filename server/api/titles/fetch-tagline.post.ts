import { createClient } from '@supabase/supabase-js';
import { createError, readBody } from 'h3';
import { getTMDBConfig } from '@/server/utils/config';
import { getUserTMDBParams } from '@/server/utils/user-tmdb';
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
    let userLanguage: string;
    let region: string | null;
    try {
      const params = await getUserTMDBParams(event);
      userLanguage = params.language;
      region = params.region || null;
    } catch (error) {
      // Fallback to defaults if getUserTMDBParams fails
      if (import.meta.dev) {
        console.error('[fetch-tagline] Error getting user TMDB params:', error);
      }
      userLanguage = 'es-ES';
      region = 'ES';
    }
    const tmdbConfig = getTMDBConfig(userLanguage, region || undefined);

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

    // If title doesn't exist in DB, fetch it from TMDB and create it
    if (!titleFromDb) {
      try {
        // Fetch full title data from TMDB
        const endpoint =
          type === MEDIA_TYPE.MOVIE ? `/movie/${tmdb_id}` : `/tv/${tmdb_id}`;
        
        const fullTmdbResponse = await $fetch<{
          title?: string;
          name?: string;
          overview?: string;
          poster_path?: string | null;
          backdrop_path?: string | null;
          vote_average?: number;
          release_date?: string;
          first_air_date?: string;
          genres?: Array<{ id: number; name: string }>;
          status?: string;
          runtime?: number;
          tagline?: string;
        }>(`${tmdbConfig.baseUrl}${endpoint}`, {
          query: {
            api_key: tmdbConfig.apiKey,
            language: tmdbConfig.language,
            region: tmdbConfig.region,
          },
        });

        if (!fullTmdbResponse) {
          throw createError({
            statusCode: 404,
            statusMessage: 'Title not found in TMDB',
          });
        }

        // Create title in database with basic data
        const titleMultiLang: MultiLanguageText = {
          [userLanguage]: fullTmdbResponse.title || fullTmdbResponse.name || '',
        };
        const overviewMultiLang: MultiLanguageText = fullTmdbResponse.overview
          ? { [userLanguage]: fullTmdbResponse.overview }
          : {};
        const posterPathMultiLang: MultiLanguageText = fullTmdbResponse.poster_path
          ? { [userLanguage]: fullTmdbResponse.poster_path }
          : {};
        const taglineMultiLang: MultiLanguageText = fullTmdbResponse.tagline
          ? { [userLanguage]: fullTmdbResponse.tagline }
          : {};

        const insertData: Record<string, unknown> = {
          tmdb_id: tmdb_id,
          type: type,
          title: titleMultiLang,
          overview: Object.keys(overviewMultiLang).length > 0 ? overviewMultiLang : null,
          poster_path: Object.keys(posterPathMultiLang).length > 0 ? posterPathMultiLang : null,
          tagline: Object.keys(taglineMultiLang).length > 0 ? taglineMultiLang : null,
          backdrop_path: fullTmdbResponse.backdrop_path || null,
          vote_average: fullTmdbResponse.vote_average || null,
          genres: fullTmdbResponse.genres || null,
          status: fullTmdbResponse.status || null,
        };

        if (type === MEDIA_TYPE.MOVIE) {
          insertData.release_date = fullTmdbResponse.release_date || null;
          insertData.runtime = fullTmdbResponse.runtime || null;
        } else {
          insertData.first_air_date = fullTmdbResponse.first_air_date || null;
        }

        const { data: insertedTitle, error: insertError } = await supabase
          .from(TABLES.TITLES)
          .insert(insertData as never)
          .select()
          .single();

        if (insertError || !insertedTitle) {
          throw createError({
            statusCode: 500,
            statusMessage: 'Error creating title in database',
            data: insertError,
          });
        }

        // If we got tagline from TMDB, return it
        if (fullTmdbResponse.tagline && fullTmdbResponse.tagline.trim() !== '') {
          return {
            success: true,
            tagline: taglineMultiLang,
            message: 'Title created and tagline fetched from TMDB',
          };
        }

        // If no tagline in TMDB response, continue with fallback logic below
      } catch (error) {
        // If error is already a createError, re-throw it
        if (error && typeof error === 'object' && 'statusCode' in error) {
          throw error;
        }
        // Otherwise, log and return error
        if (import.meta.dev) {
          console.error('[fetch-tagline] Error creating title from TMDB:', error);
        }
        throw createError({
          statusCode: 500,
          statusMessage: 'Error fetching title from TMDB',
          data: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Re-fetch title from DB (in case we just created it)
    const { data: titleFromDbAfter, error: dbErrorAfter } = await supabase
      .from(TABLES.TITLES)
      .select('*')
      .eq(TITLES_COLUMNS.TMDB_ID, tmdb_id)
      .eq(TITLES_COLUMNS.TYPE, type)
      .maybeSingle();

    if (dbErrorAfter || !titleFromDbAfter) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Error querying database after title creation',
        data: dbErrorAfter,
      });
    }

    // Check if tagline already exists in requested language
    const existingTagline = titleFromDbAfter.tagline as MultiLanguageText | null;
    const hasTaglineInLanguage =
      existingTagline &&
      typeof existingTagline === 'object' &&
      existingTagline[userLanguage] &&
      existingTagline[userLanguage].trim() !== '';

    if (hasTaglineInLanguage) {
      // Tagline already exists in requested language, return it
      return {
        success: true,
        tagline: existingTagline,
        message: 'Tagline already exists in database',
      };
    }

    // Use the same fallback logic as recommendations
    const endpoint =
      type === MEDIA_TYPE.MOVIE ? `/movie/${tmdb_id}` : `/tv/${tmdb_id}`;

    // First try to fetch in requested language
    const tmdbResponse = await $fetch<{
      tagline?: string;
    }>(`${tmdbConfig.baseUrl}${endpoint}`, {
      query: {
        api_key: tmdbConfig.apiKey,
        language: tmdbConfig.language,
        region: tmdbConfig.region,
      },
    }).catch(() => null);

    let finalTagline = tmdbResponse?.tagline || '';
    const mergedTaglineJsonb: MultiLanguageText = {
      ...(existingTagline || {}),
    };

    // If tagline is still empty, try fetching with primary language of region as fallback
    if (!finalTagline || finalTagline.trim() === '') {
      try {
        const { fetchTaglineWithPrimaryLanguageFallback } =
          await import('@/server/utils/title-extraction');
        finalTagline = await fetchTaglineWithPrimaryLanguageFallback(
          finalTagline,
          tmdb_id,
          type as typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV,
          userLanguage,
          region || null,
          endpoint,
          mergedTaglineJsonb,
          supabase
        );
      } catch (fallbackError) {
        // Log but don't fail - fallback is optional
        if (import.meta.dev) {
          console.error(
            '[fetch-tagline] Error in fetchTaglineWithPrimaryLanguageFallback:',
            fallbackError
          );
        }
        // Continue with empty finalTagline
      }
    }

    // If we got tagline from requested language, add it to mergedTaglineJsonb
    if (tmdbResponse?.tagline && tmdbResponse.tagline.trim() !== '') {
      mergedTaglineJsonb[userLanguage] = tmdbResponse.tagline;
    }

    // Update database with tagline (either from requested language or primary language fallback)
    if (finalTagline && finalTagline.trim() !== '') {
      const { error: updateError } = await supabase
        .from(TABLES.TITLES)
        .update({
          tagline: mergedTaglineJsonb,
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
        tagline: mergedTaglineJsonb,
        message: 'Tagline fetched and saved successfully',
      };
    }

    // If tagline was not found in TMDB, but we have existing tagline in database (e.g., in English),
    // return it so the client can use getTaglineInLanguage to extract it with fallback
    if (existingTagline && typeof existingTagline === 'object') {
      return {
        success: true,
        tagline: existingTagline,
        message:
          'Tagline not available in requested language, but exists in database',
      };
    }

    return {
      success: false,
      message: 'Tagline not available in TMDB or database',
      tagline: null,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    // Log the full error for debugging
    if (import.meta.dev) {
      console.error('[fetch-tagline] Error:', error);
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching tagline',
      data: error instanceof Error ? error.message : String(error),
    });
  }
});
