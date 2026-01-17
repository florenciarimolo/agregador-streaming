/**
 * Mark an episode as seen
 * 
 * - Inserts/updates user_episode_status with seen: true
 * - Auto-adds following if missing (only if series is NOT fully seen)
 * - Does NOT exclude from recommendations
 * - Does NOT apply following scoring more than once
 */

import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { createServerSupabaseClient } from '@/server/utils/supabase';
import { logError, devLog } from '@/server/utils/logger';
import {
  markEpisodeAsSeen,
  checkSeriesFullySeen,
} from '@/services/userEpisodeStatus';
import { isFollowing, upsertUserFollowing, deleteUserFollowing } from '@/services/userFollowing';
import { TABLES } from '@/constants/db/tables';
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
  const { tmdb_series_id, season_number, episode_number } = body;

  if (
    !tmdb_series_id ||
    season_number === undefined ||
    episode_number === undefined
  ) {
    throw createError({
      statusCode: 400,
      message:
        'tmdb_series_id, season_number, and episode_number are required',
    });
  }

  const supabase = createServerSupabaseClient(config);

  try {
    // Mark episode as seen
    const { error: markError } = await markEpisodeAsSeen(
      userId,
      tmdb_series_id,
      season_number,
      episode_number,
      supabase
    );

    if (markError) {
      logError('[EpisodeStatus] Error marking episode as seen', markError, {
        userId,
        tmdb_series_id,
        season_number,
        episode_number,
      });
      throw createError({
        statusCode: 500,
        message: 'Error al marcar el episodio como visto',
      });
    }

    // Check if series is now fully seen after marking this episode
    const fullySeen = await checkSeriesFullySeen(
      userId,
      tmdb_series_id,
      supabase
    );

    // If series is fully seen and show is still ongoing, automatically unfollow
    if (fullySeen) {
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
          // Unfollow the series
          const { error: unfollowError } = await deleteUserFollowing(
            userId,
            tmdb_series_id,
            supabase
          );

          if (unfollowError) {
            // Log but don't fail - unfollow is optional
            logError(
              '[EpisodeStatus] Error auto-unfollowing fully seen series',
              unfollowError,
              {
                userId,
                tmdb_series_id,
              }
            );
          } else {
            devLog('[EpisodeStatus] Auto-unfollowed fully seen ongoing series', {
              userId,
              tmdb_series_id,
            });

            // Revert following scoring
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
              await revertFollowingInfluence(
                userId,
                tmdb_series_id,
                'tv',
                supabase
              );
            }
          }
        }
      }
      // If show is ended/cancelled, keep it followed (don't unfollow)
    } else {
      // Series is not fully seen - auto-add following if missing and show is still ongoing
      const isStillOngoing = await isTVShowStillOngoing(
        tmdb_series_id,
        supabase
      );

      // Only auto-add following if show is still ongoing
      if (isStillOngoing === true) {
        const { isFollowing: alreadyFollowing } = await isFollowing(
          userId,
          tmdb_series_id,
          supabase
        );

        if (!alreadyFollowing) {
          // Auto-add following silently
          const { error: followingError } = await upsertUserFollowing(
            userId,
            tmdb_series_id,
            'tv',
            supabase
          );

          if (followingError) {
          // Log but don't fail - following is optional
          logError(
            '[EpisodeStatus] Error auto-adding following',
            followingError,
            {
              userId,
              tmdb_series_id,
            }
          );
        } else {
          devLog('[EpisodeStatus] Auto-added following', {
            userId,
            tmdb_series_id,
          });

          // Apply following scoring (only if we just added following)
          // Base increment: +5
          const { updatePreferenceScore } = await import(
            '@/services/recommendationPool'
          );
          const { propagateFollowingInfluence } = await import(
            '@/services/similarityPropagation'
          );

          const { data: currentPoolEntry } = await supabase
            .from(TABLES.RECOMMENDATION_POOL)
            .select(RECOMMENDATION_POOL_COLUMNS.PREFERENCE_SCORE)
            .eq(RECOMMENDATION_POOL_COLUMNS.USER_ID, userId)
            .eq(RECOMMENDATION_POOL_COLUMNS.TMDB_ID, tmdb_series_id)
            .maybeSingle();

          const currentPreferenceScore = currentPoolEntry?.preference_score ?? 0;
          const FOLLOWING_BASE_SCORE = 5;
          const newPreferenceScore = Math.min(
            100,
            currentPreferenceScore + FOLLOWING_BASE_SCORE
          );

          await updatePreferenceScore(
            userId,
            tmdb_series_id,
            newPreferenceScore,
            supabase
          );

          // Propagate influence: +4 (≥2 genres), +2 (1 genre)
          await propagateFollowingInfluence(
            userId,
            tmdb_series_id,
            'tv',
            supabase
          );
        }
      }
      }
      // If show is ended/cancelled, don't auto-add following
    }

    devLog('[EpisodeStatus] Successfully marked episode as seen', {
      userId,
      tmdb_series_id,
      season_number,
      episode_number,
    });

    return { success: true };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Error al marcar el episodio como visto';
    logError('[EpisodeStatus] Unexpected error', error as Error, {
      userId,
      tmdb_series_id,
      season_number,
      episode_number,
    });
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
