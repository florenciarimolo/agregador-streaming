/**
 * Unfollow a TV series
 * 
 * Removes following and reverts only the following impact:
 * - Removes from user_title_following
 * - Reverts following scoring: -5 base, -4 (≥2 genres), -2 (1 genre)
 * - Does NOT create other states
 * - Does NOT touch user_episode_status
 */

import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { createServerSupabaseClient } from '@/server/utils/supabase';
import { logError, devLog } from '@/server/utils/logger';
import { deleteUserFollowing } from '@/services/userFollowing';
import { updatePreferenceScore } from '@/services/recommendationPool';
import { revertFollowingInfluence } from '@/services/similarityPropagation';
import { TABLES } from '@/constants/db/tables';
import { USER_TITLE_FOLLOWING_COLUMNS, RECOMMENDATION_POOL_COLUMNS } from '@/constants/db/columns';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';

/**
 * Following scoring values (local, not in SCORE_WEIGHTS):
 * - Base increment: +5 to preference_score
 * - Propagation: ≥2 shared genres: +4, 1 shared genre: +2
 */
const FOLLOWING_BASE_SCORE = 5;

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const userId = await getUserIdFromEvent(event);

  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  const query = getQuery(event);
  const tmdb_id = query.tmdb_id;

  if (!tmdb_id || typeof tmdb_id !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'tmdb_id is required',
    });
  }

  const tmdbId = parseInt(tmdb_id, 10);
  if (isNaN(tmdbId)) {
    throw createError({
      statusCode: 400,
      message: 'tmdb_id must be a valid number',
    });
  }

  const supabase = createServerSupabaseClient(config);

  try {
    // Get type from following record (if exists)
    const { data: followingRecord } = await supabase
      .from(TABLES.USER_TITLE_FOLLOWING)
      .select(USER_TITLE_FOLLOWING_COLUMNS.TYPE)
      .eq(USER_TITLE_FOLLOWING_COLUMNS.USER_ID, userId)
      .eq(USER_TITLE_FOLLOWING_COLUMNS.TMDB_ID, tmdbId)
      .maybeSingle();

    const type = followingRecord?.type || MEDIA_TYPE.TV;

    // Delete following record
    const { error: deleteError } = await deleteUserFollowing(
      userId,
      tmdbId,
      supabase
    );

    if (deleteError) {
      logError('[Following] Error deleting following record', deleteError, {
        tmdbId,
        userId,
      });
      throw createError({
        statusCode: 500,
        message: 'Error al dejar de seguir la serie',
      });
    }

    // Revert following scoring (inline, NO Edge Function)
    // Revert base increment: -5
    const { data: currentPoolEntry } = await supabase
      .from(TABLES.RECOMMENDATION_POOL)
      .select(RECOMMENDATION_POOL_COLUMNS.PREFERENCE_SCORE)
      .eq(RECOMMENDATION_POOL_COLUMNS.USER_ID, userId)
      .eq(RECOMMENDATION_POOL_COLUMNS.TMDB_ID, tmdbId)
      .maybeSingle();

    if (currentPoolEntry) {
      const currentPreferenceScore = currentPoolEntry.preference_score ?? 0;
      const newPreferenceScore = Math.max(-100, currentPreferenceScore - FOLLOWING_BASE_SCORE);

      await updatePreferenceScore(userId, tmdbId, newPreferenceScore, supabase);
    }

    // Revert propagation: -4 (≥2 genres), -2 (1 genre)
    await revertFollowingInfluence(userId, tmdbId, type as 'movie' | 'tv', supabase);

    devLog('[Following] Successfully unfollowed series', {
      tmdbId,
      userId,
    });

    return { success: true };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error; // Re-throw createError
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Error al dejar de seguir la serie';
    logError('[Following] Unexpected error', error as Error, {
      tmdbId,
      userId,
    });
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
