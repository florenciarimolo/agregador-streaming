/**
 * Fetch and cache videos for titles (movies and TV shows)
 * This endpoint should NOT be called directly from UI components
 * Always use through useVideos composable for consistency and proper error handling
 */

import { defineEventHandler, getRouterParams, getQuery } from 'h3';
import { createClient } from '@supabase/supabase-js';
import { createError } from 'h3';
import { TABLES } from '@/constants/db/tables';
import { TITLES_COLUMNS } from '@/constants/db/columns';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { isPreRelease } from '@/utils/preRelease';
import { getVideoLanguageParam } from '@/server/utils/video-language';
import {
  fetchMovieVideos,
  fetchTVShowVideos,
} from '@/server/utils/tmdb-videos';
import { normalizeVideosForStorage } from '@/server/utils/video-normalization';
import { updateTitleVideos } from '@/services/titles';
import { VIDEO_REFRESH_THRESHOLD_HOURS } from '@/constants/domain/videos';
import { getUserTMDBParams } from '@/server/utils/user-tmdb';
import type { MultiLanguageVideos } from '@/types/Video';
import { LanguageIsoCode, DEFAULT_LANGUAGE_ISO } from '@/constants/languages';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const { tmdbId } = getRouterParams(event) as { tmdbId: string };
    const query = getQuery(event);
    const type = query.type as typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;

    if (!type || (type !== 'movie' && type !== 'tv')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid type parameter. Must be "movie" or "tv"',
      });
    }

    const tmdbIdNum = parseInt(tmdbId, 10);
    if (isNaN(tmdbIdNum)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid TMDB ID',
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
    // If lang query parameter is provided, use it; otherwise use user language from URL
    const requestedLang = query.lang as string | undefined;
    const { language: userLanguage } = await getUserTMDBParams(event);
    const targetLanguage = requestedLang 
      ? `${requestedLang}-${userLanguage.split('-')[1] || 'ES'}` 
      : userLanguage;

    // Get title from database
    const { data: title, error: dbError } = await supabase
      .from(TABLES.TITLES)
      .select('*')
      .eq(TITLES_COLUMNS.TMDB_ID, tmdbIdNum)
      .eq(TITLES_COLUMNS.TYPE, type)
      .maybeSingle();

    if (dbError || !title) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Title not found',
      });
    }

    // Check if pre-release
    const preRelease = isPreRelease({
      release_date: title.release_date,
      first_air_date: title.first_air_date,
    });

    // Get existing videos
    const existingVideos = (title.videos as MultiLanguageVideos | null) || null;
    const videosUpdatedAt = title.videos_updated_at
      ? new Date(title.videos_updated_at)
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
        // Check if we have videos for target language
        const langCode = targetLanguage.split('-')[0]?.toLowerCase() || LanguageIsoCode.ENGLISH;
        if (!existingVideos[langCode] || existingVideos[langCode].length === 0) {
          shouldFetch = true;
        }
      }
    }

    // Fetch videos from TMDB if needed
    if (shouldFetch) {
      try {
        const languageParam = getVideoLanguageParam();
        const { getTMDBConfig } = await import('@/server/utils/config');
        const tmdbConfig = getTMDBConfig(targetLanguage, 'ES');

        let tmdbVideos;
        if (type === 'movie') {
          tmdbVideos = await fetchMovieVideos(
            tmdbIdNum,
            languageParam,
            tmdbConfig.apiKey,
            tmdbConfig.baseUrl
          );
        } else {
          tmdbVideos = await fetchTVShowVideos(
            tmdbIdNum,
            languageParam,
            tmdbConfig.apiKey,
            tmdbConfig.baseUrl
          );
        }

        // Validate TMDB response
        if (!tmdbVideos || typeof tmdbVideos !== 'object') {
          throw new Error('Invalid TMDB response: expected object');
        }

        // Normalize and merge videos
        const normalizedVideos = normalizeVideosForStorage(
          tmdbVideos.results || [],
          existingVideos
        );

        // Update database (set to {} if empty, never leave as null after first fetch)
        await updateTitleVideos(
          tmdbIdNum,
          type === 'movie' ? MEDIA_TYPE.MOVIE : MEDIA_TYPE.TV,
          normalizedVideos,
          new Date(),
          supabase as Parameters<typeof updateTitleVideos>[4] // Pass server-side Supabase client
        );

        // Update local reference
        const updatedVideos = normalizedVideos;
        const langCode = targetLanguage.split('-')[0]?.toLowerCase() || LanguageIsoCode.ENGLISH;

        // Return videos for target language with fallback
        const videosForLang =
          updatedVideos[langCode] ||
          updatedVideos[DEFAULT_LANGUAGE_ISO] ||
          updatedVideos[LanguageIsoCode.ENGLISH] ||
          Object.values(updatedVideos)[0] ||
          [];

        return videosForLang;
      } catch (fetchError: unknown) {
        // Log the actual error for debugging
        const error = fetchError as { message?: string; stack?: string; statusCode?: number; statusMessage?: string } | null;
        console.error('[videos.get] Error fetching videos from TMDB:', {
          tmdbId: tmdbIdNum,
          type,
          error: fetchError,
          message: error?.message,
          stack: error?.stack,
        });
        throw createError({
          statusCode: error?.statusCode || 500,
          statusMessage: error?.statusMessage || `Error fetching videos from TMDB: ${error?.message || 'Unknown error'}`,
          data: fetchError,
        });
      }
    }

    // Return existing videos for current language with fallback
    if (!existingVideos) {
      if (import.meta.dev) {
        console.log('[videos.get] No existing videos in database');
      }
      return [];
    }

    // Use target language if provided, otherwise use user language
    const langCode = targetLanguage.split('-')[0]?.toLowerCase() || LanguageIsoCode.ENGLISH;
    const videosForLang =
      existingVideos[langCode] ||
      existingVideos[DEFAULT_LANGUAGE_ISO] ||
      existingVideos[LanguageIsoCode.ENGLISH] ||
      Object.values(existingVideos)[0] ||
      [];

    if (import.meta.dev) {
      console.log('[videos.get] Returning existing videos:', {
        tmdbId: tmdbIdNum,
        type,
        requestedLang,
        targetLanguage,
        userLanguage,
        langCode,
        availableLanguages: Object.keys(existingVideos),
        videosForLangCount: videosForLang.length,
        videosForLang: videosForLang,
      });
    }

    return videosForLang;
  } catch (error: unknown) {
    // Log the actual error for debugging
    const errorObj = error as { message?: string; stack?: string; statusCode?: number; statusMessage?: string } | null;
    console.error('[videos.get] Unexpected error:', {
      tmdbId: tmdbIdNum,
      type,
      error,
      message: errorObj?.message,
      stack: errorObj?.stack,
      statusCode: errorObj?.statusCode,
      statusMessage: errorObj?.statusMessage,
    });
    
    // If error is already an H3 error, re-throw it
    if (errorObj?.statusCode && errorObj?.statusMessage) {
      throw error;
    }
    
    throw createError({
      statusCode: errorObj?.statusCode || 500,
      statusMessage: errorObj?.statusMessage || errorObj?.message || 'Error fetching videos',
      data: error,
    });
  }
});

