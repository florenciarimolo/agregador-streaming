/**
 * Season update utility
 * Shared logic for updating missing season data from TMDB to database
 * Used by both TV show and season detail endpoints
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MultiLanguageText } from '@/services/titles';
import { TABLES } from '@/constants/db/tables';
import { SEASONS_COLUMNS } from '@/constants/db/columns';
import { upsertSeason } from '@/services/seasons';
import {
  getAirDateFromSeasonOrEpisode,
  fetchSeasonAirDate,
} from '@/server/utils/season-air-date';
import { getTMDBConfig } from '@/server/utils/config';
import { getPrimaryLanguageForRegion } from '@/utils/language-detection';
import { DEFAULT_LANGUAGE_ISO } from '@/constants/languages';
import { logError, devLog } from '@/server/utils/logger';

/**
 * Safely extract MultiLanguageText from database value
 */
function safeGetMultiLanguageText(value: unknown): MultiLanguageText | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as MultiLanguageText;
  }
  return null;
}

/**
 * TMDB season data structure
 */
export type TMDBSeasonData = {
  id: number;
  name?: string;
  season_number: number;
  overview?: string;
  air_date?: string | null;
  poster_path?: string | null;
  vote_average?: number | null;
  episode_count?: number | null;
  // Optional: episodes array for getting air_date from first episode
  episodes?: Array<{ air_date?: string | null }>;
};

/**
 * Database season data structure (extracted)
 */
export type DatabaseSeasonData = {
  name?: string;
  poster_path?: string | null;
  vote_average?: number | null;
  overview?: string;
  air_date?: string;
  episode_count?: number | null;
};

/**
 * Update missing season data from TMDB to database
 * Preserves existing data and only updates missing fields
 *
 * @param tvTmdbId TV show TMDB ID
 * @param seasonNumber Season number
 * @param dbSeason Season data from database (extracted)
 * @param tmdbSeason Season data from TMDB
 * @param language User language code (e.g., 'es-ES')
 * @param supabase Supabase client
 * @param region Optional user region (e.g., 'ES') - used to fetch season details if air_date is missing
 * @returns true if update was made, false otherwise
 */
