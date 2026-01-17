/**
 * Mark entire series as seen (all episodes of all seasons)
 * 
 * - Marks all episodes of all seasons as seen
 * - Removes following (series cannot be followed if fully seen)
 * - Creates user_title_status = seen
 * - Excludes from recommendation pool
 */

import { TITLE_STATUS } from '@/constants/domain/titleStatus';
import { TABLES } from '@/constants/db/tables';
import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { createServerSupabaseClient } from '@/server/utils/supabase';
import { logError, devLog } from '@/server/utils/logger';
import { markAllEpisodesAsSeen } from '@/services/userEpisodeStatus';
import { deleteUserFollowing, isFollowing } from '@/services/userFollowing';
import { upsertUserTitleStatus } from '@/services/userTitleStatus';
import { RECOMMENDATION_POOL_COLUMNS } from '@/constants/db/columns';
import { isTVShowStillOngoing } from '@/server/utils/tv-show-status';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const userId = await getUserIdFromEvent(event);

  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  const body = await readBody(event);
  const { tmdb_series_id } = body;

  if (!tmdb_series_id) {
    throw createError({
      statusCode: 400,
      message: 'tmdb_series_id is required',
    });
  }

  const supabase = createServerSupabaseClient(config);

  try {
    // Mark all episodes of all seasons as seen
    const { error: markError } = await markAllEpisodesAsSeen(
      userId,
      tmdb_series_id,
      supabase
    );

    if (markError) {
      logError('[SeriesSeen] Error marking all episodes as seen', markError, {
        userId,
        tmdb_series_id,
      });
      throw createError({
        statusCode: 500,
        message: 'Error al marcar la serie como vista',
      });
    }

    // Check if show is still ongoing (not ended/cancelled)
    const isStillOngoing = await isTVShowStillOngoing(
      tmdb_series_id,
      supabase
    );

    // Only unfollow if show is still ongoing (not ended/cancelled)
    if (isStillOngoing === true) {
      const { isFollowing: currentlyFollowing } = await isFollowing(
        userId,
        tmdb_series_id,
        supabase
      );

      if (currentlyFollowing) {
        // Remove following (series cannot be followed if fully seen)
        const { error: unfollowError } = await deleteUserFollowing(
          userId,
          tmdb_series_id,
          supabase
        );

        if (unfollowError) {
          // Log but don't fail - following might not exist
          logError('[SeriesSeen] Error removing following', unfollowError, {
            userId,
            tmdb_series_id,
          });
        }
      }
    }
    // If show is ended/cancelled, keep it followed (don't unfollow)

    // Revert following scoring if it existed (only if we unfollowed)
    if (isStillOngoing === true) {
      const { updatePreferenceScore } = await import(
        '@/services/recommendationPool'
      );
      const { revertFollowingInfluence } = await import(
        '@/services/similarityPropagation'
      );

      const { data: currentPoolEntry } = await supabase
        .from(TABLES.RECOMMENDATION_POOL)
        .select(RECOMMENDATION_POOL_COLUMNS.PREFERENCE_SCORE)
        .eq(RECOMMENDATION_POOL_COLUMNS.USER_ID, userId)
        .eq(RECOMMENDATION_POOL_COLUMNS.TMDB_ID, tmdb_series_id)
        .maybeSingle();

      if (currentPoolEntry) {
        // Revert base following score (-5)
        const FOLLOWING_BASE_SCORE = 5;
        const currentPreferenceScore = currentPoolEntry.preference_score ?? 0;
        const newPreferenceScore = Math.max(
          -100,
          currentPreferenceScore - FOLLOWING_BASE_SCORE
        );

        await updatePreferenceScore(
          userId,
          tmdb_series_id,
          newPreferenceScore,
          supabase
        );

        // Revert propagation
        await revertFollowingInfluence(userId, tmdb_series_id, 'tv', supabase);
      }
    }

    // Create user_title_status = seen
    const { error: statusError } = await upsertUserTitleStatus({
      user_id: userId,
      tmdb_id: tmdb_series_id,
      type: 'tv',
      status: TITLE_STATUS.SEEN,
      liked: false,
    });

    if (statusError) {
      logError('[SeriesSeen] Error creating seen status', statusError, {
        userId,
        tmdb_series_id,
      });
      throw createError({
        statusCode: 500,
        message: 'Error al crear el estado visto',
      });
    }

    // Remove from recommendation pool (exclude from recommendations)
    const { error: poolError } = await supabase
      .from(TABLES.RECOMMENDATION_POOL)
      .delete()
      .eq(RECOMMENDATION_POOL_COLUMNS.USER_ID, userId)
      .eq(RECOMMENDATION_POOL_COLUMNS.TMDB_ID, tmdb_series_id);

    if (poolError) {
      // Log but don't fail - pool entry might not exist
      logError('[SeriesSeen] Error removing from pool', poolError, {
        userId,
        tmdb_series_id,
      });
    }

    devLog('[SeriesSeen] Successfully marked series as seen', {
      userId,
      tmdb_series_id,
    });

    return { success: true };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Error al marcar la serie como vista';
    logError('[SeriesSeen] Unexpected error', error as Error, {
      userId,
      tmdb_series_id,
    });
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
