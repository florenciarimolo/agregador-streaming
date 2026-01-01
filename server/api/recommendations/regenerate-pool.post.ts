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

    // Delete ALL entries from the pool
    const { error: deleteError } = await supabase
      .from('recommendation_pool')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      devError('[RegeneratePool] Error deleting pool:', deleteError);
      throw deleteError;
    }

    devLog('[RegeneratePool] Deleted all pool entries for user:', userId);

    // Get excluded titles (seen + not_interested)
    const { data: excludedStatuses } = await supabase
      .from('user_title_status')
      .select('tmdb_id')
      .eq('user_id', userId)
      .in('status', [TitleStatus.SEEN, TitleStatus.NOT_INTERESTED]);

    const excludedTmdbIds = new Set<number>();
    if (excludedStatuses) {
      excludedStatuses.forEach((status) => {
        excludedTmdbIds.add(status.tmdb_id);
      });
    }

    // Get user's liked titles
    const { data: userLikedStatuses } = await supabase
      .from('user_title_status')
      .select('tmdb_id, type')
      .eq('user_id', userId)
      .eq('liked', true);

    const likedTmdbIds = new Set<number>();
    if (userLikedStatuses) {
      userLikedStatuses.forEach((status) => {
        likedTmdbIds.add(status.tmdb_id);
      });
    }

    const entriesToInsert: Array<{
      tmdb_id: number;
      type: 'movie' | 'tv';
      source: RecommendationPoolSource;
      score: number;
      explanation_code: string | null;
    }> = [];

    // Helper to ensure title exists in titles table
    const ensureTitleExists = async (tmdbId: number, type: 'movie' | 'tv') => {
      const { data: existing } = await supabase
        .from('titles')
        .select('tmdb_id')
        .eq('tmdb_id', tmdbId)
        .eq('type', type)
        .maybeSingle();

      if (!existing) {
        // Title doesn't exist, we'll skip it for now
        // In production, you might want to fetch and insert it
        return false;
      }
      return true;
    };

    // Fetch recommendations based on liked titles
    if (likedTmdbIds.size > 0) {
      for (const tmdbId of likedTmdbIds) {
        const likedStatus = userLikedStatuses?.find(
          (s) => s.tmdb_id === tmdbId
        );
        if (!likedStatus) continue;

        const type = likedStatus.type as 'movie' | 'tv';
        const url = `${tmdbConfig.baseUrl}${type}/${tmdbId}/recommendations?api_key=${tmdbConfig.apiKey}&language=${language}&page=1`;

        try {
          const response = await $fetch<{
            results?: Array<{
              id: number;
              title?: string;
              name?: string;
              poster_path: string | null;
              vote_average: number;
            }>;
          }>(url);

          if (response && response.results && Array.isArray(response.results)) {
            for (const result of response.results.slice(0, 10)) {
              if (
                excludedTmdbIds.has(result.id) ||
                likedTmdbIds.has(result.id)
              ) {
                continue;
              }

              const exists = await ensureTitleExists(result.id, type);
              if (!exists) continue;

              entriesToInsert.push({
                tmdb_id: result.id,
                type,
                source: 'based_on_like',
                score: 50 + (result.vote_average || 0) * 2,
                explanation_code: 'recommended_based_on_liked',
              });
            }
          }
        } catch (error) {
          safeError(
            `[RegeneratePool] Error fetching recommendations for ${tmdbId}`,
            error
          );
        }
      }
    }

    // Fetch trending content
    for (const type of ['movie', 'tv'] as const) {
      const url = `${tmdbConfig.baseUrl}trending/${type}/week?api_key=${tmdbConfig.apiKey}&language=${language}`;

      try {
        const response = await $fetch<{
          results?: Array<{
            id: number;
            title?: string;
            name?: string;
            poster_path: string | null;
            vote_average: number;
          }>;
        }>(url);

        if (response && response.results && Array.isArray(response.results)) {
          for (const result of response.results.slice(0, 20)) {
            if (
              excludedTmdbIds.has(result.id) ||
              likedTmdbIds.has(result.id)
            ) {
              continue;
            }

            const exists = await ensureTitleExists(result.id, type);
            if (!exists) continue;

            entriesToInsert.push({
              tmdb_id: result.id,
              type,
              source: 'trending',
              score: 30 + (result.vote_average || 0) * 2,
              explanation_code: 'trending',
            });
          }
        }
      } catch (error) {
        safeError(`[RegeneratePool] Error fetching trending ${type}`, error);
      }
    }

    // Fetch discover content
    for (const type of ['movie', 'tv'] as const) {
      const url = `${tmdbConfig.baseUrl}discover/${type}?api_key=${tmdbConfig.apiKey}&language=${language}&sort_by=popularity.desc&page=1`;

      try {
        const response = await $fetch<{
          results?: Array<{
            id: number;
            title?: string;
            name?: string;
            poster_path: string | null;
            vote_average: number;
          }>;
        }>(url);

        if (response && response.results && Array.isArray(response.results)) {
          for (const result of response.results.slice(0, 30)) {
            if (
              excludedTmdbIds.has(result.id) ||
              likedTmdbIds.has(result.id)
            ) {
              continue;
            }

            const exists = await ensureTitleExists(result.id, type);
            if (!exists) continue;

            entriesToInsert.push({
              tmdb_id: result.id,
              type,
              source: 'discover',
              score: 20 + (result.vote_average || 0) * 2,
              explanation_code: 'discover',
            });
          }
        }
      } catch (error) {
        safeError(`[RegeneratePool] Error fetching discover ${type}`, error);
      }
    }

    // Insert entries into pool
    if (entriesToInsert.length > 0) {
      devLog('[RegeneratePool] Inserting entries:', entriesToInsert.length);
      const inserted = await insertPoolEntries(userId, entriesToInsert, supabase);
      devLog('[RegeneratePool] Successfully inserted:', inserted);
    }

    return {
      success: true,
      message: 'Pool regenerated successfully',
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