export async function updateMissingSeasonFields(
  tvTmdbId: number,
  seasonNumber: number,
  dbSeason: DatabaseSeasonData | null,
  tmdbSeason: TMDBSeasonData,
  language: string,
  supabase: SupabaseClient,
  region?: string
): Promise<boolean> {
  // Check if we need to update any missing fields
  const needsNameUpdate = !dbSeason?.name && tmdbSeason.name;
  const needsPosterPathUpdate =
    !dbSeason?.poster_path && tmdbSeason.poster_path;
  const needsVoteAverageUpdate =
    (dbSeason?.vote_average === null ||
      dbSeason?.vote_average === undefined ||
      dbSeason?.vote_average === 0) &&
    tmdbSeason.vote_average !== null &&
    tmdbSeason.vote_average !== undefined &&
    tmdbSeason.vote_average > 0;
  const needsOverviewUpdate =
    !dbSeason?.overview &&
    tmdbSeason.overview &&
    tmdbSeason.overview.trim() !== '';
  // Get air_date from TMDB or from first episode if available
  let finalAirDate = getAirDateFromSeasonOrEpisode(
    tmdbSeason.air_date,
    tmdbSeason.episodes
  );

  // If air_date is still missing and we don't have episodes, fetch season details
  if (
    (!dbSeason?.air_date || dbSeason.air_date.trim() === '') &&
    !finalAirDate &&
    !tmdbSeason.episodes &&
    region
  ) {
    finalAirDate = await fetchSeasonAirDate(
      tvTmdbId,
      seasonNumber,
      language,
      region
    );
  }

  // Check if we need to update air_date (after potentially fetching it)
  const needsAirDateUpdate =
    (!dbSeason?.air_date || dbSeason.air_date.trim() === '') && finalAirDate;
  const needsEpisodeCountUpdate =
    (dbSeason?.episode_count === null ||
      dbSeason?.episode_count === undefined) &&
    tmdbSeason.episode_count !== null &&
    tmdbSeason.episode_count !== undefined;

  // If no updates needed, return early
  if (
    !needsNameUpdate &&
    !needsPosterPathUpdate &&
    !needsVoteAverageUpdate &&
    !needsOverviewUpdate &&
    !needsAirDateUpdate &&
    !needsEpisodeCountUpdate
  ) {
    return false;
  }

  try {
    // Fetch current season data from database to preserve all fields
    const { data: currentSeasonData } = await supabase
      .from(TABLES.SEASONS)
      .select('*')
      .eq(SEASONS_COLUMNS.TV_TMDB_ID, tvTmdbId)
      .eq(SEASONS_COLUMNS.SEASON_NUMBER, seasonNumber)
      .maybeSingle();

    if (currentSeasonData) {
      // Preserve existing JSONB data
      const currentNameJsonb =
        safeGetMultiLanguageText(currentSeasonData.name) || {};
      const currentPosterPathJsonb =
        safeGetMultiLanguageText(currentSeasonData.poster_path) || {};
      const currentOverviewJsonb =
        safeGetMultiLanguageText(currentSeasonData.overview) || {};

      // Update name if missing
      const updatedNameJsonb: MultiLanguageText = needsNameUpdate
        ? {
            ...currentNameJsonb,
            [language]: tmdbSeason.name!,
          }
        : currentNameJsonb;

      // Update poster_path if missing
      const updatedPosterPathJsonb: MultiLanguageText =
        needsPosterPathUpdate && tmdbSeason.poster_path
          ? {
              ...currentPosterPathJsonb,
              [language]: tmdbSeason.poster_path,
            }
          : currentPosterPathJsonb;

      // Update overview if missing
      const updatedOverviewJsonb: MultiLanguageText = needsOverviewUpdate
        ? {
            ...currentOverviewJsonb,
            [language]: tmdbSeason.overview!,
          }
        : currentOverviewJsonb;

      // Update vote_average if missing
      const updatedVoteAverage = needsVoteAverageUpdate
        ? tmdbSeason.vote_average
        : currentSeasonData.vote_average || null;

      // Persist to database, preserving all existing fields
      await upsertSeason(
        {
          tv_tmdb_id: tvTmdbId,
          season_number: seasonNumber,
          tmdb_season_id: currentSeasonData.tmdb_season_id,
          name:
            Object.keys(updatedNameJsonb).length > 0 ? updatedNameJsonb : null,
          poster_path:
            Object.keys(updatedPosterPathJsonb).length > 0
              ? updatedPosterPathJsonb
              : null,
          overview:
            Object.keys(updatedOverviewJsonb).length > 0
              ? updatedOverviewJsonb
              : null,
          air_date: needsAirDateUpdate
            ? finalAirDate!
            : currentSeasonData.air_date || undefined,
          vote_average: updatedVoteAverage,
          episode_count: needsEpisodeCountUpdate
            ? tmdbSeason.episode_count!
            : (currentSeasonData.episode_count ?? undefined),
        },
        supabase
      );
    } else {
      // Season doesn't exist in database, create it
      const nameJsonb: MultiLanguageText | null = tmdbSeason.name
        ? { [language]: tmdbSeason.name }
        : null;
      const posterPathJsonb: MultiLanguageText | null = tmdbSeason.poster_path
        ? { [language]: tmdbSeason.poster_path }
        : null;
      const overviewJsonb: MultiLanguageText | null =
        tmdbSeason.overview && tmdbSeason.overview.trim() !== ''
          ? { [language]: tmdbSeason.overview }
          : null;

      await upsertSeason(
        {
          tv_tmdb_id: tvTmdbId,
          season_number: seasonNumber,
          tmdb_season_id: tmdbSeason.id,
          name: nameJsonb,
          poster_path: posterPathJsonb,
          overview: overviewJsonb,
          air_date: finalAirDate || undefined,
          vote_average: tmdbSeason.vote_average || null,
          episode_count: tmdbSeason.episode_count ?? undefined,
        },
        supabase
      );
    }

    return true;
  } catch (error) {
    // Log error but don't fail the request
    logError('[SeasonUpdate] Error updating season', error as Error, {
      tvTmdbId,
      seasonNumber,
    });
    return false;
  }
}

