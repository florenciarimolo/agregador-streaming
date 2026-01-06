/**
 * Videos composable
 * This is the ONLY way UI components should access videos
 * Never call video endpoints directly from components
 */

import { VIDEO_SITE_YOUTUBE, VIDEO_TYPE_TRAILER, VIDEO_TYPE_RECAP } from '@/constants/domain/videos';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import type { Video } from '@/types/Video';
import { getPrimaryLanguageForRegion } from '@/utils/language-detection';
import { useUserRegion } from '@/composables/useUserRegion';
import { useCurrentLanguage } from '@/composables/useCurrentLanguage';

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
    const currentLangCode = currentLanguage.value.code.split('-')[0]?.toLowerCase() || 'es';
    
    // Get user region for fallback
    const userRegion = await getUserRegion();
    const regionPrimaryLang = getPrimaryLanguageForRegion(userRegion);
    const regionPrimaryLangCode = regionPrimaryLang.split('-')[0]?.toLowerCase() || 'es';
    
    // Determine fallback languages
    const fallbackLanguages: string[] = [currentLangCode];
    
    // Add region primary language if different from current
    if (regionPrimaryLangCode !== currentLangCode) {
      fallbackLanguages.push(regionPrimaryLangCode);
    }
    
    // Add English if region primary is not English
    if (regionPrimaryLangCode !== 'en') {
      fallbackLanguages.push('en');
    }

    if (import.meta.dev) {
      console.log('[getVideosForTitle] Language fallback order:', {
        tmdbId,
        type,
        currentLang: currentLangCode,
        region: userRegion,
        regionPrimaryLang: regionPrimaryLangCode,
        fallbackOrder: fallbackLanguages,
      });
    }

    // Try each language in fallback order
    // We need to check if there are videos of type Trailer or Recap after filtering
    let allVideos: Video[] = [];
    let triedLanguages: string[] = [];

    for (const langCode of fallbackLanguages) {
      try {
        const videos = await $fetch<Video[]>(`/api/titles/${tmdbId}/videos`, {
          query: { type, lang: langCode },
        });

        triedLanguages.push(langCode);

        if (videos && videos.length > 0) {
          // Filter to YouTube only for rendering
          const youtubeVideos = videos.filter(
            (video) => video.site === VIDEO_SITE_YOUTUBE
          );

          if (youtubeVideos.length > 0) {
            // Check if there are videos of type Trailer or Recap
            // This is the key: we need videos that will be shown after type filtering
            const trailersOrRecaps = youtubeVideos.filter(
              (video) => video.type === VIDEO_TYPE_TRAILER || video.type === VIDEO_TYPE_RECAP
            );

            if (trailersOrRecaps.length > 0) {
              // Found videos that will be displayed, use all YouTube videos
              allVideos = youtubeVideos;
              if (import.meta.dev) {
                console.log('[getVideosForTitle] Found videos with Trailer/Recap in language:', {
                  langCode,
                  total: videos.length,
                  youtube: youtubeVideos.length,
                  trailersOrRecaps: trailersOrRecaps.length,
                });
              }
              break; // Found videos, stop trying other languages
            } else if (import.meta.dev) {
              console.log('[getVideosForTitle] Found videos but no Trailer/Recap in language:', {
                langCode,
                total: videos.length,
                youtube: youtubeVideos.length,
                types: youtubeVideos.map((v) => v.type),
              });
            }
          }
        }
      } catch (error) {
        if (import.meta.dev) {
          console.warn(`[getVideosForTitle] Error fetching videos for language ${langCode}:`, error);
        }
        // Continue to next language
      }
    }

    if (allVideos.length === 0) {
      if (import.meta.dev) {
        console.warn('[getVideosForTitle] No videos found in any language:', {
          triedLanguages,
        });
      }
      return null;
    }

    // Sort by published_at descending
    allVideos.sort((a, b) => {
      const dateA = new Date(a.published_at).getTime();
      const dateB = new Date(b.published_at).getTime();
      return dateB - dateA;
    });

    if (import.meta.dev) {
      console.log('[getVideosForTitle] Final videos:', {
        count: allVideos.length,
        types: allVideos.map((v) => v.type),
      });
    }

    return allVideos;
  } catch (error) {
    console.error('[getVideosForTitle] Error:', error);
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

    // Filter to YouTube only for rendering
    const youtubeVideos = videos.filter(
      (video) => video.site === VIDEO_SITE_YOUTUBE
    );

    // Sort by published_at descending
    youtubeVideos.sort((a, b) => {
      const dateA = new Date(a.published_at).getTime();
      const dateB = new Date(b.published_at).getTime();
      return dateB - dateA;
    });

    return youtubeVideos.length > 0 ? youtubeVideos : null;
  } catch (error) {
    console.error('[getVideosForSeason] Error:', error);
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

