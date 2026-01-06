/**
 * Video normalization and storage utilities
 * Normalizes TMDB video responses and merges with existing videos
 */

import type {
  TMDBVideo,
  Video,
  MultiLanguageVideos,
} from '@/types/Video';

/**
 * Normalize a single TMDB video to our internal format
 */
function normalizeVideo(tmdbVideo: TMDBVideo): Video {
  return {
    key: tmdbVideo.key,
    site: tmdbVideo.site,
    type: tmdbVideo.type,
    published_at: tmdbVideo.published_at,
    official: tmdbVideo.official,
  };
}

/**
 * Normalize videos from TMDB response and merge with existing videos
 * Merges by key to avoid duplicates
 * Groups by language from TMDB response
 */
export function normalizeVideosForStorage(
  tmdbVideos: TMDBVideo[],
  existingVideos: MultiLanguageVideos | null
): MultiLanguageVideos {
  const result: MultiLanguageVideos = existingVideos
    ? { ...existingVideos }
    : {};

  // Group videos by language
  const videosByLanguage: Record<string, Video[]> = {};

  for (const tmdbVideo of tmdbVideos) {
    const lang = tmdbVideo.iso_639_1?.toLowerCase() || 'en';
    const normalizedVideo = normalizeVideo(tmdbVideo);

    if (!videosByLanguage[lang]) {
      videosByLanguage[lang] = [];
    }

    // Check if video already exists (by key) to avoid duplicates
    const existingInLang = videosByLanguage[lang].find(
      (v) => v.key === normalizedVideo.key
    );
    if (!existingInLang) {
      videosByLanguage[lang].push(normalizedVideo);
    }
  }

  // Merge with existing videos by language
  for (const [lang, videos] of Object.entries(videosByLanguage)) {
    if (!result[lang]) {
      result[lang] = [];
    }

    // Merge videos, avoiding duplicates by key
    for (const video of videos) {
      const existing = result[lang].find((v) => v.key === video.key);
      if (!existing) {
        result[lang].push(video);
      }
    }
  }

  return result;
}

