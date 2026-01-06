/**
 * Fetch and cache videos for seasons
 * This endpoint should NOT be called directly from UI components
 * Always use through useVideos composable for consistency and proper error handling
 */

import { defineEventHandler, getRouterParams } from 'h3';
import { createClient } from '@supabase/supabase-js';
import { createError } from 'h3';
import { TABLES } from '@/constants/db/tables';
import { SEASONS_COLUMNS } from '@/constants/db/columns';
import { isPreRelease } from '@/utils/preRelease';
import { getVideoLanguageParam } from '@/server/utils/video-language';
import { fetchSeasonVideos } from '@/server/utils/tmdb-videos';
import { normalizeVideosForStorage } from '@/server/utils/video-normalization';
import { updateSeasonVideos } from '@/services/seasons';
import { VIDEO_REFRESH_THRESHOLD_HOURS } from '@/constants/domain/videos';
import { getUserTMDBParams } from '@/server/utils/user-preferences';
import type { MultiLanguageVideos } from '@/types/Video';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const { tvTmdbId, seasonNumber } = getRouterParams(event) as {
      tvTmdbId: string;
      seasonNumber: string;
    };

    const tvTmdbIdNum = parseInt(tvTmdbId, 10);
    const seasonNumberNum = parseInt(seasonNumber, 10);

    if (isNaN(tvTmdbIdNum) || isNaN(seasonNumberNum)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid TV TMDB ID or season number',
      });
    }

    // Get Supabase client
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;
    const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // Get user preferences for language
    const { language: userLanguage } = await getUserTMDBParams(event);

    // Get season from database (should exist from TV show sync, but handle missing case)
    const { data: season, error: dbError } = await supabase
      .from(TABLES.SEASONS)
      .select('*')
      .eq(SEASONS_COLUMNS.TV_TMDB_ID, tvTmdbIdNum)
      .eq(SEASONS_COLUMNS.SEASON_NUMBER, seasonNumberNum)
      .maybeSingle();

    if (dbError || !season) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Season not found',
      });
    }

    // Check if pre-release
    const preRelease = isPreRelease({
      air_date: season.air_date,
    });

    // Get existing videos
    const existingVideos = (season.videos as MultiLanguageVideos | null) || null;
    const videosUpdatedAt = season.videos_updated_at
      ? new Date(season.videos_updated_at)
      : null;

    // Determine if we need to fetch videos
    let shouldFetch = false;

    if (preRelease) {
      // Pre-release: check if videos_updated_at is null or older than threshold
      if (!videosUpdatedAt) {
        shouldFetch = true;
      } else {
        const hoursSinceUpdate =
          (Date.now() - videosUpdatedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceUpdate >= VIDEO_REFRESH_THRESHOLD_HOURS) {
          shouldFetch = true;
        }
      }
    } else {
      // Released: only fetch if videos is null (never fetched) or missing for current language
      if (!existingVideos) {
        shouldFetch = true;
      } else {
        // Check if we have videos for current language
        const langCode = userLanguage.split('-')[0]?.toLowerCase() || 'en';
        if (!existingVideos[langCode] || existingVideos[langCode].length === 0) {
          shouldFetch = true;
        }
      }
    }

    // Fetch videos from TMDB if needed
    if (shouldFetch) {
      const languageParam = getVideoLanguageParam();
      const { getTMDBConfig } = await import('@/server/utils/config');
      const tmdbConfig = getTMDBConfig(userLanguage, 'ES');

      const tmdbVideos = await fetchSeasonVideos(
        tvTmdbIdNum,
        seasonNumberNum,
        languageParam,
        tmdbConfig.apiKey,
        tmdbConfig.baseUrl
      );

      // Normalize and merge videos
      const normalizedVideos = normalizeVideosForStorage(
        tmdbVideos.results || [],
        existingVideos
      );

      // Update database (set to {} if empty, never leave as null after first fetch)
      await updateSeasonVideos(
        tvTmdbIdNum,
        seasonNumberNum,
        normalizedVideos,
        new Date(),
        supabase
      );

      // Update local reference
      const updatedVideos = normalizedVideos;
      const langCode = userLanguage.split('-')[0]?.toLowerCase() || 'en';

      // Return videos for current language with fallback
      const videosForLang =
        updatedVideos[langCode] ||
        updatedVideos['es'] ||
        updatedVideos['en'] ||
        Object.values(updatedVideos)[0] ||
        [];

      return videosForLang;
    }

    // Return existing videos for current language with fallback
    if (!existingVideos) {
      return [];
    }

    const langCode = userLanguage.split('-')[0]?.toLowerCase() || 'en';
    const videosForLang =
      existingVideos[langCode] ||
      existingVideos['es'] ||
      existingVideos['en'] ||
      Object.values(existingVideos)[0] ||
      [];

    return videosForLang;
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Error fetching season videos',
      data: error,
    });
  }
});

