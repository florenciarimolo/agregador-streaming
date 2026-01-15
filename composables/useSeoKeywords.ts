import { computed, type ComputedRef } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Movie } from '@/types/Movie';
import type { TVShow, Season } from '@/types/TVShow';
import type { DiscoverList } from '@/composables/database/discoverLists';
import type { Genre } from '@/types/Genre';

/**
 * Generate SEO keywords for home page
 */
export function useHomeKeywords() {
  const { t } = useI18n();
  const seoKeywords = computed(() => t('seo.keywords.home'));
  return { seoKeywords };
}

/**
 * Generate SEO keywords for discover page
 */
export function useDiscoverKeywords() {
  const { t } = useI18n();
  const seoKeywords = computed(() => t('seo.keywords.discover'));
  return { seoKeywords };
}

/**
 * Generate SEO keywords for a discover list
 */
export function useDiscoverListKeywords(
  list: ComputedRef<DiscoverList | null>
) {
  const { t } = useI18n();

  const seoKeywords = computed(() => {
    const listValue = list.value;
    if (!listValue) {
      return t('seo.keywords.discover');
    }

    const baseKeywords = t('seo.keywords.discoverListBase').split(', ');

    // Extract keywords from title (lowercase, remove special chars)
    const titleKeywords = listValue.title
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word: string) => word.length > 3)
      .slice(0, 5); // Limit to 5 words from title

    // Add type-specific keywords
    const typeKeywords =
      listValue.type === 'movie'
        ? t('seo.keywords.discoverListTypeMovie').split(', ')
        : listValue.type === 'tv'
          ? t('seo.keywords.discoverListTypeTv').split(', ')
          : t('seo.keywords.discoverListTypeMixed').split(', ');

    return [...baseKeywords, ...titleKeywords, ...typeKeywords].join(', ');
  });

  return { seoKeywords };
}

/**
 * Generate SEO keywords for a movie
 */
export function useMovieKeywords(movie: ComputedRef<Movie | null>) {
  const { t } = useI18n();

  const seoKeywords = computed(() => {
    const movieValue = movie.value;
    if (!movieValue) {
      return t('seo.keywords.movieBase');
    }

    const keywords: string[] = [];

    // Add base keywords
    keywords.push(...t('seo.keywords.movieBase').split(', '));

    // Add movie title
    keywords.push(movieValue.title);

    // Add genres
    if (movieValue.genres && movieValue.genres.length > 0) {
      const genreNames = movieValue.genres.map((g: Genre) =>
        g.name.toLowerCase()
      );
      keywords.push(...genreNames);
    }

    // Add year if available
    if (movieValue.release_date) {
      const year = new Date(movieValue.release_date).getFullYear();
      const yearKeywords = t('seo.keywords.movieYear', { year })
        .split(', ')
        .map((k) => k.trim());
      keywords.push(...yearKeywords);
    }

    // Add streaming-related keywords
    keywords.push(...t('seo.keywords.movieStreaming').split(', '));

    // Add original title if different
    if (
      movieValue.original_title &&
      movieValue.original_title !== movieValue.title
    ) {
      keywords.push(movieValue.original_title);
    }

    return keywords.join(', ');
  });

  return { seoKeywords };
}

/**
 * Generate SEO keywords for a TV show
 */
export function useTVShowKeywords(tvShow: ComputedRef<TVShow | null>) {
  const { t } = useI18n();

  const seoKeywords = computed(() => {
    const tvShowValue = tvShow.value;
    if (!tvShowValue) {
      return t('seo.keywords.tvShowBase');
    }

    const keywords: string[] = [];

    // Add base keywords
    keywords.push(...t('seo.keywords.tvShowBase').split(', '));

    // Add TV show name
    keywords.push(tvShowValue.name);

    // Add genres
    if (tvShowValue.genres && tvShowValue.genres.length > 0) {
      const genreNames = tvShowValue.genres.map((g: Genre) =>
        g.name.toLowerCase()
      );
      keywords.push(...genreNames);
    }

    // Add year if available
    if (tvShowValue.first_air_date) {
      const year = new Date(tvShowValue.first_air_date).getFullYear();
      const yearKeywords = t('seo.keywords.tvShowYear', { year })
        .split(', ')
        .map((k) => k.trim());
      keywords.push(...yearKeywords);
    }

    // Add seasons info
    if (tvShowValue.number_of_seasons) {
      const seasonsKeyword = t('seo.keywords.tvShowSeasons', {
        count: tvShowValue.number_of_seasons,
      });
      keywords.push(seasonsKeyword);
    }

    // Add streaming-related keywords
    keywords.push(...t('seo.keywords.tvShowStreaming').split(', '));

    // Add original name if different
    if (
      tvShowValue.original_name &&
      tvShowValue.original_name !== tvShowValue.name
    ) {
      keywords.push(tvShowValue.original_name);
    }

    return keywords.join(', ');
  });

  return { seoKeywords };
}

/**
 * Generate SEO keywords for a TV season
 */
export function useSeasonKeywords(
  season: ComputedRef<Season | null>,
  tvShow: ComputedRef<TVShow | null>
) {
  const { t } = useI18n();

  const seoKeywords = computed(() => {
    const seasonValue = season.value;
    const tvShowValue = tvShow.value;
    if (!seasonValue || !tvShowValue) {
      return t('seo.keywords.seasonBase');
    }

    const keywords: string[] = [];

    // Add base keywords
    keywords.push(...t('seo.keywords.seasonBase').split(', '));

    // Add season name and TV show name
    keywords.push(seasonValue.name, tvShowValue.name);

    // Add season number
    if (seasonValue.season_number !== undefined) {
      const seasonNumberKeywords = [
        t('seo.keywords.seasonNumber', { number: seasonValue.season_number }),
        t('seo.keywords.seasonNumberWithShow', {
          number: seasonValue.season_number,
          showName: tvShowValue.name,
        }),
      ];
      keywords.push(...seasonNumberKeywords);
    }

    // Add episode count if available
    if (seasonValue.episode_count) {
      const episodesKeyword = t('seo.keywords.seasonEpisodes', {
        count: seasonValue.episode_count,
      });
      keywords.push(episodesKeyword);
    }

    // Add genres from parent show
    if (tvShowValue.genres && tvShowValue.genres.length > 0) {
      const genreNames = tvShowValue.genres.map((g: Genre) =>
        g.name.toLowerCase()
      );
      keywords.push(...genreNames);
    }

    // Add year if available
    if (seasonValue.air_date) {
      const year = new Date(seasonValue.air_date).getFullYear();
      const yearKeyword = t('seo.keywords.seasonYear', { year });
      keywords.push(yearKeyword);
    }

    // Add streaming-related keywords
    keywords.push(...t('seo.keywords.seasonStreaming').split(', '));

    return keywords.join(', ');
  });

  return { seoKeywords };
}
