/**
 * Seasons service
 * Database operations for seasons
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/constants/db/tables';
import { SEASONS_COLUMNS } from '@/constants/db/columns';
import type { Season } from '@/types/TVShow';
import type { MultiLanguageVideos } from '@/types/Video';
import type { MultiLanguageText } from './titles';

/**
 * Get season by TV TMDB ID and season number
 */
export async function getSeasonByTmdbIds(
  tvTmdbId: number,
  seasonNumber: number,
  supabaseClient: SupabaseClient
): Promise<Season | null> {
  const { data, error } = await supabaseClient
    .from(TABLES.SEASONS)
    .select('*')
    .eq(SEASONS_COLUMNS.TV_TMDB_ID, tvTmdbId)
    .eq(SEASONS_COLUMNS.SEASON_NUMBER, seasonNumber)
    .maybeSingle();

  if (error) {
    console.error('[getSeasonByTmdbIds] Error:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  // Map database row to Season type
  return {
    id: data.tmdb_season_id,
    name: data.name || '',
    season_number: data.season_number,
    overview: '', // Will be extracted from JSONB by caller
    air_date: data.air_date || '',
    poster_path: data.poster_path || null,
    vote_average: data.vote_average || 0,
  };
}

/**
 * Upsert season data
 */
export async function upsertSeason(
  seasonData: {
    tv_tmdb_id: number;
    season_number: number;
    tmdb_season_id: number;
    name?: string | null;
    air_date?: string | null;
    poster_path?: string | null;
    vote_average?: number | null;
    overview?: MultiLanguageText | null;
  },
  supabaseClient: SupabaseClient
): Promise<Season | null> {
  const { data, error } = await supabaseClient
    .from(TABLES.SEASONS)
    .upsert(
      {
        [SEASONS_COLUMNS.TV_TMDB_ID]: seasonData.tv_tmdb_id,
        [SEASONS_COLUMNS.SEASON_NUMBER]: seasonData.season_number,
        [SEASONS_COLUMNS.TMDB_SEASON_ID]: seasonData.tmdb_season_id,
        [SEASONS_COLUMNS.NAME]: seasonData.name || null,
        [SEASONS_COLUMNS.AIR_DATE]: seasonData.air_date || null,
        [SEASONS_COLUMNS.POSTER_PATH]: seasonData.poster_path || null,
        [SEASONS_COLUMNS.VOTE_AVERAGE]: seasonData.vote_average || null,
        [SEASONS_COLUMNS.OVERVIEW]:
          seasonData.overview && Object.keys(seasonData.overview).length > 0
            ? seasonData.overview
            : null,
      },
      {
        onConflict: `${SEASONS_COLUMNS.TV_TMDB_ID},${SEASONS_COLUMNS.SEASON_NUMBER}`,
      }
    )
    .select()
    .single();

  if (error) {
    console.error('[upsertSeason] Error:', error);
    return null;
  }

  return {
    id: data.tmdb_season_id,
    name: data.name || '',
    season_number: data.season_number,
    overview: '', // Will be extracted from JSONB by caller
    air_date: data.air_date || '',
    poster_path: data.poster_path || null,
    vote_average: data.vote_average || 0,
  };
}

/**
 * Get all seasons for a TV show from database
 */
export async function getSeasonsByTvTmdbId(
  tvTmdbId: number,
  supabaseClient: SupabaseClient
): Promise<Season[]> {
  const { data, error } = await supabaseClient
    .from(TABLES.SEASONS)
    .select('*')
    .eq(SEASONS_COLUMNS.TV_TMDB_ID, tvTmdbId)
    .order(SEASONS_COLUMNS.SEASON_NUMBER, { ascending: true });

  if (error) {
    console.error('[getSeasonsByTvTmdbId] Error:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Map database rows to Season type
  return data.map((row) => ({
    id: row.tmdb_season_id,
    name: row.name || '',
    season_number: row.season_number,
    overview: '', // Will be extracted from JSONB by caller if needed
    air_date: row.air_date || '',
    poster_path: row.poster_path || null,
    vote_average: row.vote_average || 0,
    episode_count: undefined, // Not stored in DB, fetched on-demand
  }));
}

/**
 * Update season videos
 */
export async function updateSeasonVideos(
  tvTmdbId: number,
  seasonNumber: number,
  videos: MultiLanguageVideos,
  videosUpdatedAt: Date,
  supabaseClient: SupabaseClient
): Promise<void> {
  const { error } = await supabaseClient
    .from(TABLES.SEASONS)
    .update({
      [SEASONS_COLUMNS.VIDEOS]:
        Object.keys(videos).length > 0 ? videos : {},
      [SEASONS_COLUMNS.VIDEOS_UPDATED_AT]: videosUpdatedAt.toISOString(),
    })
    .eq(SEASONS_COLUMNS.TV_TMDB_ID, tvTmdbId)
    .eq(SEASONS_COLUMNS.SEASON_NUMBER, seasonNumber);

  if (error) {
    console.error('[updateSeasonVideos] Error:', error);
    throw error;
  }
}

