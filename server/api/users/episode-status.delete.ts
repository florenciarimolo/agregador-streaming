/**
 * Unmark an episode (remove seen status)
 * 
 * - Removes single episode seen status
 * - Does NOT remove following
 * - Does NOT auto-follow again (explicit UX constraint)
 */

import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { createServerSupabaseClient } from '@/server/utils/supabase';
import { logError, devLog } from '@/server/utils/logger';
import { unmarkEpisode } from '@/services/userEpisodeStatus';

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
  const tmdb_series_id = query.tmdb_series_id;
  const season_number = query.season_number;
  const episode_number = query.episode_number;

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

  const tmdbSeriesId = parseInt(String(tmdb_series_id), 10);
  const seasonNumber = parseInt(String(season_number), 10);
  const episodeNumber = parseInt(String(episode_number), 10);

  if (isNaN(tmdbSeriesId) || isNaN(seasonNumber) || isNaN(episodeNumber)) {
    throw createError({
      statusCode: 400,
      message: 'tmdb_series_id, season_number, and episode_number must be valid numbers',
    });
  }

  const supabase = createServerSupabaseClient(config);

  try {
    const { error: unmarkError } = await unmarkEpisode(
      userId,
      tmdbSeriesId,
      seasonNumber,
      episodeNumber,
      supabase
    );

    if (unmarkError) {
      logError('[EpisodeStatus] Error unmarking episode', unmarkError, {
        userId,
        tmdb_series_id: tmdbSeriesId,
        season_number: seasonNumber,
        episode_number: episodeNumber,
      });
      throw createError({
        statusCode: 500,
        message: 'Error al desmarcar el episodio',
      });
    }

    devLog('[EpisodeStatus] Successfully unmarked episode', {
      userId,
      tmdb_series_id: tmdbSeriesId,
      season_number: seasonNumber,
      episode_number: episodeNumber,
    });

    return { success: true };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Error al desmarcar el episodio';
    logError('[EpisodeStatus] Unexpected error', error as Error, {
      userId,
      tmdb_series_id: tmdbSeriesId,
      season_number: seasonNumber,
      episode_number: episodeNumber,
    });
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
