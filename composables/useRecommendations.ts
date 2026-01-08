import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useSupabaseUser } from '#imports';
import { useUserStore } from '@/stores/user';
import { getSession } from '@/services/auth';
import { QUERY_PARAMS } from '@/constants/api/queryParams';
import type { Recommendation } from '@/types/Recommendation';
import { getUrlCodeFromI18nCode } from '@/composables/useLangFromUrl';
import { getCurrentLangUrlCode } from '@/composables/useRouteWithLang';
import { toTMDBLanguageCode, LanguageIsoCode } from '@/constants/languages';

/**
 * Composable for managing recommendations
 * Handles fetching, filtering, and state management for recommendations
 */
export const useRecommendations = () => {
  const route = useRoute();
  const { locale } = useI18n();
  const user = useSupabaseUser();

  // Safely get userStore - it may not be available immediately after Pinia initialization
  // Use a computed to lazy-load the store, but only on client side
  const userStore = computed(() => {
    // Only try to get store on client side
    if (import.meta.server) {
      return {
        profile: null,
        hasCompletedOnboarding: false,
      };
    }

    try {
      return useUserStore();
    } catch (error) {
      // If store is not available, return a fallback object
      if (process.env.NODE_ENV === 'development') {
        console.warn('[useRecommendations] useUserStore not available:', error);
      }
      return {
        profile: null,
        hasCompletedOnboarding: false,
      };
    }
  });

  // State
  const recommendations = ref<Recommendation[]>([]);
  const allRecommendations = ref<Recommendation[]>([]);
  const loading = ref(false);
  const hasAttemptedLoad = ref(false);
  const selectedContentType = ref<'all' | 'movie' | 'tv'>('all');

  // Skeleton loading state with delay
  const showSkeleton = ref(false);
  let skeletonTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Watch loading to show skeleton after delay
  watch(loading, (isLoading) => {
    if (isLoading) {
      if (skeletonTimeoutId) {
        clearTimeout(skeletonTimeoutId);
      }
      skeletonTimeoutId = setTimeout(() => {
        if (loading.value) {
          showSkeleton.value = true;
        }
      }, 600);
    } else {
      if (skeletonTimeoutId) {
        clearTimeout(skeletonTimeoutId);
        skeletonTimeoutId = null;
      }
      showSkeleton.value = false;
    }
  });

  // Track recommendations view to update scores
  const trackRecommendationsView = async (
    recommendations: Recommendation[]
  ): Promise<void> => {
    if (!recommendations || recommendations.length === 0) {
      return;
    }

    if (!user.value || !userStore.value?.hasCompletedOnboarding) {
      return;
    }

    try {
      const {
        data: { session },
        error: sessionError,
      } = await getSession();

      if (sessionError || !session?.access_token) {
        return;
      }

      const tmdbIds = recommendations
        .map((rec) => rec.tmdb_id)
        .filter((id): id is number => typeof id === 'number' && id > 0);

      if (tmdbIds.length === 0) {
        return;
      }

      $fetch('/api/recommendations/track-view', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { tmdb_ids: tmdbIds },
      }).catch((error) => {
        if (import.meta.dev) {
          console.warn(
            '[TrackView] Error tracking recommendations view:',
            error
          );
        }
      });
    } catch (error) {
      if (import.meta.dev) {
        console.warn('[TrackView] Error tracking recommendations view:', error);
      }
    }
  };

  // Fetch recommendations function
  const fetchRecommendations = async (
    languageOverride?: string,
    preserveIds?: Array<{ tmdb_id: number; type: 'movie' | 'tv' }>
  ): Promise<Recommendation[]> => {
    if (!user.value || !userStore.value?.hasCompletedOnboarding) {
      return [];
    }

    loading.value = true;
    try {
      const {
        data: { session },
        error: sessionError,
      } = await getSession();

      if (sessionError) {
        console.error('Error getting session:', sessionError);
        return [];
      }

      if (!session || !session.access_token) {
        return [];
      }

      // Get mood, attention, and content type from query params
      const query = route.query;
      const queryParams: Record<string, string> = {};
      if (query.mood) queryParams[QUERY_PARAMS.MOOD] = query.mood as string;
      if (query.attention)
        queryParams[QUERY_PARAMS.ATTENTION] = query.attention as string;
      // Send content type to server when not 'all' (server-side filtering)
      if (selectedContentType.value !== 'all') {
        queryParams[QUERY_PARAMS.TYPE] = selectedContentType.value;
      }
      // If language override is provided, use it (for language changes)
      // Otherwise, the endpoint will get language from URL automatically
      if (languageOverride) {
        queryParams.lang = languageOverride;
      }
      // If preserveIds is provided, pass them to maintain order when changing language
      if (preserveIds && preserveIds.length > 0) {
        // Format: "tmdb_id:type,tmdb_id:type" (e.g., "123:movie,456:tv")
        queryParams[QUERY_PARAMS.PRESERVE_IDS] = preserveIds
          .map((item) => `${item.tmdb_id}:${item.type}`)
          .join(',');
      }

      const data = await $fetch<Recommendation[]>('/api/recommendations', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
        query: queryParams,
      });

      // Ensure it's an array
      const fetched = Array.isArray(data) ? data : [];

      // Track view after fetching recommendations
      if (fetched.length > 0) {
        trackRecommendationsView(fetched);
      }

      return fetched;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    } finally {
      loading.value = false;
    }
  };

  // Filter recommendations by content type and update recommendations
  const filterRecommendationsByType = () => {
    if (selectedContentType.value === 'all') {
      recommendations.value = allRecommendations.value;
    } else {
      recommendations.value = allRecommendations.value.filter(
        (rec) => rec.type === selectedContentType.value
      );
    }
  };

  // Watch for content type changes to filter recommendations
  watch(selectedContentType, () => {
    if (allRecommendations.value.length > 0) {
      filterRecommendationsByType();
    }
  });

  // Watch for query param changes (mood/attention) to refetch recommendations
  watch(
    () => [route.query[QUERY_PARAMS.MOOD], route.query[QUERY_PARAMS.ATTENTION]],
    async () => {
      // Only refetch if user is logged in and has completed onboarding
      if (
        user.value &&
        userStore.value?.hasCompletedOnboarding &&
        hasAttemptedLoad.value
      ) {
        const fetched = await fetchRecommendations();
        allRecommendations.value = fetched;
        filterRecommendationsByType();
      }
    }
  );

  // Watch for app language changes and refresh recommendations
  watch(
    () => locale.value,
    async (newLocale, oldLocale) => {
      // Only refresh if language actually changed and user is authenticated
      if (
        newLocale &&
        oldLocale &&
        newLocale !== oldLocale &&
        user.value &&
        userStore.value?.hasCompletedOnboarding &&
        hasAttemptedLoad.value
      ) {
        if (import.meta.dev) {
          console.log(
            '[useRecommendations] Language changed, refreshing recommendations with new language:',
            {
              oldLocale,
              newLocale,
            }
          );
        }

        // Convert i18n locale code to URL language code
        // Handle both formats: 'gl-ES' (full) and 'gl' (short)
        let urlLangCode = getUrlCodeFromI18nCode(newLocale);

        // If conversion failed, try normalizing the locale first
        // Some locales might be in short format (e.g., 'gl' instead of 'gl-ES')
        if (!urlLangCode) {
          // Use toTMDBLanguageCode to normalize legacy codes to TMDB format
          // This function handles both 'gl' -> 'gl-ES' and 'en' -> 'en-US' conversions
          const normalizedLocale = toTMDBLanguageCode(newLocale);
          urlLangCode = getUrlCodeFromI18nCode(normalizedLocale);
        }

        // If still no conversion, fallback to current URL language code
        if (!urlLangCode) {
          const currentUrlLang = getCurrentLangUrlCode(route);
          if (currentUrlLang) {
            urlLangCode = currentUrlLang;
            if (import.meta.dev) {
              console.warn(
                '[useRecommendations] Could not convert locale to URL code, using current URL language:',
                {
                  locale: newLocale,
                  fallback: urlLangCode,
                }
              );
            }
          } else {
            console.error(
              '[useRecommendations] Could not determine language code, skipping refresh:',
              newLocale
            );
            return;
          }
        }

        // Save current recommendation IDs and order before refreshing
        // This ensures we show the same recommendations in the same order, just with new language data
        const currentIds = allRecommendations.value.map((rec) => ({
          tmdb_id: rec.tmdb_id,
          type: rec.type,
        }));

        if (import.meta.dev) {
          console.log(
            '[useRecommendations] Preserving recommendation order:',
            currentIds.length,
            'titles'
          );
        }

        // Refresh recommendations with new language
        // Pass the language and IDs to maintain the same order
        // The endpoint will return the same recommendations in the same order with data in the new language
        // Keep existing recommendations visible while loading to avoid showing empty state
        // Only update once new data is loaded
        try {
          const fetched = await fetchRecommendations(
            urlLangCode,
            currentIds.length > 0 ? currentIds : undefined
          );
          // Only update if we got results, otherwise keep existing recommendations
          if (fetched && fetched.length > 0) {
            allRecommendations.value = fetched;
            filterRecommendationsByType();
          } else if (import.meta.dev) {
            console.warn(
              '[useRecommendations] No recommendations returned, keeping existing ones'
            );
          }
        } catch (error) {
          console.error(
            '[useRecommendations] Error refreshing recommendations with new language:',
            error
          );
          // On error, keep existing recommendations visible
        }
      }
    },
    { immediate: false }
  );

  // Initial fetch when user is available
  watch(
    () => [user.value, userStore.value?.hasCompletedOnboarding],
    async ([newUser, hasCompleted]) => {
      if (newUser && hasCompleted && !hasAttemptedLoad.value) {
        const fetched = await fetchRecommendations();
        allRecommendations.value = fetched;
        filterRecommendationsByType();
        hasAttemptedLoad.value = true;

        // If no recommendations and onboarding is complete, regenerate pool automatically
        if (
          fetched.length === 0 &&
          hasCompleted &&
          !sessionStorage.getItem('generatingRecommendations')
        ) {
          const {
            data: { session: sessionForPool },
          } = await getSession();

          if (sessionForPool?.access_token) {
            sessionStorage.setItem('generatingRecommendations', 'true');
            try {
              await $fetch(
                '/api/recommendations/populate-pool?clearPool=true',
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${sessionForPool.access_token}`,
                  },
                }
              );
              // After generation, fetch recommendations again
              const newFetched = await fetchRecommendations();
              allRecommendations.value = newFetched;
              filterRecommendationsByType();
            } catch (error) {
              console.error(
                '[useRecommendations] Error regenerating pool:',
                error
              );
            } finally {
              sessionStorage.removeItem('generatingRecommendations');
            }
          }
        }
      } else if (!newUser) {
        // Clear recommendations when user logs out
        recommendations.value = [];
        allRecommendations.value = [];
        hasAttemptedLoad.value = false;
      }
    },
    { immediate: true }
  );

  // Computed: Check if recommendations are empty
  const isEmpty = computed(() => {
    return recommendations.value.length === 0 && !loading.value;
  });

  return {
    recommendations,
    allRecommendations,
    loading,
    showSkeleton,
    selectedContentType,
    isEmpty,
    hasAttemptedLoad,
    fetchRecommendations,
    filterRecommendationsByType,
  };
};
