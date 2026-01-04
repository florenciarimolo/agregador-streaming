/**
 * Unified title and overview extraction with TMDB fallback
 * This function handles:
 * 1. Extracting title/overview from database (multi-language JSONB)
 * 2. Fallback to TMDB if missing in preferred language
 * 3. Caching results in database for future requests
 */

import { getTitleInLanguage, type MultiLanguageText } from '@/services/titles';
import { getTMDBConfig } from './config';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import {
  PROFILES_COLUMNS,
  USER_PREFERENCES_COLUMNS,
  TITLES_COLUMNS,
} from '@/constants/db/columns';
import { TABLES } from '@/constants/db/tables';
import { SCORE_WEIGHTS } from '@/constants/domain/scoring';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ExtractedTitleData {
  title: string;
  overview: string;
  poster_path: string | null;
}

export interface TitleExtractionOptions {
  tmdbId: number;
  type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
  language: string; // User's preferred language (e.g., 'es-ES', 'ca-ES')
  region: string; // User's region (e.g., 'ES')
  supabase: SupabaseClient;
  config: {
    public: {
      supabaseUrl: string;
      supabaseAnonKey: string;
    };
  };
}

/**
 * Extract title and overview from multi-language JSONB or string
 * Handles both string format (legacy) and MultiLanguageText format
 */
function extractFromTitleData(
  titleData: string | MultiLanguageText | null | undefined,
  language: string,
  region: string | null,
  isImagePath: boolean = false
): string {
  if (!titleData) return '';

  if (typeof titleData === 'string') {
    // Legacy format: string - convert to multi-language object
    const titleAsMultiLanguage: MultiLanguageText = {
      [language]: titleData,
    };
    const extracted = getTitleInLanguage(
      titleAsMultiLanguage,
      language,
      region,
      isImagePath
    );
    // If getTitleInLanguage returns empty, use original string as fallback
    return extracted || titleData;
  }

  // Multi-language object format
  return getTitleInLanguage(titleData, language, region, isImagePath);
}

/**
 * Fetch overview with fallback to primary language of region
 * If overview is empty, tries to fetch from TMDB using the primary language of the region
 * @param overview Initial overview (may be empty)
 * @param tmdbId TMDB ID of the title
 * @param type Type of media (movie or tv)
 * @param language Requested language (e.g., 'ca-ES')
 * @param region User's region (e.g., 'ES')
 * @param endpoint TMDB API endpoint (e.g., '/movie/123' or '/tv/456')
 * @param mergedOverviewJsonb JSONB object to update with primary language overview if found
 * @param supabase Supabase client for database updates
 * @returns Final overview (original or from primary language fallback)
 */
export async function fetchOverviewWithPrimaryLanguageFallback(
  overview: string,
  tmdbId: number,
  type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv,
  language: string,
  region: string | null,
  endpoint: string,
  mergedOverviewJsonb: MultiLanguageText,
  supabase: SupabaseClient
): Promise<string> {
  // If overview is not empty, return it
  if (overview && overview.trim() !== '') {
    return overview;
  }

  // Try fetching with primary language of region as fallback
  try {
    const { getPrimaryLanguageForRegion } =
      await import('@/utils/language-detection');
    const { DEFAULT_LANGUAGE_ISO } = await import('@/constants/languages');

    const primaryLanguage = region
      ? getPrimaryLanguageForRegion(region)
      : DEFAULT_LANGUAGE_ISO;
    const primaryLanguageKey = `${primaryLanguage}-${region?.toUpperCase() || 'ES'}`;
    const requestedLangCode = language.split('-')[0]?.toLowerCase() || '';
    const primaryLangCode = primaryLanguage.split('-')[0]?.toLowerCase() || '';

    // Only fetch primary language if it's different from requested language
    if (requestedLangCode !== primaryLangCode) {
      const primaryTmdbConfig = getTMDBConfig(primaryLanguageKey, region);
      const primaryResponse = await $fetch<{
        overview?: string;
      }>(`${primaryTmdbConfig.baseUrl}${endpoint}`, {
        query: {
          api_key: primaryTmdbConfig.apiKey,
          language: primaryTmdbConfig.language,
          region: primaryTmdbConfig.region,
        },
      });

      if (primaryResponse?.overview) {
        // Update database with primary language overview
        mergedOverviewJsonb[primaryLanguageKey] = primaryResponse.overview;

        // Update database (async, don't wait)
        supabase
          .from(TABLES.TITLES)
          .upsert(
            {
              tmdb_id: tmdbId,
              type,
              overview:
                Object.keys(mergedOverviewJsonb).length > 0
                  ? mergedOverviewJsonb
                  : null,
            },
            {
              onConflict: TITLES_COLUMNS.TMDB_ID,
            }
          )
          .then(() => {
            // Success - no action needed
          })
          .catch((error) => {
            // Log but don't fail the request
            if (import.meta.dev) {
              console.error(
                '[fetchOverviewWithPrimaryLanguageFallback] Error updating cache with primary language:',
                error
              );
            }
          });

        if (import.meta.dev) {
          console.log(
            `[fetchOverviewWithPrimaryLanguageFallback] Using primary language (${primaryLanguageKey}) overview for ${tmdbId} as fallback`
          );
        }

        return primaryResponse.overview;
      }
    }
  } catch (primaryError) {
    // Log but don't fail the request
    if (import.meta.dev) {
      console.error(
        '[fetchOverviewWithPrimaryLanguageFallback] Error fetching primary language overview:',
        primaryError
      );
    }
  }

  // Return empty string if no fallback found
  return overview || '';
}

