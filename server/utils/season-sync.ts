/**
 * Season sync utility
 * Syncs seasons from TMDB TV show response to database
 * Only creates/updates basic data; overview and videos are fetched on-demand
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/constants/db/tables';
import { SEASONS_COLUMNS } from '@/constants/db/columns';
import type { Season } from '@/types/TVShow';

/**
 * TMDB season structure from /tv/{id} response
 */
type TMDBSeason = {
  id: number; // tmdb_season_id
  name: string;
  season_number: number;
  overview: string; // NOT used in sync (fetched on-demand)
  air_date: string;
  poster_path: string | null;
  vote_average: number;
  episode_count?: number; // NOT stored (episodes fetched on-demand)
};

/**
 * Sync seasons from TMDB TV show response to database
 * Compares season_number values and creates missing seasons with basic data only
 * Designed to be reusable by cron jobs in the future
 */
export async function syncSeasonsFromTVShow(
  tvTmdbId: number,
  tmdbSeasons: TMDBSeason[],
  supabase: SupabaseClient
): Promise<void> {
  if (!tmdbSeasons || tmdbSeasons.length === 0) {
    return;
  }

  // Get existing seasons from DB for this TV show
  const { data: existingSeasons, error: fetchError } = await supabase
    .from(TABLES.SEASONS)
    .select(SEASONS_COLUMNS.SEASON_NUMBER)
    .eq(SEASONS_COLUMNS.TV_TMDB_ID, tvTmdbId);

  if (fetchError) {
    console.error(
      `[syncSeasonsFromTVShow] Error fetching existing seasons:`,
      fetchError
    );
    return;
  }

  const existingSeasonNumbers = new Set(
    existingSeasons?.map((s) => s.season_number) || []
  );

  // Find seasons in TMDB that don't exist in DB
  const seasonsToCreate = tmdbSeasons.filter(
    (tmdbSeason) => !existingSeasonNumbers.has(tmdbSeason.season_number)
  );

  if (seasonsToCreate.length === 0) {
    return;
  }

  // Prepare seasons for upsert
  const seasonsToUpsert = seasonsToCreate.map((tmdbSeason) => ({
    [SEASONS_COLUMNS.TV_TMDB_ID]: tvTmdbId,
    [SEASONS_COLUMNS.SEASON_NUMBER]: tmdbSeason.season_number,
    [SEASONS_COLUMNS.TMDB_SEASON_ID]: tmdbSeason.id,
    [SEASONS_COLUMNS.NAME]: tmdbSeason.name || null,
    [SEASONS_COLUMNS.AIR_DATE]: tmdbSeason.air_date || null,
    [SEASONS_COLUMNS.POSTER_PATH]: tmdbSeason.poster_path || null,
    [SEASONS_COLUMNS.VOTE_AVERAGE]: tmdbSeason.vote_average || null,
    // overview and videos remain null (never fetched) until accessed on-demand
    [SEASONS_COLUMNS.OVERVIEW]: null,
    [SEASONS_COLUMNS.VIDEOS]: null,
  }));

  // Upsert seasons (only creates new ones, doesn't overwrite existing overview/videos)
  const { error: upsertError } = await supabase
    .from(TABLES.SEASONS)
    .upsert(seasonsToUpsert, {
      onConflict: `${SEASONS_COLUMNS.TV_TMDB_ID},${SEASONS_COLUMNS.SEASON_NUMBER}`,
      ignoreDuplicates: false,
    });

  if (upsertError) {
    console.error(
      `[syncSeasonsFromTVShow] Error upserting seasons:`,
      upsertError
    );
  } else if (seasonsToCreate.length > 0 && import.meta.dev) {
    console.log(
      `[syncSeasonsFromTVShow] Created ${seasonsToCreate.length} new season(s) for TV show ${tvTmdbId}`
    );
  }
}

