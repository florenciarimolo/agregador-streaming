import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import type { Movie } from '@/types/Movie';
import type { TVShow } from '@/types/TVShow';

/**
 * SEO Experience mapping based on TMDB genre IDs
 * Maps genre ID to experience descriptor (will be translated via i18n)
 */

// Movie genre ID → experience key
const MOVIE_GENRE_EXPERIENCE_MAP: Record<number, string> = {
  28: 'seo.experience.intenseAndDynamic', // Action
  12: 'seo.experience.entertainingAndAdventurous', // Adventure
  16: 'seo.experience.lightAndEasy', // Animation
  35: 'seo.experience.lightToUnwind', // Comedy
  80: 'seo.experience.intenseAndDark', // Crime
  99: 'seo.experience.reflective', // Documentary
  18: 'seo.experience.intenseAndEmotional', // Drama
  10751: 'seo.experience.forAllAudiences', // Family
  14: 'seo.experience.immersive', // Fantasy
  36: 'seo.experience.reflectiveAndPaced', // History
  27: 'seo.experience.intenseAndDisturbing', // Horror
  10402: 'seo.experience.emotional', // Music
  9648: 'seo.experience.intriguing', // Mystery
  10749: 'seo.experience.emotionalAndRelaxed', // Romance
  878: 'seo.experience.stimulating', // Science Fiction
  10770: 'seo.experience.easyToWatch', // TV Movie
  53: 'seo.experience.tenseAndAbsorbing', // Thriller
  10752: 'seo.experience.intenseAndDramatic', // War
  37: 'seo.experience.classicAndPaced', // Western
};

// TV Show genre ID → experience key
const TV_GENRE_EXPERIENCE_MAP: Record<number, string> = {
  10759: 'seo.experience.intenseAndAdventurous', // Action & Adventure
  16: 'seo.experience.lightAndEasyToFollow', // Animation
  35: 'seo.experience.lightToUnwind', // Comedy
  80: 'seo.experience.darkAndAbsorbing', // Crime
  99: 'seo.experience.reflective', // Documentary
  18: 'seo.experience.intenseRequiresAttention', // Drama
  10751: 'seo.experience.forAllAudiences', // Family
  10762: 'seo.experience.easyToWatchForKids', // Kids
  9648: 'seo.experience.intriguingAndDemanding', // Mystery
  10763: 'seo.experience.informative', // News
  10764: 'seo.experience.easyToWatch', // Reality
  10765: 'seo.experience.immersive', // Sci-Fi & Fantasy
  10766: 'seo.experience.emotional', // Soap
  10767: 'seo.experience.lightAndConversational', // Talk
  10768: 'seo.experience.intenseAndReflective', // War & Politics
  37: 'seo.experience.classicAndPaced', // Western
};

/**
 * Get SEO experience descriptor based on media type and genres
 * Uses the first genre as dominant
 * @param type - Media type (movie or tv)
 * @param genres - Array of genre objects with id property
 * @returns i18n key for the experience descriptor, or fallback key
 */
export function getSeoExperience(
  type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv,
  genres?: Array<{ id: number }> | null
): string {
  // Use first genre as dominant
  const dominantGenreId = genres && genres.length > 0 ? genres[0].id : null;

  if (!dominantGenreId) {
    return 'seo.experience.fallback';
  }

  // Select appropriate map based on type
  const experienceMap =
    type === MediaTypeEnum.movie ? MOVIE_GENRE_EXPERIENCE_MAP : TV_GENRE_EXPERIENCE_MAP;

  // Return experience key or fallback
  return experienceMap[dominantGenreId] || 'seo.experience.fallback';
}

/**
 * Get SEO experience for a Movie
 */
export function getMovieSeoExperience(movie: Movie | null | undefined): string {
  if (!movie) {
    return 'seo.experience.fallback';
  }
  return getSeoExperience(MediaTypeEnum.movie, movie.genres);
}

/**
 * Get SEO experience for a TV Show
 */
export function getTVShowSeoExperience(tvShow: TVShow | null | undefined): string {
  if (!tvShow) {
    return 'seo.experience.fallback';
  }
  return getSeoExperience(MediaTypeEnum.tv, tvShow.genres);
}