/**
 * Extract title and overview with fallback to TMDB
 * Returns extracted text in user's preferred language, with fallback to TMDB if missing
 * Updates database cache with TMDB data when fetched
 */
export async function extractTitleDataWithFallback(
  options: TitleExtractionOptions
): Promise<ExtractedTitleData> {
  const { tmdbId, type, language, region, supabase, config } = options;

  // Get title from database
  const { data: titleFromDb, error: dbError } = await supabase
    .from(TABLES.TITLES)
    .select('*')
    .eq(TITLES_COLUMNS.TMDB_ID, tmdbId)
    .eq(TITLES_COLUMNS.TYPE, type)
    .maybeSingle();

  let titleJsonb: MultiLanguageText | null = null;
  let overviewJsonb: MultiLanguageText | null = null;
  let posterPathJsonb: MultiLanguageText | null = null;

  // If found in DB, extract from JSONB
  if (titleFromDb && !dbError) {
    titleJsonb = titleFromDb.title as MultiLanguageText;
    overviewJsonb = titleFromDb.overview as MultiLanguageText | null;
    posterPathJsonb = titleFromDb.poster_path as MultiLanguageText | null;
  }

  // Check if the requested language exists in the JSONB (explicit check, no fallbacks)
  // IMPORTANT: We need to check if the exact language exists, not rely on getTitleInLanguage
  // which may return fallbacks. This ensures we fetch from TMDB when the language is missing.
  const hasExactLanguage =
    titleJsonb &&
    typeof titleJsonb === 'object' &&
    titleJsonb[language] !== undefined;
  const hasExactOverviewLanguage =
    overviewJsonb &&
    typeof overviewJsonb === 'object' &&
    overviewJsonb[language] !== undefined;

  // Extract text in user's preferred language (may return fallback if language missing)
  const extractedTitle = extractFromTitleData(
    titleJsonb,
    language,
    region,
    false
  );
  const extractedOverview = extractFromTitleData(
    overviewJsonb,
    language,
    region,
    false
  );
  const extractedPosterPath = extractFromTitleData(
    posterPathJsonb,
    language,
    region,
    true
  );

  // Check if we need to fetch from TMDB
  // IMPORTANT: Check if exact language exists, not just if extractFromTitleData returns something
  // (extractFromTitleData may return fallbacks, which we don't want)
  const needsTitleFallback =
    !hasExactLanguage || !extractedTitle || extractedTitle.trim() === '';
  const needsOverviewFallback =
    !hasExactOverviewLanguage ||
    !extractedOverview ||
    extractedOverview.trim() === '';

  let tmdbTitle: string | null = null;
  let tmdbOverview: string | null = null;
  let tmdbPosterPath: string | null = null;

  // Fetch from TMDB if needed
  if (needsTitleFallback || needsOverviewFallback) {
    try {
      const tmdbConfig = getTMDBConfig(language, region);
      const endpoint =
        type === MediaTypeEnum.movie ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;

      const tmdbResponse = await $fetch<{
        title?: string;
        name?: string;
        overview?: string;
        poster_path?: string | null;
      }>(`${tmdbConfig.baseUrl}${endpoint}`, {
        query: {
          api_key: tmdbConfig.apiKey,
          language: tmdbConfig.language,
          region: tmdbConfig.region,
        },
      });

      if (tmdbResponse) {
        tmdbTitle = tmdbResponse.title || tmdbResponse.name || null;
        tmdbOverview = tmdbResponse.overview || null;
        tmdbPosterPath = tmdbResponse.poster_path || null;

        // Update database with TMDB data for caching
        // Build updated multi-language JSONB objects
        const updatedTitle: MultiLanguageText = { ...(titleJsonb || {}) };
        const updatedOverview: MultiLanguageText = { ...(overviewJsonb || {}) };
        const updatedPosterPath: MultiLanguageText = {
          ...(posterPathJsonb || {}),
        };

        // Add TMDB data to the appropriate language key
        const langKey = language; // Use full language code (e.g., 'es-ES')
        if (tmdbTitle) updatedTitle[langKey] = tmdbTitle;
        if (tmdbOverview) updatedOverview[langKey] = tmdbOverview;
        if (tmdbPosterPath) updatedPosterPath[langKey] = tmdbPosterPath;

        // If overview is still empty, try fetching with primary language of region as fallback
        if (needsOverviewFallback) {
          tmdbOverview = await fetchOverviewWithPrimaryLanguageFallback(
            tmdbOverview || '',
            tmdbId,
            type,
            language,
            region,
            endpoint,
            updatedOverview,
            supabase
          );
        }

        // Update database (async, don't wait)
        supabase
          .from(TABLES.TITLES)
          .upsert(
            {
              tmdb_id: tmdbId,
              type,
              title: updatedTitle,
              overview:
                Object.keys(updatedOverview).length > 0
                  ? updatedOverview
                  : null,
              poster_path:
                Object.keys(updatedPosterPath).length > 0
                  ? updatedPosterPath
                  : null,
            },
            {
              onConflict: TITLES_COLUMNS.TMDB_ID,
            }
          )
          .then(() => {
            // Success - no action needed
          })
          .catch((error) => {
            // Log but don't fail the request
            if (import.meta.dev) {
              console.error(
                '[extractTitleDataWithFallback] Error updating cache:',
                error
              );
            }
          });
      }
    } catch (error) {
      // Log but don't fail the request
      if (import.meta.dev) {
        console.error(
          '[extractTitleDataWithFallback] Error fetching from TMDB:',
          error
        );
      }
    }
  }

  // Return data: use extracted if exact language exists, otherwise use TMDB result
  // If overview is empty, use getTitleInLanguage which will provide fallback to primary language
  const finalOverview =
    hasExactOverviewLanguage && extractedOverview
      ? extractedOverview
      : tmdbOverview ||
        (overviewJsonb
          ? extractFromTitleData(overviewJsonb, language, region, false)
          : '');

  return {
    title: hasExactLanguage ? extractedTitle : tmdbTitle || '',
    overview: finalOverview,
    poster_path: hasExactLanguage
      ? extractedPosterPath
      : tmdbPosterPath || null,
  };
}

/**
 * @deprecated This function is no longer needed as title_data has been removed from recommendation_pool.
 * Title data is now fetched from the titles table when recommendations are requested.
 * Use extractTitleDataWithFallback instead, which fetches from titles table or TMDB.
 */
export async function extractTitleDataFromPoolWithFallback(
  _titleData: {
    title?: string | MultiLanguageText;
    overview?: string | MultiLanguageText;
    poster_path?: string | MultiLanguageText | null;
  } | null,
  options: TitleExtractionOptions
): Promise<ExtractedTitleData> {
  // title_data has been removed from recommendation_pool
  // Always fetch from titles table or TMDB
  return await extractTitleDataWithFallback(options);
}
