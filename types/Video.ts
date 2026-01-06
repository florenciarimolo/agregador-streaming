/**
 * Video types for TMDB API and internal use
 */

/**
 * Video from TMDB API response
 */
export type TMDBVideo = {
  iso_639_1: string; // Language code (e.g., 'es', 'en', 'ca')
  iso_3166_1: string; // Country code (e.g., 'ES', 'US')
  name: string;
  key: string; // YouTube video ID
  site: string; // Usually 'YouTube'
  size: number;
  type: string; // 'Trailer', 'Recap', 'Teaser', etc.
  official: boolean;
  published_at: string; // ISO date string
};

/**
 * TMDB videos API response
 */
export type TMDBVideoResponse = {
  id: number;
  results: TMDBVideo[];
};

/**
 * Normalized video for storage and display
 */
export type Video = {
  key: string;
  site: string;
  type: string;
  published_at: string;
  official: boolean;
};

/**
 * Multi-language videos structure (JSONB in database)
 * Key: language code (e.g., 'es', 'ca', 'en')
 * Value: array of videos
 */
export type MultiLanguageVideos = {
  [lang: string]: Video[];
};

