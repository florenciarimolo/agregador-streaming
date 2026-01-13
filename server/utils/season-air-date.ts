/**
 * Shared utility for getting season air_date from TMDB
 * Handles fetching season details and extracting air_date from first episode if needed
 */

import { getTMDBConfig } from '@/server/utils/config';
import { $fetch } from 'ofetch';

/**
 * Get air_date from season data or first episode
 * @param airDate Season air_date from TMDB
 * @param episodes Episodes array from TMDB season response
 * @returns air_date string or null
 */
export function getAirDateFromSeasonOrEpisode(
  airDate: string | null | undefined,
  episodes?: Array<{ air_date?: string | null }>
): string | null {
  // First try the season's air_date
  if (airDate && airDate.trim() !== '') {
    return airDate;
  }

  // If not available, try to get it from the first episode
  if (episodes && episodes.length > 0) {
    const firstEpisodeWithDate = episodes.find(
      (ep) => ep.air_date && ep.air_date.trim() !== ''
    );
    if (firstEpisodeWithDate?.air_date) {
      return firstEpisodeWithDate.air_date;
    }
  }

  return null;
}

/**
 * Fetch season details from TMDB and extract air_date
 * @param tvTmdbId TV show TMDB ID
 * @param seasonNumber Season number
 * @param language User language code (e.g., 'es-ES')
 * @param region User region (e.g., 'ES')
 * @returns air_date string or null
 */
export async function fetchSeasonAirDate(
  tvTmdbId: number,
  seasonNumber: number,
  language: string,
  region: string
): Promise<string | null> {
  try {
    const tmdbConfig = getTMDBConfig(language, region);
    const seasonResponse = await $fetch<{
      air_date: string | null;
      episodes?: Array<{
        air_date: string | null;
      }>;
    }>(`${tmdbConfig.baseUrl}/tv/${tvTmdbId}/season/${seasonNumber}`, {
      query: {
        api_key: tmdbConfig.apiKey,
        language: tmdbConfig.language,
        region: tmdbConfig.region,
      },
    });

    return getAirDateFromSeasonOrEpisode(
      seasonResponse.air_date,
      seasonResponse.episodes
    );
  } catch (error) {
    // Log error but don't fail - return null
    if (import.meta.dev) {
      console.error(
        `[fetchSeasonAirDate] Error fetching season details for air_date:`,
        error
      );
    }
    return null;
  }
}

