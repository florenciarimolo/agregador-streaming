import { computed, watch } from 'vue';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { useRouteWithLang } from '@/composables/useRouteWithLang';

interface Genre {
  id: number;
  name: string;
}

interface GenresData {
  movie: { genres: Genre[] };
  tv: { genres: Genre[] };
}

interface AvailableGenre extends Genre {
  type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
}

/**
 * Composable to fetch and manage TMDB genres
 * Automatically includes the current language from URL
 * @param key - Unique key for useAsyncData cache (default: 'genres')
 * @param options - Options for useAsyncData
 */
export const useGenres = (
  key: string = 'genres',
  options?: {
    server?: boolean;
    immediate?: boolean;
  }
) => {
  const { lang } = useRouteWithLang();

  // Use base key - we'll clear cache and refresh when language changes
  const { data: genresData, refresh } = useAsyncData<GenresData>(
    key,
    async () => {
      const currentLang = lang.value;
      const [movieResponse, tvResponse] = await Promise.all([
        $fetch<{ genres: Genre[] }>(
          `/api/tmdb/genres?type=${MEDIA_TYPE.MOVIE}&lang=${currentLang}`
        ),
        $fetch<{ genres: Genre[] }>(
          `/api/tmdb/genres?type=${MEDIA_TYPE.TV}&lang=${currentLang}`
        ),
      ]);
      return { movie: movieResponse, tv: tvResponse };
    },
    {
      server: false,
      default: () => ({ movie: { genres: [] }, tv: { genres: [] } }),
      ...options,
    }
  );

  // Track the language that was used to fetch current data
  // Use useState to persist across component remounts
  const lastFetchedLangKey = `genres-last-lang-${key}`;
  const lastFetchedLang = useState<string | null>(lastFetchedLangKey, () => null);

  // Watch for language changes and clear cache + refresh
  // This ensures genres are reloaded with the new language
  // Watch lang.value explicitly to ensure reactivity
  watch(
    () => lang.value,
    async (newLang, oldLang) => {
      // Only refresh if language actually changed
      // Check both oldLang (for same-component updates) and lastFetchedLang (for remounts)
      const langChanged =
        (oldLang !== undefined && newLang !== oldLang) ||
        (lastFetchedLang.value !== null &&
          newLang !== lastFetchedLang.value);

      if (newLang && langChanged) {
        // Clear cache to force fresh fetch with new language
        await clearNuxtData(key);
        // Refresh will use the new language from lang.value
        await refresh();
        // Update lastFetchedLang after refresh
        lastFetchedLang.value = newLang;
      } else if (newLang && lastFetchedLang.value === null) {
        // First load - just track the language
        lastFetchedLang.value = newLang;
      }
    },
    { immediate: true } // Execute immediately to set initial lastFetchedLang
  );

  const availableGenres = computed<AvailableGenre[]>(() => {
    if (!genresData.value) return [];

    const allGenres: AvailableGenre[] = [];

    // Add movie genres
    const movieGenres = genresData.value.movie?.genres || [];
    movieGenres.forEach((g) => {
      if (g.name) {
        allGenres.push({ id: g.id, name: g.name, type: MEDIA_TYPE.MOVIE });
      }
    });

    // Add TV genres
    const tvGenres = genresData.value.tv?.genres || [];
    tvGenres.forEach((g) => {
      if (g.name) {
        allGenres.push({ id: g.id, name: g.name, type: MEDIA_TYPE.TV });
      }
    });

    // Sort: first by type (movie first, then tv), then alphabetically by name
    return allGenres
      .filter((genre) => genre.name)
      .sort((a, b) => {
        // First sort by type: movie comes before tv
        if (a.type !== b.type) {
          return a.type === MEDIA_TYPE.MOVIE ? -1 : 1;
        }
        // Then sort alphabetically by name
        return (a.name || '').localeCompare(b.name || '');
      });
  });

  return {
    genresData,
    availableGenres,
    refresh,
  };
};
