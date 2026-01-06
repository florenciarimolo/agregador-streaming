/**
 * Season sync utility
 * Syncs seasons from TMDB TV show response to database
 * Only creates/updates basic data; overview and videos are fetched on-demand
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/constants/db/tables';
import { SEASONS_COLUMNS } from '@/constants/db/columns';
import type { Season } from '@/types/TVShow';
import { upsertSeason } from '@/services/seasons';
import { $fetch } from 'ofetch';

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
 * TMDB config for API calls
 */
type TMDBConfig = {
  baseUrl: string;
  apiKey: string;
  language: string;
  region: string;
};

/**
 * Sync seasons from TMDB TV show response to database
 * Compares season_number values and creates missing seasons with basic data only
 * If a season has null air_date, attempts to fetch it from the first episode
 * Designed to be reusable by cron jobs in the future
 */
export async function syncSeasonsFromTVShow(
  tvTmdbId: number,
  tmdbSeasons: TMDBSeason[],
  supabase: SupabaseClient,
  tmdbConfig?: TMDBConfig
): Promise<void> {
  if (!tmdbSeasons || tmdbSeasons.length === 0) {
    return;
  }

  // Get existing seasons from DB for this TV show (including air_date and tmdb_season_id to check for nulls)
  const { data: existingSeasons, error: fetchError } = await supabase
    .from(TABLES.SEASONS)
    .select(`${SEASONS_COLUMNS.SEASON_NUMBER}, ${SEASONS_COLUMNS.AIR_DATE}, ${SEASONS_COLUMNS.TMDB_SEASON_ID}, ${SEASONS_COLUMNS.NAME}, ${SEASONS_COLUMNS.POSTER_PATH}, ${SEASONS_COLUMNS.VOTE_AVERAGE}`)
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

  // Find existing seasons with null air_date (to update them)
  const existingSeasonsWithNullDate = existingSeasons?.filter(
    (s) => !s.air_date || s.air_date.trim() === ''
  ) || [];

  // If no seasons to create and no existing seasons with null dates, return early
  if (seasonsToCreate.length === 0 && existingSeasonsWithNullDate.length === 0) {
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

  // After syncing, check for seasons with null air_date and try to get it from first episode
  if (tmdbConfig) {
    // Combine new seasons with null dates and existing seasons with null dates
    const newSeasonsWithNullDate = seasonsToCreate.filter(
      (s) => !s.air_date || s.air_date.trim() === ''
    );
    
    // Process new seasons with null air_date
    for (const season of newSeasonsWithNullDate) {
      try {
        // Fetch season details from TMDB to get episodes
        const seasonResponse = await $fetch<{
          id: number;
          name: string;
          air_date: string | null;
          episodes?: Array<{
            air_date: string | null;
          }>;
        }>(`${tmdbConfig.baseUrl}/tv/${tvTmdbId}/season/${season.season_number}`, {
          query: {
            api_key: tmdbConfig.apiKey,
            language: tmdbConfig.language,
            region: tmdbConfig.region,
          },
        });

        // If air_date is null, try to get it from the first episode
        let finalAirDate = seasonResponse.air_date;
        if (!finalAirDate && seasonResponse.episodes && seasonResponse.episodes.length > 0) {
          // Find the first episode with an air_date
          const firstEpisodeWithDate = seasonResponse.episodes.find(
            (ep) => ep.air_date && ep.air_date.trim() !== ''
          );
          if (firstEpisodeWithDate?.air_date) {
            finalAirDate = firstEpisodeWithDate.air_date;
          }
        }

        // If we found a date, update the season in the database
        if (finalAirDate) {
          await upsertSeason(
            {
              tv_tmdb_id: tvTmdbId,
              season_number: season.season_number,
              tmdb_season_id: season.id,
              name: season.name || null,
              air_date: finalAirDate,
              poster_path: season.poster_path || null,
              vote_average: season.vote_average || null,
            },
            supabase
          );

          if (import.meta.dev) {
            console.log(
              `[syncSeasonsFromTVShow] Updated air_date for season ${season.season_number} from first episode: ${finalAirDate}`
            );
          }
        }
      } catch (episodeError) {
        // Log error but don't fail the sync
        if (import.meta.dev) {
          console.error(
            `[syncSeasonsFromTVShow] Error fetching air_date from first episode for season ${season.season_number}:`,
            episodeError
          );
        }
      }
    }

    // Process existing seasons with null air_date
    for (const existingSeason of existingSeasonsWithNullDate) {
      try {
        // Fetch season details from TMDB to get episodes
        const seasonResponse = await $fetch<{
          id: number;
          name: string;
          air_date: string | null;
          episodes?: Array<{
            air_date: string | null;
          }>;
        }>(`${tmdbConfig.baseUrl}/tv/${tvTmdbId}/season/${existingSeason.season_number}`, {
          query: {
            api_key: tmdbConfig.apiKey,
            language: tmdbConfig.language,
            region: tmdbConfig.region,
          },
        });

        // If air_date is null, try to get it from the first episode
        let finalAirDate = seasonResponse.air_date;
        if (!finalAirDate && seasonResponse.episodes && seasonResponse.episodes.length > 0) {
          // Find the first episode with an air_date
          const firstEpisodeWithDate = seasonResponse.episodes.find(
            (ep) => ep.air_date && ep.air_date.trim() !== ''
          );
          if (firstEpisodeWithDate?.air_date) {
            finalAirDate = firstEpisodeWithDate.air_date;
          }
        }

        // If we found a date, update the season in the database
        if (finalAirDate) {
          await upsertSeason(
            {
              tv_tmdb_id: tvTmdbId,
              season_number: existingSeason.season_number,
              tmdb_season_id: existingSeason.tmdb_season_id,
              name: existingSeason.name || null,
              air_date: finalAirDate,
              poster_path: existingSeason.poster_path || null,
              vote_average: existingSeason.vote_average || null,
            },
            supabase
          );

          if (import.meta.dev) {
            console.log(
              `[syncSeasonsFromTVShow] Updated air_date for existing season ${existingSeason.season_number} from first episode: ${finalAirDate}`
            );
          }
        }
      } catch (episodeError) {
        // Log error but don't fail the sync
        if (import.meta.dev) {
          console.error(
            `[syncSeasonsFromTVShow] Error fetching air_date from first episode for existing season ${existingSeason.season_number}:`,
            episodeError
          );
        }
      }
    }
  }
}