/**
 * Fetch English overview for a season when it's missing in current and primary language
 * Saves the English overview to the database with 'en-US' key
 *
 * @param tvTmdbId TV show TMDB ID
 * @param seasonNumber Season number
 * @param currentOverview Current overview (may be empty)
 * @param language Current user language
 * @param region User region
 * @param supabase Supabase client
 * @returns English overview if fetched, null otherwise
 */
export async function fetchSeasonOverviewEnglishFallback(
  tvTmdbId: number,
  seasonNumber: number,
  currentOverview: string | null | undefined,
  language: string,
  region: string | null | undefined,
  supabase: SupabaseClient
): Promise<string | null> {
  // Check if we need to fetch English overview
  const hasEmptyOverview = !currentOverview || currentOverview.trim() === '';

  if (!hasEmptyOverview) {
    return null;
  }

  // Determine primary language for region
  const primaryLanguage = region
    ? getPrimaryLanguageForRegion(region)
    : DEFAULT_LANGUAGE_ISO;
  const requestedLangCode = language.split('-')[0]?.toLowerCase() || '';
  const primaryLangCode = primaryLanguage.split('-')[0]?.toLowerCase() || '';

  // Check if we need English fallback:
  // 1. Overview is empty in current language
  // 2. And current language is primary language OR we already tried primary language and it's also empty
  // 3. And primary language is not English
  const isCurrentLanguagePrimary = requestedLangCode === primaryLangCode;
  const needsEnglishFallback =
    hasEmptyOverview &&
    (isCurrentLanguagePrimary || true) && // Always try English if overview is empty
    primaryLangCode !== 'en';

  if (!needsEnglishFallback) {
    return null;
  }

  try {
    const englishConfig = getTMDBConfig('en-US', region ?? undefined);
    const englishResponse = await $fetch<{
      overview?: string;
    }>(`${englishConfig.baseUrl}/tv/${tvTmdbId}/season/${seasonNumber}`, {
      query: {
        api_key: englishConfig.apiKey,
        language: englishConfig.language,
        region: englishConfig.region,
      },
    });

    if (englishResponse?.overview && englishResponse.overview.trim() !== '') {
      // Get current season data to preserve existing fields
      const { data: currentSeasonData } = await supabase
        .from(TABLES.SEASONS)
        .select('*')
        .eq(SEASONS_COLUMNS.TV_TMDB_ID, tvTmdbId)
        .eq(SEASONS_COLUMNS.SEASON_NUMBER, seasonNumber)
        .maybeSingle();

      const currentOverviewJsonb =
        safeGetMultiLanguageText(currentSeasonData?.overview) || {};
      const updatedOverviewJsonb: MultiLanguageText = {
        ...currentOverviewJsonb,
        'en-US': englishResponse.overview,
      };

      // Update season with English overview
      await upsertSeason(
        {
          tv_tmdb_id: tvTmdbId,
          season_number: seasonNumber,
          tmdb_season_id: currentSeasonData?.tmdb_season_id,
          overview: updatedOverviewJsonb,
          // Preserve other fields
          name: safeGetMultiLanguageText(currentSeasonData?.name),
          poster_path: safeGetMultiLanguageText(currentSeasonData?.poster_path),
          air_date: currentSeasonData?.air_date || undefined,
          vote_average: currentSeasonData?.vote_average || null,
          episode_count: currentSeasonData?.episode_count ?? undefined,
        },
        supabase
      );

      devLog(
        `[SeasonUpdate] Saved English overview for season ${seasonNumber} of TV ${tvTmdbId}`
      );

      return englishResponse.overview;
    }
  } catch (error) {
    // Log but don't fail the request
    logError('[SeasonUpdate] Error fetching English overview', error as Error, {
      tvTmdbId,
      seasonNumber,
    });
  }

  return null;
}
