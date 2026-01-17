/**
 * Follow a TV series
 * 
 * Following is an interest signal, separate from consumption states.
 * When following:
 * - Removes not_interested, watchlist, and seen from user_title_status
 * - Does NOT touch user_episode_status
 * - Applies following scoring: +5 base, +4 (≥2 genres), +2 (1 genre)
 * - Does NOT exclude from recommendations
 * 
 * A fully seen series cannot be followed.
 */

import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { TABLES } from '@/constants/db/tables';
import { TITLES_COLUMNS, RECOMMENDATION_POOL_COLUMNS } from '@/constants/db/columns';
import { USER_TITLE_STATUS_COLUMNS } from '@/constants/db/columns';
import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { createServerSupabaseClient } from '@/server/utils/supabase';
import { DEFAULT_LANGUAGE } from '@/constants/languages';
import { logWarn, logError, devLog } from '@/server/utils/logger';
import { upsertUserFollowing } from '@/services/userFollowing';
import { checkSeriesFullySeen } from '@/services/userEpisodeStatus';
import { updatePreferenceScore } from '@/services/recommendationPool';
import { propagateFollowingInfluence } from '@/services/similarityPropagation';

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

  const body = await readBody(event);
  const { tmdb_id, type } = body;

  if (!tmdb_id || !type) {
    throw createError({
      statusCode: 400,
      message: 'tmdb_id and type are required',
    });
  }

  if (type !== MEDIA_TYPE.MOVIE && type !== MEDIA_TYPE.TV) {
    throw createError({
      statusCode: 400,
      message: `type must be '${MEDIA_TYPE.MOVIE}' or '${MEDIA_TYPE.TV}'`,
    });
  }

  // Only TV series can be followed (following is for tracking episodes)
  if (type !== MEDIA_TYPE.TV) {
    throw createError({
      statusCode: 400,
      message: 'Only TV series can be followed',
    });
  }

  const supabase = createServerSupabaseClient(config);

  try {
    // Check if series is fully seen (cannot follow fully seen series)
    const isFullySeen = await checkSeriesFullySeen(userId, tmdb_id, supabase);
    if (isFullySeen) {
      throw createError({
        statusCode: 400,
        message: 'Cannot follow a fully seen series',
      });
    }

    // Ensure title exists in database
    const { data: existingTitle } = await supabase
      .from(TABLES.TITLES)
      .select(TITLES_COLUMNS.TMDB_ID)
      .eq(TITLES_COLUMNS.TMDB_ID, tmdb_id)
      .maybeSingle();

    if (!existingTitle) {
      try {
        // Call internal TMDB endpoint which will fetch and create the title
        await $fetch(`/api/tmdb/tvshows/${tmdb_id}`, {
          query: {
            language: DEFAULT_LANGUAGE,
          },
        });
      } catch {
        logWarn('[Following] Could not fetch title from TMDB', {
          tmdbId: tmdb_id,
        });
      }
    }

    // Remove conflicting states: not_interested, watchlist, seen
    // Following conflicts with all consumption/negative states
    const { error: deleteStatusError } = await supabase
      .from(TABLES.USER_TITLE_STATUS)
      .delete()
      .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
      .eq(USER_TITLE_STATUS_COLUMNS.TMDB_ID, tmdb_id);

    if (deleteStatusError) {
      logError('[Following] Error removing conflicting states', deleteStatusError, {
        tmdbId: tmdb_id,
        userId,
      });
      throw createError({
        statusCode: 500,
        message: 'Error al actualizar el estado',
      });
    }

    // Insert following record
    const { error: followingError } = await upsertUserFollowing(
      userId,
      tmdb_id,
      type,
      supabase
    );

    if (followingError) {
      logError('[Following] Error creating following record', followingError, {
        tmdbId: tmdb_id,
        userId,
      });
      throw createError({
        statusCode: 500,
        message: 'Error al seguir la serie',
      });
    }

    // Apply following scoring (inline, NO Edge Function)
    // Base increment: +5
      const { data: currentPoolEntry } = await supabase
        .from(TABLES.RECOMMENDATION_POOL)
        .select(RECOMMENDATION_POOL_COLUMNS.PREFERENCE_SCORE)
        .eq(RECOMMENDATION_POOL_COLUMNS.USER_ID, userId)
        .eq(RECOMMENDATION_POOL_COLUMNS.TMDB_ID, tmdb_id)
        .maybeSingle();

    const currentPreferenceScore = currentPoolEntry?.preference_score ?? 0;
    const newPreferenceScore = Math.min(100, currentPreferenceScore + FOLLOWING_BASE_SCORE);

    await updatePreferenceScore(userId, tmdb_id, newPreferenceScore, supabase);

    // Propagate influence to similar titles: +4 (≥2 genres), +2 (1 genre)
    await propagateFollowingInfluence(userId, tmdb_id, type, supabase);

    devLog('[Following] Successfully followed series', {
      tmdbId: tmdb_id,
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
        : 'Error al seguir la serie';
    logError('[Following] Unexpected error', error as Error, {
      tmdbId: tmdb_id,
      userId,
    });
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
