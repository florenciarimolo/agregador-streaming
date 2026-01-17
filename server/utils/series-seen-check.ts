/**
 * Series fully-seen check utility
 * 
 * CRITICAL: This function uses ONLY cached data from the database:
 * - seasons.episode_count (cached from TMDB)
 * - user_episode_status (user's seen episodes)
 * 
 * NO live TMDB calls are made.
 * 
 * This function should ONLY be called when episode status changes,
 * NOT during recommendation fetches or pool population.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/constants/db/tables';
import { SEASONS_COLUMNS, USER_EPISODE_STATUS_COLUMNS } from '@/constants/db/columns';
import { logError } from '@/server/utils/logger';

/**
 * Check if a TV series is fully seen (all episodes in all seasons are seen)
 * 
 * @param userId User ID
 * @param tmdbSeriesId TV series TMDB ID
 * @param supabase Supabase client
 * @returns true if all episodes in all seasons are seen, false otherwise
 */
export async function isSeriesFullySeen(
  userId: string,
  tmdbSeriesId: number,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    // Get all seasons for the series with episode_count (cached data)
    const { data: seasons, error: seasonsError } = await supabase
      .from(TABLES.SEASONS)
      .select(`${SEASONS_COLUMNS.SEASON_NUMBER}, ${SEASONS_COLUMNS.EPISODE_COUNT}`)
      .eq(SEASONS_COLUMNS.TV_TMDB_ID, tmdbSeriesId)
      .order(SEASONS_COLUMNS.SEASON_NUMBER, { ascending: true });

    if (seasonsError) {
      logError('[SeriesSeenCheck] Error fetching seasons', seasonsError as Error, {
        userId,
        tmdbSeriesId,
      });
      return false;
    }

    if (!seasons || seasons.length === 0) {
      // No seasons found - cannot determine if fully seen
      return false;
    }

    // Calculate total expected episodes from cached episode_count
    let totalExpectedEpisodes = 0;
    for (const season of seasons) {
      const episodeCount = season.episode_count;
      if (episodeCount === null || episodeCount === undefined) {
        // If any season has null episode_count, we cannot determine if fully seen
        return false;
      }
      totalExpectedEpisodes += episodeCount;
    }

    if (totalExpectedEpisodes === 0) {
      // No episodes expected - cannot be fully seen
      return false;
    }

    // Get all seen episodes for this series
    const { data: seenEpisodes, error: episodesError } = await supabase
      .from(TABLES.USER_EPISODE_STATUS)
      .select(
        `${USER_EPISODE_STATUS_COLUMNS.SEASON_NUMBER}, ${USER_EPISODE_STATUS_COLUMNS.EPISODE_NUMBER}`
      )
      .eq(USER_EPISODE_STATUS_COLUMNS.USER_ID, userId)
      .eq(USER_EPISODE_STATUS_COLUMNS.TMDB_SERIES_ID, tmdbSeriesId)
      .eq(USER_EPISODE_STATUS_COLUMNS.SEEN, true);

    if (episodesError) {
      logError('[SeriesSeenCheck] Error fetching episode statuses', episodesError as Error, {
        userId,
        tmdbSeriesId,
      });
      return false;
    }

    if (!seenEpisodes || seenEpisodes.length === 0) {
      // No episodes seen
      return false;
    }

    // Count unique seen episodes
    const seenEpisodesSet = new Set<string>();
    for (const episode of seenEpisodes) {
      const key = `${episode.season_number}-${episode.episode_number}`;
      seenEpisodesSet.add(key);
    }

    const totalSeenEpisodes = seenEpisodesSet.size;

    // Series is fully seen if all expected episodes are seen
    return totalSeenEpisodes >= totalExpectedEpisodes;
  } catch (error) {
    logError('[SeriesSeenCheck] Unexpected error', error as Error, {
      userId,
      tmdbSeriesId,
    });
    return false;
  }
}

/**
 * Check if a season is fully seen (all episodes in the season are seen)
 * 
 * @param userId User ID
 * @param tmdbSeriesId TV series TMDB ID
 * @param seasonNumber Season number
 * @param supabase Supabase client
 * @returns true if all episodes in the season are seen, false otherwise
 */
export async function isSeasonFullySeen(
  userId: string,
  tmdbSeriesId: number,
  seasonNumber: number,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    // Get season episode_count (cached data)
    const { data: season, error: seasonError } = await supabase
      .from(TABLES.SEASONS)
      .select(SEASONS_COLUMNS.EPISODE_COUNT)
      .eq(SEASONS_COLUMNS.TV_TMDB_ID, tmdbSeriesId)
      .eq(SEASONS_COLUMNS.SEASON_NUMBER, seasonNumber)
      .maybeSingle();

    if (seasonError) {
      logError('[SeriesSeenCheck] Error fetching season', seasonError as Error, {
        userId,
        tmdbSeriesId,
        seasonNumber,
      });
      return false;
    }

    if (!season || season.episode_count === null || season.episode_count === undefined) {
      // Season not found or episode_count is null - cannot determine if fully seen
      return false;
    }

    const expectedEpisodes = season.episode_count;

    if (expectedEpisodes === 0) {
      // No episodes expected - cannot be fully seen
      return false;
    }

    // Get all seen episodes for this season
    const { data: seenEpisodes, error: episodesError } = await supabase
      .from(TABLES.USER_EPISODE_STATUS)
      .select(USER_EPISODE_STATUS_COLUMNS.EPISODE_NUMBER)
      .eq(USER_EPISODE_STATUS_COLUMNS.USER_ID, userId)
      .eq(USER_EPISODE_STATUS_COLUMNS.TMDB_SERIES_ID, tmdbSeriesId)
      .eq(USER_EPISODE_STATUS_COLUMNS.SEASON_NUMBER, seasonNumber)
      .eq(USER_EPISODE_STATUS_COLUMNS.SEEN, true);

    if (episodesError) {
      logError('[SeriesSeenCheck] Error fetching episode statuses', episodesError as Error, {
        userId,
        tmdbSeriesId,
        seasonNumber,
      });
      return false;
    }

    if (!seenEpisodes || seenEpisodes.length === 0) {
      // No episodes seen
      return false;
    }

    // Count unique seen episodes
    const seenEpisodesSet = new Set<number>();
    for (const episode of seenEpisodes) {
      seenEpisodesSet.add(episode.episode_number);
    }

    const totalSeenEpisodes = seenEpisodesSet.size;

    // Season is fully seen if all expected episodes are seen
    return totalSeenEpisodes >= expectedEpisodes;
  } catch (error) {
    logError('[SeriesSeenCheck] Unexpected error', error as Error, {
      userId,
      tmdbSeriesId,
      seasonNumber,
    });
    return false;
  }
}
