/**
 * Season sync utility
 * Syncs seasons from TMDB TV show response to database
 * Only creates/updates basic data; overview and videos are fetched on-demand
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/constants/db/tables';
import { SEASONS_COLUMNS } from '@/constants/db/columns';
import { upsertSeason } from '@/services/seasons';
import { $fetch } from 'ofetch';
import type { MultiLanguageText } from '@/services/titles';
import { getAirDateFromSeasonOrEpisode } from '@/server/utils/season-air-date';

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

  // Get existing seasons from DB for this TV show (including air_date, episode_count and tmdb_season_id to check for nulls)
  const { data: existingSeasons, error: fetchError } = await supabase
    .from(TABLES.SEASONS)
    .select(`${SEASONS_COLUMNS.SEASON_NUMBER}, ${SEASONS_COLUMNS.AIR_DATE}, ${SEASONS_COLUMNS.EPISODE_COUNT}, ${SEASONS_COLUMNS.TMDB_SEASON_ID}, ${SEASONS_COLUMNS.NAME}, ${SEASONS_COLUMNS.POSTER_PATH}, ${SEASONS_COLUMNS.VOTE_AVERAGE}`)
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

  // Find existing seasons with null episode_count (to update them)
  const existingSeasonsWithNullEpisodeCount = existingSeasons?.filter(
    (s) => s.episode_count === null || s.episode_count === undefined
  ) || [];

  // Find existing seasons missing poster_path in current language
  const existingSeasonsMissingPosterPath: Array<{
    season: typeof existingSeasons[0];
    tmdbSeason: TMDBSeason;
  }> = [];
  if (tmdbConfig?.language && existingSeasons) {
    for (const existingSeason of existingSeasons) {
      const tmdbSeason = tmdbSeasons.find(
        (s) => s.season_number === existingSeason.season_number
      );
      if (tmdbSeason && tmdbSeason.poster_path) {
        // Check if poster_path is missing in current language
        const posterPathJsonb = existingSeason.poster_path as MultiLanguageText | null;
        const hasPosterPathInLanguage =
          posterPathJsonb &&
          typeof posterPathJsonb === 'object' &&
          !Array.isArray(posterPathJsonb) &&
          posterPathJsonb[tmdbConfig.language] !== undefined;
        if (!hasPosterPathInLanguage) {
          existingSeasonsMissingPosterPath.push({
            season: existingSeason,
            tmdbSeason,
          });
        }
      }
    }
  }

  // If no seasons to create and no existing seasons with null dates/episode_count/poster_path, return early
  if (
    seasonsToCreate.length === 0 &&
    existingSeasonsWithNullDate.length === 0 &&
    existingSeasonsWithNullEpisodeCount.length === 0 &&
    existingSeasonsMissingPosterPath.length === 0
  ) {
    return;
  }

  // Prepare seasons for upsert
  // Convert name and poster_path to JSONB format with language from tmdbConfig
  const seasonsToUpsert = seasonsToCreate.map((tmdbSeason) => {
    const nameJsonb: MultiLanguageText | null = tmdbSeason.name && tmdbConfig?.language
      ? { [tmdbConfig.language]: tmdbSeason.name }
      : null;

    // Convert poster_path string to MultiLanguageText JSONB format
    const posterPathJsonb: MultiLanguageText | null = tmdbSeason.poster_path && tmdbConfig?.language
      ? { [tmdbConfig.language]: tmdbSeason.poster_path }
      : null;

    return {
      [SEASONS_COLUMNS.TV_TMDB_ID]: tvTmdbId,
      [SEASONS_COLUMNS.SEASON_NUMBER]: tmdbSeason.season_number,
      [SEASONS_COLUMNS.TMDB_SEASON_ID]: tmdbSeason.id,
      [SEASONS_COLUMNS.NAME]: nameJsonb,
      [SEASONS_COLUMNS.AIR_DATE]: tmdbSeason.air_date || null,
      [SEASONS_COLUMNS.POSTER_PATH]: posterPathJsonb,
      [SEASONS_COLUMNS.VOTE_AVERAGE]: tmdbSeason.vote_average || null,
      [SEASONS_COLUMNS.EPISODE_COUNT]: tmdbSeason.episode_count ?? null,
      // overview and videos remain null (never fetched) until accessed on-demand
      [SEASONS_COLUMNS.OVERVIEW]: null,
      [SEASONS_COLUMNS.VIDEOS]: null,
    };
  });

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

  // After syncing, check for seasons with null air_date or episode_count and try to get them from TMDB
  if (tmdbConfig) {
    // Process existing seasons with null episode_count
    for (const existingSeason of existingSeasonsWithNullEpisodeCount) {
      try {
        // Fetch season details from TMDB to get episodes
        const seasonResponse = await $fetch<{
          id: number;
          episodes?: Array<unknown>;
        }>(`${tmdbConfig.baseUrl}/tv/${tvTmdbId}/season/${existingSeason.season_number}`, {
          query: {
            api_key: tmdbConfig.apiKey,
            language: tmdbConfig.language,
            region: tmdbConfig.region,
          },
        });

        // Calculate episode_count from episodes array
        const episodeCount = seasonResponse.episodes?.length || null;

        // If we found episode_count, update the season in the database
        if (episodeCount !== null) {
          // Keep existing name JSONB (don't overwrite)
          const existingNameJsonb = existingSeason.name as MultiLanguageText | null;
          await upsertSeason(
            {
              tv_tmdb_id: tvTmdbId,
              season_number: existingSeason.season_number,
              tmdb_season_id: existingSeason.tmdb_season_id,
              name: existingNameJsonb,
              poster_path: existingSeason.poster_path || null,
              vote_average: existingSeason.vote_average || null,
              episode_count: episodeCount,
            },
            supabase
          );

          if (import.meta.dev) {
            console.log(
              `[syncSeasonsFromTVShow] Updated episode_count for existing season ${existingSeason.season_number}: ${episodeCount}`
            );
          }
        }
      } catch (episodeError) {
        // Log error but don't fail the sync
        if (import.meta.dev) {
          console.error(
            `[syncSeasonsFromTVShow] Error fetching episode_count for existing season ${existingSeason.season_number}:`,
            episodeError
          );
        }
      }
    }
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

        // Get air_date from season response or first episode
        const finalAirDate = getAirDateFromSeasonOrEpisode(
          seasonResponse.air_date,
          seasonResponse.episodes
        );

        // Calculate episode_count from episodes array
        const episodeCount = seasonResponse.episodes?.length || null;

        // If we found a date or episode_count, update the season in the database
        if (finalAirDate || episodeCount !== null) {
          // Convert name to JSONB format with language from tmdbConfig
          const nameJsonb: MultiLanguageText | null = seasonResponse.name && tmdbConfig?.language
            ? { [tmdbConfig.language]: seasonResponse.name }
            : null;
          // Convert poster_path string to MultiLanguageText JSONB format
          const posterPathJsonb: MultiLanguageText | null = season.poster_path && tmdbConfig?.language
            ? { [tmdbConfig.language]: season.poster_path }
            : null;

          await upsertSeason(
            {
              tv_tmdb_id: tvTmdbId,
              season_number: season.season_number,
              tmdb_season_id: season.id,
              name: nameJsonb,
              air_date: finalAirDate || undefined,
              poster_path: posterPathJsonb,
              vote_average: season.vote_average || null,
              episode_count: episodeCount,
            },
            supabase
          );

          if (import.meta.dev) {
            if (finalAirDate) {
              console.log(
                `[syncSeasonsFromTVShow] Updated air_date for season ${season.season_number} from first episode: ${finalAirDate}`
              );
            }
            if (episodeCount !== null) {
              console.log(
                `[syncSeasonsFromTVShow] Updated episode_count for season ${season.season_number}: ${episodeCount}`
              );
            }
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

        // Get air_date from season response or first episode
        const finalAirDate = getAirDateFromSeasonOrEpisode(
          seasonResponse.air_date,
          seasonResponse.episodes
        );

        // Calculate episode_count from episodes array
        const episodeCount = seasonResponse.episodes?.length || null;

        // If we found a date or episode_count, update the season in the database
        if (finalAirDate || episodeCount !== null) {
          // Keep existing name JSONB and merge with new name from TMDB if available
          // Safely get existing name JSONB - ensure it's an object, not a string
          const existingNameJsonbRaw = existingSeason.name;
          const existingNameJsonb: MultiLanguageText | null =
            existingNameJsonbRaw &&
            typeof existingNameJsonbRaw === 'object' &&
            !Array.isArray(existingNameJsonbRaw)
              ? (existingNameJsonbRaw as MultiLanguageText)
              : null;
          let updatedNameJsonb = existingNameJsonb;
          if (seasonResponse.name && tmdbConfig?.language) {
            updatedNameJsonb = {
              ...(existingNameJsonb || {}),
              [tmdbConfig.language]: seasonResponse.name,
            };
          }

          // Check if poster_path needs updating (get from original TMDB seasons array)
          const tmdbSeason = tmdbSeasons.find(
            (s) => s.season_number === existingSeason.season_number
          );
          let updatedPosterPathJsonb: MultiLanguageText | null = null;
          if (tmdbSeason?.poster_path && tmdbConfig?.language) {
            // Safely get existing poster_path JSONB
            const existingPosterPathJsonbRaw = existingSeason.poster_path;
            const existingPosterPathJsonb: MultiLanguageText | null =
              existingPosterPathJsonbRaw &&
              typeof existingPosterPathJsonbRaw === 'object' &&
              !Array.isArray(existingPosterPathJsonbRaw)
                ? (existingPosterPathJsonbRaw as MultiLanguageText)
                : null;
            // Check if poster_path is missing in current language
            const hasPosterPathInLanguage =
              existingPosterPathJsonb &&
              existingPosterPathJsonb[tmdbConfig.language] !== undefined;
            if (!hasPosterPathInLanguage) {
              updatedPosterPathJsonb = {
                ...(existingPosterPathJsonb || {}),
                [tmdbConfig.language]: tmdbSeason.poster_path,
              };
            } else {
              updatedPosterPathJsonb = existingPosterPathJsonb;
            }
          } else {
            // Preserve existing poster_path if no update needed
            const existingPosterPathJsonbRaw = existingSeason.poster_path;
            updatedPosterPathJsonb =
              existingPosterPathJsonbRaw &&
              typeof existingPosterPathJsonbRaw === 'object' &&
              !Array.isArray(existingPosterPathJsonbRaw)
                ? (existingPosterPathJsonbRaw as MultiLanguageText)
                : null;
          }

          await upsertSeason(
            {
              tv_tmdb_id: tvTmdbId,
              season_number: existingSeason.season_number,
              tmdb_season_id: existingSeason.tmdb_season_id,
              name: updatedNameJsonb,
              air_date: finalAirDate || undefined,
              poster_path: updatedPosterPathJsonb,
              vote_average: existingSeason.vote_average || null,
              episode_count: episodeCount,
            },
            supabase
          );

          if (import.meta.dev) {
            if (finalAirDate) {
              console.log(
                `[syncSeasonsFromTVShow] Updated air_date for existing season ${existingSeason.season_number} from first episode: ${finalAirDate}`
              );
            }
            if (episodeCount !== null) {
              console.log(
                `[syncSeasonsFromTVShow] Updated episode_count for existing season ${existingSeason.season_number}: ${episodeCount}`
              );
            }
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

    // Update existing seasons missing poster_path in current language
    for (const { season, tmdbSeason } of existingSeasonsMissingPosterPath) {
      try {
        // Safely get existing poster_path JSONB - ensure it's an object, not a string
        const existingPosterPathJsonbRaw = season.poster_path;
        const existingPosterPathJsonb: MultiLanguageText | null =
          existingPosterPathJsonbRaw &&
          typeof existingPosterPathJsonbRaw === 'object' &&
          !Array.isArray(existingPosterPathJsonbRaw)
            ? (existingPosterPathJsonbRaw as MultiLanguageText)
            : null;

        // Merge with new poster_path from TMDB
        const updatedPosterPathJsonb: MultiLanguageText = {
          ...(existingPosterPathJsonb || {}),
          [tmdbConfig.language]: tmdbSeason.poster_path,
        };

        // Keep existing name JSONB
        const existingNameJsonbRaw = season.name;
        const existingNameJsonb: MultiLanguageText | null =
          existingNameJsonbRaw &&
          typeof existingNameJsonbRaw === 'object' &&
          !Array.isArray(existingNameJsonbRaw)
            ? (existingNameJsonbRaw as MultiLanguageText)
            : null;

        await upsertSeason(
          {
            tv_tmdb_id: tvTmdbId,
            season_number: season.season_number,
            tmdb_season_id: season.tmdb_season_id,
            name: existingNameJsonb,
            air_date: season.air_date || undefined,
            poster_path: updatedPosterPathJsonb,
            vote_average: season.vote_average || null,
            episode_count: season.episode_count ?? undefined,
          },
          supabase
        );

        if (import.meta.dev) {
          console.log(
            `[syncSeasonsFromTVShow] Updated poster_path for existing season ${season.season_number} in language ${tmdbConfig.language}`
          );
        }
      } catch (posterError) {
        // Log error but don't fail the sync
        if (import.meta.dev) {
          console.error(
            `[syncSeasonsFromTVShow] Error updating poster_path for existing season ${season.season_number}:`,
            posterError
          );
        }
      }
    }
  }
}

