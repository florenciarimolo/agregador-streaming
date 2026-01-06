/**
 * TMDB video fetching service
 * Fetches videos from TMDB API for movies, TV shows, and seasons
 */

import { getTMDBConfig } from './config';
import type { TMDBVideoResponse } from '@/types/Video';

/**
 * Fetch videos for a movie
 */
export async function fetchMovieVideos(
  tmdbId: number,
  languageParam: string,
  apiKey: string,
  baseUrl: string
): Promise<TMDBVideoResponse> {
  const response = await $fetch<TMDBVideoResponse>(
    `${baseUrl}/movie/${tmdbId}/videos`,
    {
      query: {
        api_key: apiKey,
        include_video_language: languageParam,
      },
    }
  );

  return response;
}

/**
 * Fetch videos for a TV show
 */
export async function fetchTVShowVideos(
  tmdbId: number,
  languageParam: string,
  apiKey: string,
  baseUrl: string
): Promise<TMDBVideoResponse> {
  const response = await $fetch<TMDBVideoResponse>(
    `${baseUrl}/tv/${tmdbId}/videos`,
    {
      query: {
        api_key: apiKey,
        include_video_language: languageParam,
      },
    }
  );

  return response;
}

/**
 * Fetch videos for a season
 */
export async function fetchSeasonVideos(
  tvTmdbId: number,
  seasonNumber: number,
  languageParam: string,
  apiKey: string,
  baseUrl: string
): Promise<TMDBVideoResponse> {
  const response = await $fetch<TMDBVideoResponse>(
    `${baseUrl}/tv/${tvTmdbId}/season/${seasonNumber}/videos`,
    {
      query: {
        api_key: apiKey,
        include_video_language: languageParam,
      },
    }
  );

  return response;
}

