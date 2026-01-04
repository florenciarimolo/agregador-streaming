import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useSupabaseUser } from '#imports';
import { useUserStore } from '@/stores/user';
import { getSession } from '@/services/auth';
import type { Recommendation } from '@/types/Recommendation';

/**
 * Composable for managing recommendations
 * Handles fetching, filtering, and state management for recommendations
 */
export const useRecommendations = () => {
  const route = useRoute();
  const { locale } = useI18n();
  const user = useSupabaseUser();
  const userStore = useUserStore();

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

    if (!user.value || !userStore.hasCompletedOnboarding) {
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
        credentials: 'include',
        body: { tmdb_ids: tmdbIds },
      }).catch((error) => {
        if (import.meta.dev) {
          console.warn('[TrackView] Error tracking recommendations view:', error);
        }
      });
    } catch (error) {
      if (import.meta.dev) {
        console.warn('[TrackView] Error tracking recommendations view:', error);
      }
    }
  };

  // Fetch recommendations function
  const fetchRecommendations = async (): Promise<Recommendation[]> => {
    if (!user.value || !userStore.hasCompletedOnboarding) {
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
      if (query.mood) queryParams.mood = query.mood as string;
      if (query.attention) queryParams.attention = query.attention as string;
      // Send content type to server when not 'all' (server-side filtering)
      if (selectedContentType.value !== 'all') {
        queryParams.type = selectedContentType.value;
      }

      const data = await $fetch<Recommendation[]>('/api/recommendations', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
        credentials: 'include',
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
    () => [route.query.mood, route.query.attention],
    async () => {
      // Only refetch if user is logged in and has completed onboarding
      if (
        user.value &&
        userStore.hasCompletedOnboarding &&
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
        userStore.hasCompletedOnboarding &&
        hasAttemptedLoad.value
      ) {
        if (import.meta.dev) {
          console.log(
            '[useRecommendations] Language changed, updating pool language and refreshing recommendations:',
            {
              oldLocale,
              newLocale,
            }
          );
        }

        // Update title_data in recommendation pool with new language
        try {
          const {
            data: { session },
          } = await getSession();
          if (session?.access_token) {
            await $fetch<{ success: boolean; updated: number }>(
              `/api/recommendations/update-pool-language?language=${encodeURIComponent(newLocale)}`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              }
            );
            if (import.meta.dev) {
              console.log(
                '[useRecommendations] Pool language updated successfully'
              );
            }
          }
        } catch (poolError) {
          console.error('[useRecommendations] Error updating pool language:', poolError);
        }

        // Refresh recommendations with new language
        const fetched = await fetchRecommendations();
        allRecommendations.value = fetched;
        filterRecommendationsByType();
      }
    },
    { immediate: false }
  );

  // Initial fetch when user is available
  watch(
    () => [user.value, userStore.hasCompletedOnboarding],
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
              await $fetch('/api/recommendations/populate-pool?clearPool=true', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${sessionForPool.access_token}`,
                },
              });
              // After generation, fetch recommendations again
              const newFetched = await fetchRecommendations();
              allRecommendations.value = newFetched;
              filterRecommendationsByType();
            } catch (error) {
              console.error('[useRecommendations] Error regenerating pool:', error);
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

