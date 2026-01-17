/**
 * Videos composable
 * This is the ONLY way UI components should access videos
 * Never call video endpoints directly from components
 */

import {
  VIDEO_SITE_YOUTUBE,
  VIDEO_TYPE_TRAILER,
  VIDEO_TYPE_RECAP,
} from '@/constants/domain/videos';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import type { Video } from '@/types/Video';
import { getPrimaryLanguageForRegion } from '@/utils/language-detection';
import { useUserRegion } from '@/composables/useUserRegion';
import { useCurrentLanguage } from '@/composables/useCurrentLanguage';
import { LanguageIsoCode, DEFAULT_LANGUAGE_ISO } from '@/constants/languages';
import { useLogger } from '@/composables/useLogger';

/**
 * Get videos for a title (movie or TV show) with language fallback
 * Fallback order: current language → region primary language → English (if region primary is not English)
 */
export async function getVideosForTitle(
  tmdbId: number,
  type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV
): Promise<Video[] | null> {
  try {
    const { currentLanguage } = useCurrentLanguage();
    const { getUserRegion } = useUserRegion();

    // Get current language code (base code, e.g., 'es' from 'es-ES')
    const currentLangCode =
      currentLanguage.value.code.split('-')[0]?.toLowerCase() ||
      DEFAULT_LANGUAGE_ISO;

    // Get user region for fallback
    const userRegion = await getUserRegion();
    const regionPrimaryLang = getPrimaryLanguageForRegion(userRegion);
    const regionPrimaryLangCode =
      regionPrimaryLang.split('-')[0]?.toLowerCase() || DEFAULT_LANGUAGE_ISO;

    // Determine fallback languages
    const fallbackLanguages: string[] = [currentLangCode];

    // Add region primary language if different from current
    if (regionPrimaryLangCode !== currentLangCode) {
      fallbackLanguages.push(regionPrimaryLangCode);
    }

    // Add English if region primary is not English
    if (regionPrimaryLangCode !== LanguageIsoCode.ENGLISH) {
      fallbackLanguages.push(LanguageIsoCode.ENGLISH);
    }

    // Development-only logging removed - use proper logging if needed for production

    // Try each language in fallback order
    // We need to check if there are videos of type Trailer or Recap after filtering
    let allVideos: Video[] = [];
    const triedLanguages: string[] = [];

    for (const langCode of fallbackLanguages) {
      try {
        const videos = await $fetch<Video[]>(`/api/titles/${tmdbId}/videos`, {
          query: { type, lang: langCode },
        });

        triedLanguages.push(langCode);

        if (videos && videos.length > 0) {
          // Filter to YouTube only and official videos for rendering
          const youtubeVideos = videos.filter(
            (video) =>
              video.site === VIDEO_SITE_YOUTUBE && video.official === true
          );

          if (youtubeVideos.length > 0) {
            // Check if there are videos of type Trailer or Recap
            // This is the key: we need videos that will be shown after type filtering
            const trailersOrRecaps = youtubeVideos.filter(
              (video) =>
                video.type === VIDEO_TYPE_TRAILER ||
                video.type === VIDEO_TYPE_RECAP
            );

            if (trailersOrRecaps.length > 0) {
              // Found videos that will be displayed, use all YouTube videos
              allVideos = youtubeVideos;
              break; // Found videos, stop trying other languages
            }
          }
        }
      } catch {
        // Continue to next language - error is recoverable (fallback to next language)
        const { logWarn } = useLogger();
        logWarn('[Videos] Error fetching videos for language, trying next', {
          langCode,
        });
      }
    }

    if (allVideos.length === 0) {
      const { logWarn } = useLogger();
      logWarn('[Videos] No videos found in any language', {
        triedLanguages: triedLanguages.join(', '),
      });
      return null;
    }

    // Sort by published_at descending
    allVideos.sort((a, b) => {
      const dateA = new Date(a.published_at).getTime();
      const dateB = new Date(b.published_at).getTime();
      return dateB - dateA;
    });

    return allVideos;
  } catch (error) {
    const { logError } = useLogger();
    logError('[Videos] Error getting videos for title', error as Error, {
      tmdbId,
      type,
    });
    return null;
  }
}

/**
 * Get videos for a season
 */
export async function getVideosForSeason(
  tvTmdbId: number,
  seasonNumber: number
): Promise<Video[] | null> {
  try {
    const videos = await $fetch<Video[]>(
      `/api/seasons/${tvTmdbId}/${seasonNumber}/videos`
    );

    // Filter to YouTube only and official videos for rendering
    const youtubeVideos = videos.filter(
      (video) => video.site === VIDEO_SITE_YOUTUBE && video.official === true
    );

    // Sort by published_at descending
    youtubeVideos.sort((a, b) => {
      const dateA = new Date(a.published_at).getTime();
      const dateB = new Date(b.published_at).getTime();
      return dateB - dateA;
    });

    return youtubeVideos.length > 0 ? youtubeVideos : null;
  } catch (error) {
    const { logError } = useLogger();
    logError('[Videos] Error getting videos for season', error as Error, {
      tvTmdbId,
      seasonNumber,
    });
    return null;
  }
}

/**
 * Filter videos by type
 */
export function filterVideosByType(
  videos: Video[] | null,
  type: typeof VIDEO_TYPE_TRAILER | typeof VIDEO_TYPE_RECAP
): Video[] {
  if (!videos) return [];
  return videos.filter((video) => video.type === type);
}
