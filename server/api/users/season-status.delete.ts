/**
 * Unmark all episodes in a season (remove seen status for all episodes)
 * 
 * - Removes all episodes in the season
 * - Does NOT remove following
 * - Does NOT auto-follow again (explicit UX constraint)
 * - Requires confirmation (handled in UI)
 */

import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { createServerSupabaseClient } from '@/server/utils/supabase';
import { logError, devLog } from '@/server/utils/logger';
import { unmarkSeason } from '@/services/userEpisodeStatus';

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

  if (!tmdb_series_id || season_number === undefined) {
    throw createError({
      statusCode: 400,
      message: 'tmdb_series_id and season_number are required',
    });
  }

  const tmdbSeriesId = parseInt(String(tmdb_series_id), 10);
  const seasonNumber = parseInt(String(season_number), 10);

  if (isNaN(tmdbSeriesId) || isNaN(seasonNumber)) {
    throw createError({
      statusCode: 400,
      message: 'tmdb_series_id and season_number must be valid numbers',
    });
  }

  const supabase = createServerSupabaseClient(config);

  try {
    const { error: unmarkError } = await unmarkSeason(
      userId,
      tmdbSeriesId,
      seasonNumber,
      supabase
    );

    if (unmarkError) {
      logError('[SeasonStatus] Error unmarking season', unmarkError, {
        userId,
        tmdb_series_id: tmdbSeriesId,
        season_number: seasonNumber,
      });
      throw createError({
        statusCode: 500,
        message: 'Error al desmarcar la temporada',
      });
    }

    devLog('[SeasonStatus] Successfully unmarked season', {
      userId,
      tmdb_series_id: tmdbSeriesId,
      season_number: seasonNumber,
    });

    return { success: true };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Error al desmarcar la temporada';
    logError('[SeasonStatus] Unexpected error', error as Error, {
      userId,
      tmdb_series_id: tmdbSeriesId,
      season_number: seasonNumber,
    });
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
