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
import { getTitleInLanguage } from './titles';
import { getPrimaryLanguageForRegion } from '@/utils/language-detection';

/**
 * Extract season text fields (name, poster_path, overview) from JSONB with language fallback
 * Handles primary language fallback when requested language is not primary
 */
function extractSeasonTextFields(
  nameJsonb: MultiLanguageText | null,
  posterPathJsonb: MultiLanguageText | null,
  overviewJsonb: MultiLanguageText | null,
  language: string | undefined,
  userRegion: string | null | undefined
): {
  name: string;
  posterPath: string | null;
  overview: string;
} {
  let name = '';
  let posterPath: string | null = null;
  let overview = '';

  if (language) {
    // First try to get values in requested language
    name = getTitleInLanguage(nameJsonb, language, userRegion);
    posterPath = getTitleInLanguage(
      posterPathJsonb,
      language,
      userRegion,
      true // isImagePath
    );
    overview = getTitleInLanguage(overviewJsonb, language, userRegion);

    // If name is empty/null and requested language is not primary language of region,
    // fallback to primary language of region
    if (!name && userRegion) {
      const primaryLanguage = getPrimaryLanguageForRegion(userRegion);
      const primaryLanguageKey = `${primaryLanguage}-${userRegion.toUpperCase()}`;
      const requestedLangCode = language.split('-')[0]?.toLowerCase() || '';
      const primaryLangCode = primaryLanguage.split('-')[0]?.toLowerCase() || '';

      // Only use primary language fallback if requested language is not primary
      if (requestedLangCode !== primaryLangCode) {
        name = getTitleInLanguage(nameJsonb, primaryLanguageKey, userRegion);
        // Also try poster_path in primary language if not found
        if (!posterPath) {
          posterPath = getTitleInLanguage(
            posterPathJsonb,
            primaryLanguageKey,
            userRegion,
            true // isImagePath
          );
        }
        // Also try overview in primary language if not found
        if (!overview) {
          overview = getTitleInLanguage(overviewJsonb, primaryLanguageKey, userRegion);
        }
      }
    }

    // Final fallback: if overview is still empty, try English
    // This happens when overview is empty in current language and primary language
    if (!overview && overviewJsonb) {
      const englishOverview = getTitleInLanguage(overviewJsonb, 'en-US', userRegion);
      if (englishOverview) {
        overview = englishOverview;
      }
    }
  } else {
    // If no language provided, try to get first available value (for backward compatibility)
    if (posterPathJsonb && typeof posterPathJsonb === 'object') {
      const firstKey = Object.keys(posterPathJsonb)[0];
      if (firstKey) {
        posterPath = posterPathJsonb[firstKey] || null;
      }
    }
    if (overviewJsonb && typeof overviewJsonb === 'object') {
      const firstKey = Object.keys(overviewJsonb)[0];
      if (firstKey) {
        overview = overviewJsonb[firstKey] || '';
      }
    }
  }

  return { name, posterPath, overview };
}

/**
 * Get season by TV TMDB ID and season number
 */
export async function getSeasonByTmdbIds(
  tvTmdbId: number,
  seasonNumber: number,
  supabaseClient: SupabaseClient,
  language?: string,
  userRegion?: string | null
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

  // Extract name, poster_path, and overview from JSONB if language provided
  const nameJsonb = data.name as MultiLanguageText | null;
  const posterPathJsonb = data.poster_path as MultiLanguageText | null;
  const overviewJsonb = data.overview as MultiLanguageText | null;

  const { name, posterPath, overview } = extractSeasonTextFields(
    nameJsonb,
    posterPathJsonb,
    overviewJsonb,
    language,
    userRegion
  );

  // Map database row to Season type
  return {
    id: data.tmdb_season_id,
    name,
    season_number: data.season_number,
    overview,
    air_date: data.air_date || '',
    poster_path: posterPath,
    vote_average: data.vote_average || 0,
    episode_count: data.episode_count || undefined,
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
    name?: MultiLanguageText | null;
    air_date?: string | null;
    poster_path?: MultiLanguageText | string | null;
    vote_average?: number | null;
    overview?: MultiLanguageText | null;
    episode_count?: number | null;
  },
  supabaseClient: SupabaseClient
): Promise<Season | null> {
  // Handle poster_path: accept MultiLanguageText (JSONB) or null
  // String values should be converted to MultiLanguageText by caller
  const posterPathJsonb: MultiLanguageText | null =
    seasonData.poster_path &&
    typeof seasonData.poster_path === 'object' &&
    !Array.isArray(seasonData.poster_path) &&
    Object.keys(seasonData.poster_path).length > 0
      ? (seasonData.poster_path as MultiLanguageText)
      : null;

  const { data, error } = await supabaseClient
    .from(TABLES.SEASONS)
    .upsert(
      {
        [SEASONS_COLUMNS.TV_TMDB_ID]: seasonData.tv_tmdb_id,
        [SEASONS_COLUMNS.SEASON_NUMBER]: seasonData.season_number,
        [SEASONS_COLUMNS.TMDB_SEASON_ID]: seasonData.tmdb_season_id,
        [SEASONS_COLUMNS.NAME]:
          seasonData.name && Object.keys(seasonData.name).length > 0
            ? seasonData.name
            : null,
        [SEASONS_COLUMNS.AIR_DATE]: seasonData.air_date || null,
        [SEASONS_COLUMNS.POSTER_PATH]: posterPathJsonb,
        [SEASONS_COLUMNS.VOTE_AVERAGE]: seasonData.vote_average || null,
        [SEASONS_COLUMNS.OVERVIEW]:
          seasonData.overview && Object.keys(seasonData.overview).length > 0
            ? seasonData.overview
            : null,
        [SEASONS_COLUMNS.EPISODE_COUNT]: seasonData.episode_count ?? null,
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
    name: '', // Will be extracted from JSONB by caller
    season_number: data.season_number,
    overview: '', // Will be extracted from JSONB by caller
    air_date: data.air_date || '',
    poster_path: data.poster_path || null,
    vote_average: data.vote_average || 0,
    episode_count: data.episode_count || undefined,
  };
}

/**
 * Get all seasons for a TV show from database
 */
export async function getSeasonsByTvTmdbId(
  tvTmdbId: number,
  supabaseClient: SupabaseClient,
  language?: string,
  userRegion?: string | null
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
  return data.map((row) => {
    // Extract name, poster_path, and overview from JSONB if language provided
    const nameJsonb = row.name as MultiLanguageText | null;
    const posterPathJsonb = row.poster_path as MultiLanguageText | null;
    const overviewJsonb = row.overview as MultiLanguageText | null;

    const { name, posterPath, overview } = extractSeasonTextFields(
      nameJsonb,
      posterPathJsonb,
      overviewJsonb,
      language,
      userRegion
    );

    return {
      id: row.tmdb_season_id,
      name,
      season_number: row.season_number,
      overview,
      air_date: row.air_date || '',
      poster_path: posterPath,
      vote_average: row.vote_average || 0,
      episode_count: row.episode_count || undefined,
    };
  });
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

