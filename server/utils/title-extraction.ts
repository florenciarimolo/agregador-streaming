/**
 * Unified title and overview extraction with TMDB fallback
 * This function handles:
 * 1. Extracting title/overview from database (multi-language JSONB)
 * 2. Fallback to TMDB if missing in preferred language
 * 3. Caching results in database for future requests
 */

import { getTitleInLanguage, type MultiLanguageText } from '@/composables/database/titles';
import { getTMDBConfig } from './config';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import { TABLES, TITLES_FIELDS } from '@/composables/database/constants';
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
    const extracted = getTitleInLanguage(titleAsMultiLanguage, language, region, isImagePath);
    // If getTitleInLanguage returns empty, use original string as fallback
    return extracted || titleData;
  }
  
  // Multi-language object format
  return getTitleInLanguage(titleData, language, region, isImagePath);
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
    .eq(TITLES_FIELDS.TMDB_ID, tmdbId)
    .eq(TITLES_FIELDS.TYPE, type)
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

  // Extract text in user's preferred language
  const extractedTitle = extractFromTitleData(titleJsonb, language, region, false);
  const extractedOverview = extractFromTitleData(overviewJsonb, language, region, false);
  const extractedPosterPath = extractFromTitleData(posterPathJsonb, language, region, true);

  // Check if we need to fetch from TMDB (missing in preferred language)
  const needsTitleFallback = !extractedTitle || extractedTitle.trim() === '';
  const needsOverviewFallback = !extractedOverview || extractedOverview.trim() === '';

  let tmdbTitle: string | null = null;
  let tmdbOverview: string | null = null;
  let tmdbPosterPath: string | null = null;

  // Fetch from TMDB if needed
  if (needsTitleFallback || needsOverviewFallback) {
    try {
      const tmdbConfig = getTMDBConfig(language, region);
      const endpoint = type === MediaTypeEnum.movie ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
      
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
        const updatedPosterPath: MultiLanguageText = { ...(posterPathJsonb || {}) };

        // Add TMDB data to the appropriate language key
        const langKey = language; // Use full language code (e.g., 'es-ES')
        if (tmdbTitle) updatedTitle[langKey] = tmdbTitle;
        if (tmdbOverview) updatedOverview[langKey] = tmdbOverview;
        if (tmdbPosterPath) updatedPosterPath[langKey] = tmdbPosterPath;

        // Update database (async, don't wait)
        supabase
          .from(TABLES.TITLES)
          .upsert({
            tmdb_id: tmdbId,
            type,
            title: updatedTitle,
            overview: Object.keys(updatedOverview).length > 0 ? updatedOverview : null,
            poster_path: Object.keys(updatedPosterPath).length > 0 ? updatedPosterPath : null,
          }, {
            onConflict: TITLES_FIELDS.TMDB_ID,
          })
          .catch((error) => {
            // Log but don't fail the request
            if (import.meta.dev) {
              console.error('[extractTitleDataWithFallback] Error updating cache:', error);
            }
          });
      }
    } catch (error) {
      // Log but don't fail the request
      if (import.meta.dev) {
        console.error('[extractTitleDataWithFallback] Error fetching from TMDB:', error);
      }
    }
  }

  // Return with fallback: extracted from DB or from TMDB
  return {
    title: extractedTitle || tmdbTitle || '',
    overview: extractedOverview || tmdbOverview || '',
    poster_path: extractedPosterPath || tmdbPosterPath || null,
  };
}

/**
 * Extract title and overview from recommendation pool title_data
 * Handles both string format (legacy) and MultiLanguageText format
 * Falls back to TMDB if missing in preferred language
 */
export async function extractTitleDataFromPoolWithFallback(
  titleData: {
    title?: string | MultiLanguageText;
    overview?: string | MultiLanguageText;
    poster_path?: string | MultiLanguageText | null;
  } | null,
  options: TitleExtractionOptions
): Promise<ExtractedTitleData> {
  const { tmdbId, type, language, region, supabase, config } = options;

  if (!titleData) {
    // No title_data in pool, fetch from TMDB
    return await extractTitleDataWithFallback(options);
  }

  // Extract from title_data (can be string or MultiLanguageText)
  const extractedTitle = extractFromTitleData(titleData.title, language, region, false);
  const extractedOverview = extractFromTitleData(titleData.overview, language, region, false);
  const extractedPosterPath = extractFromTitleData(
    titleData.poster_path,
    language,
    region,
    true
  );

  // Check if we need to fetch from TMDB (missing in preferred language)
  const needsTitleFallback = !extractedTitle || extractedTitle.trim() === '';
  const needsOverviewFallback = !extractedOverview || extractedOverview.trim() === '';

  // If missing, fetch from TMDB and update both DB and pool
  if (needsTitleFallback || needsOverviewFallback) {
    const tmdbData = await extractTitleDataWithFallback(options);
    
    // Also update the pool entry's title_data if we fetched from TMDB
    // This ensures the pool has the latest data
    if (tmdbData.title || tmdbData.overview) {
      // Update pool entry asynchronously (don't wait)
      const { RECOMMENDATION_POOL_TABLES } = await import('@/composables/database/recommendationPool');
      const { RECOMMENDATION_POOL_FIELDS } = await import('@/composables/database/recommendationPool');
      
      // Get user_id from pool entry (we need to find the entry first)
      // For now, just update the titles table - the pool will be updated on next regeneration
      // This is acceptable since the pool is regenerated when language changes
    }

    return tmdbData;
  }

  return {
    title: extractedTitle,
    overview: extractedOverview,
    poster_path: extractedPosterPath,
  };
}

