/**
 * Get all episode statuses for a series
 * Returns all episodes marked as seen for the given series
 */

import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { createServerSupabaseClient } from '@/server/utils/supabase';
import { logError, devLog } from '@/server/utils/logger';
import { getEpisodeStatusesForSeries } from '@/services/userEpisodeStatus';

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

  if (!tmdb_series_id) {
    throw createError({
      statusCode: 400,
      message: 'tmdb_series_id is required',
    });
  }

  const tmdbSeriesId = parseInt(String(tmdb_series_id), 10);

  if (isNaN(tmdbSeriesId)) {
    throw createError({
      statusCode: 400,
      message: 'tmdb_series_id must be a valid number',
    });
  }

  const supabase = createServerSupabaseClient(config);

  try {
    const { data, error } = await getEpisodeStatusesForSeries(
      userId,
      tmdbSeriesId,
      supabase
    );

    if (error) {
      logError('[EpisodeStatus] Error fetching episode statuses', error, {
        userId,
        tmdb_series_id: tmdbSeriesId,
      });
      throw createError({
        statusCode: 500,
        message: 'Error al obtener el estado de los episodios',
      });
    }

    devLog('[EpisodeStatus] Successfully fetched episode statuses', {
      userId,
      tmdb_series_id: tmdbSeriesId,
      count: data?.length || 0,
    });

    return {
      episodes: data || [],
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Error al obtener el estado de los episodios';
    logError('[EpisodeStatus] Unexpected error', error as Error, {
      userId,
      tmdb_series_id: tmdbSeriesId,
    });
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
