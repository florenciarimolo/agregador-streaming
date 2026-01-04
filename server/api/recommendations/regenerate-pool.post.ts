import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getTMDBConfig } from '../../utils/config';
import { getUserTMDBParams } from '../../utils/user-preferences';
import { devLog, devError, safeError } from '../../utils/logger';
import { TitleStatus } from '@/types/TitleStatus';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import {
  getPoolCount,
  deleteLowestScoreEntries,
  insertPoolEntries,
  type RecommendationPoolSource,
  RECOMMENDATION_POOL_FIELDS,
  TABLES as POOL_TABLES,
} from '@/services/recommendationPool';
import { TABLES, TITLES_FIELDS } from '@/services/constants';
import type { MultiLanguageText } from '@/services/titles';

const TARGET_POOL_SIZE = 200;

/**
 * Delete all recommendation pool entries for a user and regenerate them
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  let userId: string | null = null;

  // Try to get user from cookies first
  const userFromCookies = await serverSupabaseUser(event);

  if (userFromCookies) {
    userId =
      userFromCookies.id || (userFromCookies as { sub?: string }).sub || null;
    devLog('[RegeneratePool] User from cookies');
  } else {
    // Try Authorization header
    const authHeader = event.node.req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(
              parts[1].replace(/-/g, '+').replace(/_/g, '/'),
              'base64'
            ).toString()
          );

          userId = payload.sub;
          devLog('[RegeneratePool] User from Authorization header');
        }
      } catch (err) {
        safeError('[RegeneratePool] Error decoding token', err);
      }
    }
  }

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  // Create Supabase client for server-side operations
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;

  const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    // Get user preferences for language and region
    const { language, region } = await getUserTMDBParams(event);
    const tmdbConfig = getTMDBConfig(language, region);
    devLog('[RegeneratePool] Using language:', language, 'region:', region);

    // Get all pool entries for the user (DO NOT DELETE)
    // Note: title_data has been removed from recommendation_pool
    const { data: poolEntries, error: fetchError } = await supabase
      .from(POOL_TABLES.RECOMMENDATION_POOL)
      .select(`${RECOMMENDATION_POOL_FIELDS.TMDB_ID}, ${RECOMMENDATION_POOL_FIELDS.TYPE}`)
      .eq(RECOMMENDATION_POOL_FIELDS.USER_ID, userId);

    if (fetchError) {
      devError('[RegeneratePool] Error fetching pool entries:', fetchError);
      throw fetchError;
    }

    if (!poolEntries || poolEntries.length === 0) {
      devLog('[RegeneratePool] No pool entries to update');
      return {
        success: true,
        message: 'No pool entries to update',
        updated: 0,
      };
    }

    devLog('[RegeneratePool] Found', poolEntries.length, 'pool entries to update');

    // Ensure title data is in titles table for each pool entry
    // Note: title_data has been removed from recommendation_pool, data comes from titles table
    let updatedCount = 0;

    for (const entry of poolEntries) {
      try {
        const { tmdb_id, type } = entry;
        const endpoint =
          type === MediaTypeEnum.movie
            ? `/movie/${tmdb_id}`
            : `/tv/${tmdb_id}`;

        // Fetch title and overview from TMDB with new language to ensure it's in titles table
        const tmdbResponse = await $fetch(`${tmdbConfig.baseUrl}${endpoint}`, {
          query: {
            api_key: tmdbConfig.apiKey,
            language: tmdbConfig.language,
            region: tmdbConfig.region,
          },
        }).catch(() => null);

        if (!tmdbResponse) {
          safeError(`[RegeneratePool] Failed to fetch ${type} ${tmdb_id} from TMDB`);
          continue;
        }

        // Update titles table (title_data removed from pool, data comes from titles table)
        // This ensures the title data is available when recommendations are fetched
        const { getTitleInLanguage } = await import('@/services/titles');
        const { data: existingTitle } = await supabase
          .from(TABLES.TITLES)
          .select(
            `${TITLES_FIELDS.TITLE}, ${TITLES_FIELDS.OVERVIEW}, ${TITLES_FIELDS.POSTER_PATH}`
          )
          .eq(TITLES_FIELDS.TMDB_ID, tmdb_id)
          .eq(TITLES_FIELDS.TYPE, type)
          .maybeSingle();

        const titleJsonb: MultiLanguageText = existingTitle?.title 
          ? { ...(existingTitle.title as MultiLanguageText) }
          : {};
        const overviewJsonb: MultiLanguageText = existingTitle?.overview
          ? { ...(existingTitle.overview as MultiLanguageText) }
          : {};
        const posterPathJsonb: MultiLanguageText = existingTitle?.poster_path
          ? { ...(existingTitle.poster_path as MultiLanguageText) }
          : {};

        // Add/update current language
        if (tmdbResponse.title || tmdbResponse.name) {
          titleJsonb[language] = tmdbResponse.title || tmdbResponse.name || '';
        }
        if (tmdbResponse.overview) {
          overviewJsonb[language] = tmdbResponse.overview;
        }
        if (tmdbResponse.poster_path) {
          posterPathJsonb[language] = tmdbResponse.poster_path;
        }

        // Update titles table (async, don't wait)
        supabase
          .from(TABLES.TITLES)
          .upsert({
            [TITLES_FIELDS.TMDB_ID]: tmdb_id,
            [TITLES_FIELDS.TYPE]: type,
            [TITLES_FIELDS.TITLE]: titleJsonb,
            [TITLES_FIELDS.OVERVIEW]: Object.keys(overviewJsonb).length > 0 ? overviewJsonb : null,
            [TITLES_FIELDS.POSTER_PATH]: Object.keys(posterPathJsonb).length > 0 ? posterPathJsonb : null,
            [TITLES_FIELDS.GENRES]: (tmdbResponse.genres || []).length > 0 ? tmdbResponse.genres : null,
            [TITLES_FIELDS.BACKDROP_PATH]: tmdbResponse.backdrop_path || null,
            [TITLES_FIELDS.VOTE_AVERAGE]: tmdbResponse.vote_average || null,
            [TITLES_FIELDS.RELEASE_DATE]: tmdbResponse.release_date || null,
            [TITLES_FIELDS.FIRST_AIR_DATE]: tmdbResponse.first_air_date || null,
          }, {
            onConflict: TITLES_FIELDS.TMDB_ID,
          })
          .catch((error) => {
            if (import.meta.dev) {
              console.error(`[RegeneratePool] Error updating titles for ${tmdb_id}:`, error);
            }
          });

        if (updateError) {
          safeError(`[RegeneratePool] Error updating pool entry ${tmdb_id}`, updateError);
          continue;
        }

        updatedCount++;
      } catch (error) {
        safeError(`[RegeneratePool] Error processing entry ${entry.tmdb_id}`, error);
      }
    }

    devLog('[RegeneratePool] Updated', updatedCount, 'out of', poolEntries.length, 'entries');

    return {
      success: true,
      message: 'Pool updated successfully',
      updated: updatedCount,
      total: poolEntries.length,
    };
  } catch (error) {
    devError('[RegeneratePool] Error:', error);
    throw createError({
      statusCode: 500,
      statusMessage:
        error instanceof Error ? error.message : 'Error regenerating pool',
    });
  }
});

