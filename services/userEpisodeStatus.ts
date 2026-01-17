/**
 * Service: User episode status operations
 * Infrastructure layer - pure CRUD operations for episode/season tracking
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/constants/db/tables';
import { USER_EPISODE_STATUS_COLUMNS } from '@/constants/db/columns';
import { isSeriesFullySeen, isSeasonFullySeen } from '@/server/utils/series-seen-check';
import { logError } from '@/server/utils/logger';

/**
 * Mark an episode as seen
 */
export async function markEpisodeAsSeen(
  userId: string,
  tmdbSeriesId: number,
  seasonNumber: number,
  episodeNumber: number,
  supabaseClient?: SupabaseClient
) {
  const supabase = supabaseClient || useSupabaseClient();
  
  return await supabase
    .from(TABLES.USER_EPISODE_STATUS)
    .upsert(
      {
        [USER_EPISODE_STATUS_COLUMNS.USER_ID]: userId,
        [USER_EPISODE_STATUS_COLUMNS.TMDB_SERIES_ID]: tmdbSeriesId,
        [USER_EPISODE_STATUS_COLUMNS.SEASON_NUMBER]: seasonNumber,
        [USER_EPISODE_STATUS_COLUMNS.EPISODE_NUMBER]: episodeNumber,
        [USER_EPISODE_STATUS_COLUMNS.SEEN]: true,
      },
      {
        onConflict: `${USER_EPISODE_STATUS_COLUMNS.USER_ID},${USER_EPISODE_STATUS_COLUMNS.TMDB_SERIES_ID},${USER_EPISODE_STATUS_COLUMNS.SEASON_NUMBER},${USER_EPISODE_STATUS_COLUMNS.EPISODE_NUMBER}`,
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();
}

/**
 * Unmark an episode (remove seen status)
 */
export async function unmarkEpisode(
  userId: string,
  tmdbSeriesId: number,
  seasonNumber: number,
  episodeNumber: number,
  supabaseClient?: SupabaseClient
) {
  const supabase = supabaseClient || useSupabaseClient();
  
  return await supabase
    .from(TABLES.USER_EPISODE_STATUS)
    .delete()
    .eq(USER_EPISODE_STATUS_COLUMNS.USER_ID, userId)
    .eq(USER_EPISODE_STATUS_COLUMNS.TMDB_SERIES_ID, tmdbSeriesId)
    .eq(USER_EPISODE_STATUS_COLUMNS.SEASON_NUMBER, seasonNumber)
    .eq(USER_EPISODE_STATUS_COLUMNS.EPISODE_NUMBER, episodeNumber);
}

/**
 * Mark all episodes in a season as seen
 * Requires fetching episode count from seasons table (cached data)
 */
export async function markSeasonAsSeen(
  userId: string,
  tmdbSeriesId: number,
  seasonNumber: number,
  supabaseClient?: SupabaseClient
) {
  const supabase = supabaseClient || useSupabaseClient();
  
  try {
    // Get season episode_count (cached data)
    const { data: season, error: seasonError } = await supabase
      .from(TABLES.SEASONS)
      .select('episode_count')
      .eq('tv_tmdb_id', tmdbSeriesId)
      .eq('season_number', seasonNumber)
      .maybeSingle();

    if (seasonError) {
      logError('[UserEpisodeStatus] Error fetching season', seasonError as Error, {
        userId,
        tmdbSeriesId,
        seasonNumber,
      });
      throw seasonError;
    }

    if (!season || season.episode_count === null || season.episode_count === undefined) {
      throw new Error(`Season ${seasonNumber} not found or episode_count is null`);
    }

    const episodeCount = season.episode_count;

    // Mark all episodes in the season as seen
    const episodesToInsert = [];
    for (let episodeNumber = 1; episodeNumber <= episodeCount; episodeNumber++) {
      episodesToInsert.push({
        [USER_EPISODE_STATUS_COLUMNS.USER_ID]: userId,
        [USER_EPISODE_STATUS_COLUMNS.TMDB_SERIES_ID]: tmdbSeriesId,
        [USER_EPISODE_STATUS_COLUMNS.SEASON_NUMBER]: seasonNumber,
        [USER_EPISODE_STATUS_COLUMNS.EPISODE_NUMBER]: episodeNumber,
        [USER_EPISODE_STATUS_COLUMNS.SEEN]: true,
      });
    }

    if (episodesToInsert.length === 0) {
      return { data: [], error: null };
    }

    // Use upsert to handle conflicts (episodes already marked as seen)
    return await supabase
      .from(TABLES.USER_EPISODE_STATUS)
      .upsert(episodesToInsert, {
        onConflict: `${USER_EPISODE_STATUS_COLUMNS.USER_ID},${USER_EPISODE_STATUS_COLUMNS.TMDB_SERIES_ID},${USER_EPISODE_STATUS_COLUMNS.SEASON_NUMBER},${USER_EPISODE_STATUS_COLUMNS.EPISODE_NUMBER}`,
        ignoreDuplicates: false,
      });
  } catch (error) {
    logError('[UserEpisodeStatus] Error marking season as seen', error as Error, {
      userId,
      tmdbSeriesId,
      seasonNumber,
    });
    throw error;
  }
}

/**
 * Unmark all episodes in a season (remove seen status for all episodes)
 */
export async function unmarkSeason(
  userId: string,
  tmdbSeriesId: number,
  seasonNumber: number,
  supabaseClient?: SupabaseClient
) {
  const supabase = supabaseClient || useSupabaseClient();
  
  return await supabase
    .from(TABLES.USER_EPISODE_STATUS)
    .delete()
    .eq(USER_EPISODE_STATUS_COLUMNS.USER_ID, userId)
    .eq(USER_EPISODE_STATUS_COLUMNS.TMDB_SERIES_ID, tmdbSeriesId)
    .eq(USER_EPISODE_STATUS_COLUMNS.SEASON_NUMBER, seasonNumber);
}

/**
 * Get all episode statuses for a series
 */
export async function getEpisodeStatusesForSeries(
  userId: string,
  tmdbSeriesId: number,
  supabaseClient?: SupabaseClient
) {
  const supabase = supabaseClient || useSupabaseClient();
  
  return await supabase
    .from(TABLES.USER_EPISODE_STATUS)
    .select('*')
    .eq(USER_EPISODE_STATUS_COLUMNS.USER_ID, userId)
    .eq(USER_EPISODE_STATUS_COLUMNS.TMDB_SERIES_ID, tmdbSeriesId)
    .eq(USER_EPISODE_STATUS_COLUMNS.SEEN, true)
    .order(USER_EPISODE_STATUS_COLUMNS.SEASON_NUMBER, { ascending: true })
    .order(USER_EPISODE_STATUS_COLUMNS.EPISODE_NUMBER, { ascending: true });
}

/**
 * Check if an episode is seen
 */
export async function isEpisodeSeen(
  userId: string,
  tmdbSeriesId: number,
  seasonNumber: number,
  episodeNumber: number,
  supabaseClient?: SupabaseClient
) {
  const supabase = supabaseClient || useSupabaseClient();
  
  const { data, error } = await supabase
    .from(TABLES.USER_EPISODE_STATUS)
    .select('id')
    .eq(USER_EPISODE_STATUS_COLUMNS.USER_ID, userId)
    .eq(USER_EPISODE_STATUS_COLUMNS.TMDB_SERIES_ID, tmdbSeriesId)
    .eq(USER_EPISODE_STATUS_COLUMNS.SEASON_NUMBER, seasonNumber)
    .eq(USER_EPISODE_STATUS_COLUMNS.EPISODE_NUMBER, episodeNumber)
    .eq(USER_EPISODE_STATUS_COLUMNS.SEEN, true)
    .maybeSingle();

  if (error) {
    logError('[UserEpisodeStatus] Error checking episode seen', error as Error, {
      userId,
      tmdbSeriesId,
      seasonNumber,
      episodeNumber,
    });
    return false;
  }

  return !!data;
}

/**
 * Check if a season is fully seen (all episodes seen)
 * Uses cached episode_count from seasons table
 */
export async function checkSeasonFullySeen(
  userId: string,
  tmdbSeriesId: number,
  seasonNumber: number,
  supabaseClient?: SupabaseClient
): Promise<boolean> {
  const supabase = supabaseClient || useSupabaseClient();
  return await isSeasonFullySeen(userId, tmdbSeriesId, seasonNumber, supabase);
}

/**
 * Check if a series is fully seen (all episodes in all seasons seen)
 * Uses cached episode_count from seasons table
 * CRITICAL: Only call when episode status changes, NOT during recommendation fetches
 */
export async function checkSeriesFullySeen(
  userId: string,
  tmdbSeriesId: number,
  supabaseClient?: SupabaseClient
): Promise<boolean> {
  const supabase = supabaseClient || useSupabaseClient();
  return await isSeriesFullySeen(userId, tmdbSeriesId, supabase);
}

/**
 * Mark all episodes of all seasons as seen
 * Used when marking entire series as seen
 */
export async function markAllEpisodesAsSeen(
  userId: string,
  tmdbSeriesId: number,
  supabaseClient?: SupabaseClient
) {
  const supabase = supabaseClient || useSupabaseClient();
  
  try {
    // Get all seasons with episode_count (cached data)
    const { data: seasons, error: seasonsError } = await supabase
      .from(TABLES.SEASONS)
      .select('season_number, episode_count')
      .eq('tv_tmdb_id', tmdbSeriesId)
      .order('season_number', { ascending: true });

    if (seasonsError) {
      logError('[UserEpisodeStatus] Error fetching seasons', seasonsError as Error, {
        userId,
        tmdbSeriesId,
      });
      throw seasonsError;
    }

    if (!seasons || seasons.length === 0) {
      return { data: [], error: null };
    }

    // Mark all episodes in all seasons as seen
    const episodesToInsert = [];
    for (const season of seasons) {
      if (season.episode_count === null || season.episode_count === undefined) {
        continue; // Skip seasons with null episode_count
      }

      for (let episodeNumber = 1; episodeNumber <= season.episode_count; episodeNumber++) {
        episodesToInsert.push({
          [USER_EPISODE_STATUS_COLUMNS.USER_ID]: userId,
          [USER_EPISODE_STATUS_COLUMNS.TMDB_SERIES_ID]: tmdbSeriesId,
          [USER_EPISODE_STATUS_COLUMNS.SEASON_NUMBER]: season.season_number,
          [USER_EPISODE_STATUS_COLUMNS.EPISODE_NUMBER]: episodeNumber,
          [USER_EPISODE_STATUS_COLUMNS.SEEN]: true,
        });
      }
    }

    if (episodesToInsert.length === 0) {
      return { data: [], error: null };
    }

    // Use upsert to handle conflicts (episodes already marked as seen)
    return await supabase
      .from(TABLES.USER_EPISODE_STATUS)
      .upsert(episodesToInsert, {
        onConflict: `${USER_EPISODE_STATUS_COLUMNS.USER_ID},${USER_EPISODE_STATUS_COLUMNS.TMDB_SERIES_ID},${USER_EPISODE_STATUS_COLUMNS.SEASON_NUMBER},${USER_EPISODE_STATUS_COLUMNS.EPISODE_NUMBER}`,
        ignoreDuplicates: false,
      });
  } catch (error) {
    logError('[UserEpisodeStatus] Error marking all episodes as seen', error as Error, {
      userId,
      tmdbSeriesId,
    });
    throw error;
  }
}
