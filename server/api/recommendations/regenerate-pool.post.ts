import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getTMDBConfig } from '../../utils/config';
import { getUserTMDBParams } from '../../utils/user-preferences';
import { devLog, devError, safeError } from '../../utils/logger';
import { TitleStatus } from '@/types/TitleStatus';
import {
  getPoolCount,
  deleteLowestScoreEntries,
  insertPoolEntries,
  type RecommendationPoolSource,
  RECOMMENDATION_POOL_FIELDS,
  TABLES as POOL_TABLES,
  type TitleData,
} from '@/composables/database/recommendationPool';

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
    const { data: poolEntries, error: fetchError } = await supabase
      .from(POOL_TABLES.RECOMMENDATION_POOL)
      .select(`${RECOMMENDATION_POOL_FIELDS.TMDB_ID}, ${RECOMMENDATION_POOL_FIELDS.TYPE}, ${RECOMMENDATION_POOL_FIELDS.TITLE_DATA}`)
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

    // Update title and overview for each pool entry
    let updatedCount = 0;

    for (const entry of poolEntries) {
      try {
        const { tmdb_id, type, title_data } = entry;
        const endpoint = type === 'movie' ? `/movie/${tmdb_id}` : `/tv/${tmdb_id}`;

        // Fetch title and overview from TMDB with new language
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

        // Get existing title_data or create new structure
        const existingTitleData = (title_data as TitleData | null) || {
          title: '',
          overview: '',
          poster_path: null,
          backdrop_path: null,
          vote_average: null,
          genres: [],
          release_date: null,
          first_air_date: null,
        };

        // Update only title and overview, keep everything else
        const updatedTitleData: TitleData = {
          ...existingTitleData,
          title: tmdbResponse.title || tmdbResponse.name || existingTitleData.title,
          overview: tmdbResponse.overview || existingTitleData.overview,
        };

        // Update the pool entry
        const { error: updateError } = await supabase
          .from(POOL_TABLES.RECOMMENDATION_POOL)
          .update({
            [RECOMMENDATION_POOL_FIELDS.TITLE_DATA]: updatedTitleData,
          })
          .eq(RECOMMENDATION_POOL_FIELDS.USER_ID, userId)
          .eq(RECOMMENDATION_POOL_FIELDS.TMDB_ID, tmdb_id);

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

