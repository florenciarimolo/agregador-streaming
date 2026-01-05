import { ref, type Ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useSupabaseUser } from '#imports';
import { useUserStore } from '@/stores/user';
import { getSession } from '@/services/auth';
import { getUserLikedTitle } from '@/services/userTitleStatus';
import { useUndoToast } from '@/composables/useUndoToast';
import { QUERY_PARAMS } from '@/constants/api/queryParams';
import type { Recommendation } from '@/types/Recommendation';
import { TITLE_STATUS } from '@/constants/domain/titleStatus';

// Helper function to safely get user ID from Supabase user object
type SupabaseUserWithSub = {
  id?: string;
  sub?: string;
  [key: string]: unknown;
};

function getUserId(
  user: SupabaseUserWithSub | null | undefined
): string | undefined {
  return user?.id || user?.sub;
}

/**
 * Composable for handling title actions (like, seen, watchlist, etc.)
 */
export const useTitleActions = (
  recommendations: Ref<Recommendation[]>,
  allRecommendations: Ref<Recommendation[]>,
  filterRecommendationsByType: () => void,
  fetchRecommendations: () => Promise<Recommendation[]>
) => {
  const router = useRouter();
  const route = useRoute();
  const { t } = useI18n();
  const user = useSupabaseUser();
  
  // Safely get userStore - it may not be available immediately after Pinia initialization
  // Only get it when needed (client-side only)
  const getUserStore = () => {
    if (process.server) {
      return null;
    }
    try {
      return useUserStore();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[useTitleActions] useUserStore not available:', error);
      }
      return null;
    }
  };
  
  const { showToast } = useUndoToast();

  const loadingTitles = ref<Set<number>>(new Set());
  const fetchingReplacement = ref(false);

  // Handle marking a title with different statuses
  const handleTitleStatus = async (
    title: Recommendation,
    status: TitleStatus,
    liked: boolean = false
  ) => {
    loadingTitles.value.add(title.tmdb_id);

    let originalTitleIndex = -1;
    let originalInWatchlist: boolean | undefined = undefined;

    try {
      const {
        data: { session },
      } = await getSession();

      if (!session?.access_token) {
        return;
      }

      // Store original state for rollback
      originalTitleIndex = recommendations.value.findIndex(
        (r: Recommendation) => r.tmdb_id === title.tmdb_id
      );
      if (originalTitleIndex !== -1 && status === TITLE_STATUS.WATCHLIST) {
        originalInWatchlist =
          recommendations.value[originalTitleIndex].in_watchlist;
      }

      // Update status in backend
      const response = await $fetch('/api/users/title-status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          tmdb_id: title.tmdb_id,
          type: title.type,
          status,
          liked,
        },
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('[handleTitleStatus] Success:', { status, response });
      }

      // Show toast with appropriate message and action based on status
      if (status === TITLE_STATUS.NOT_INTERESTED) {
        showToast(
          t('home.titleMarkedNotInterested', { title: title.title }),
          {
            label: t('undo.undo'),
            variant: 'secondary',
            action: async () => {
              await $fetch('/api/users/title-status', {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
                query: {
                  tmdb_id: title.tmdb_id,
                },
              });
              await fetchRecommendations();
            },
          },
          7000
        );
      } else if (status === TITLE_STATUS.SEEN) {
        showToast(t('home.titleMarkedSeen', { title: title.title }), {
          label: t('home.viewSeen'),
          variant: 'secondary',
          action: async () => {
            await router.push('/lists?tab=seen');
          },
        }, 5000);
      } else if (status === TITLE_STATUS.WATCHLIST) {
        showToast(t('home.titleSavedWatchlist', { title: title.title }), {
          label: t('home.viewList'),
          variant: 'secondary',
          action: async () => {
            await router.push('/watchlist');
          },
        }, 5000);
      }

      // Remove from UI and get replacement
      const removedIndex = allRecommendations.value.findIndex(
        (r: Recommendation) => r.tmdb_id === title.tmdb_id
      );

      if (removedIndex !== -1) {
        allRecommendations.value = allRecommendations.value.filter(
          (r: Recommendation) => r.tmdb_id !== title.tmdb_id
        );

        fetchingReplacement.value = true;
        try {
          const queryParams: Record<string, string> = {
            excluded_tmdb_id: title.tmdb_id.toString(),
            excluded_type: title.type,
          };
          if (route.query[QUERY_PARAMS.MOOD]) queryParams[QUERY_PARAMS.MOOD] = route.query[QUERY_PARAMS.MOOD] as string;
          if (route.query[QUERY_PARAMS.ATTENTION])
            queryParams[QUERY_PARAMS.ATTENTION] = route.query[QUERY_PARAMS.ATTENTION] as string;

          const replacement = await $fetch<Recommendation | null>(
            '/api/recommendations/replacement',
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              credentials: 'include',
              query: queryParams,
            }
          );

          if (replacement) {
            allRecommendations.value.push(replacement);
          }
          filterRecommendationsByType();
        } catch (error) {
          console.error('[handleTitleStatus] Error fetching replacement:', error);
          filterRecommendationsByType();
        } finally {
          fetchingReplacement.value = false;
        }
      } else {
        filterRecommendationsByType();
      }
    } catch (error) {
      // Rollback optimistic update if error occurred
      if (originalTitleIndex !== -1) {
        if (status === TITLE_STATUS.WATCHLIST) {
          recommendations.value[originalTitleIndex] = {
            ...recommendations.value[originalTitleIndex],
            in_watchlist: originalInWatchlist,
          };
        } else {
          const originalTitle = allRecommendations.value.find(
            (r) => r.tmdb_id === title.tmdb_id
          );
          if (!originalTitle) {
            allRecommendations.value.push(title);
            filterRecommendationsByType();
          }
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.error('[handleTitleStatus] Error:', error);
      }
      const errorMessage =
        status === TITLE_STATUS.WATCHLIST
          ? t('home.errorSavingWatchlist', { title: title.title })
          : status === TITLE_STATUS.SEEN
            ? t('home.errorMarkingSeen', { title: title.title })
            : t('home.errorUpdatingStatus', { title: title.title });
      showToast(errorMessage, null, 3000);
    } finally {
      loadingTitles.value.delete(title.tmdb_id);
    }
  };

  // Handle marking as liked (implies seen, removes from watchlist)
  const handleMarkLiked = async (title: Recommendation) => {
    loadingTitles.value.add(title.tmdb_id);

    try {
      const {
        data: { session },
      } = await getSession();

      if (!session?.access_token) {
        return;
      }

      const userId = getUserId(user.value);
      if (!userId) {
        return;
      }

      // Check if title is already liked
      const { data: likedTitle } = await getUserLikedTitle(
        userId,
        title.tmdb_id
      );

      if (likedTitle) {
        // Title is already liked, remove it
        await confirmRemoveLike(title);
        return;
      }

      // Title is not liked, add it
      await $fetch('/api/users/title-status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          tmdb_id: title.tmdb_id,
          type: title.type,
          status: TITLE_STATUS.SEEN,
          liked: true,
        },
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('[handleMarkLiked] Success');
      }

      showToast(t('home.titleAddedFavorites', { title: title.title }), {
        label: t('home.viewFavorites'),
        action: async () => {
          await router.push('/lists');
        },
      }, 5000);

      // Remove from UI and get replacement
      const removedIndex = allRecommendations.value.findIndex(
        (r) => r.tmdb_id === title.tmdb_id
      );

      if (removedIndex !== -1) {
        allRecommendations.value = allRecommendations.value.filter(
          (r) => r.tmdb_id !== title.tmdb_id
        );

        fetchingReplacement.value = true;
        try {
          const queryParams: Record<string, string> = {
            excluded_tmdb_id: title.tmdb_id.toString(),
            excluded_type: title.type,
          };
          if (route.query[QUERY_PARAMS.MOOD]) queryParams[QUERY_PARAMS.MOOD] = route.query[QUERY_PARAMS.MOOD] as string;
          if (route.query[QUERY_PARAMS.ATTENTION])
            queryParams[QUERY_PARAMS.ATTENTION] = route.query[QUERY_PARAMS.ATTENTION] as string;

          const replacement = await $fetch<Recommendation | null>(
            '/api/recommendations/replacement',
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              credentials: 'include',
              query: queryParams,
            }
          );

          if (replacement) {
            allRecommendations.value.push(replacement);
          }
          filterRecommendationsByType();
        } catch (error) {
          console.error('[handleMarkLiked] Error fetching replacement:', error);
          filterRecommendationsByType();
        } finally {
          fetchingReplacement.value = false;
        }
      } else {
        filterRecommendationsByType();
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[handleMarkLiked] Error:', error);
      }
      showToast(
        t('home.errorAddingFavorites', { title: title.title }),
        null,
        3000
      );
    } finally {
      loadingTitles.value.delete(title.tmdb_id);
    }
  };

  // Handle removing like from recommendation card
  const handleRemoveLiked = async (title: Recommendation) => {
    await confirmRemoveLike(title);
  };

  // Handle removing like (no modal needed - just updates score)
  const confirmRemoveLike = async (title: Recommendation) => {
    loadingTitles.value.add(title.tmdb_id);

    try {
      const {
        data: { session },
      } = await getSession();

      if (!session?.access_token) {
        return;
      }

      const userId = getUserId(user.value);
      if (!userId) {
        return;
      }

      await $fetch('/api/users/title-status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          tmdb_id: title.tmdb_id,
          type: title.type,
          status: TITLE_STATUS.SEEN,
          liked: false,
        },
      });

      showToast(t('home.likeRemoved', { title: title.title }), null, 3000);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[confirmRemoveLike] Error:', error);
      }
      showToast(
        t('home.errorRemovingFavorites', { title: title.title }),
        null,
        3000
      );
    } finally {
      loadingTitles.value.delete(title.tmdb_id);
    }
  };

  return {
    loadingTitles,
    fetchingReplacement,
    handleTitleStatus,
    handleMarkLiked,
    handleRemoveLiked,
  };
};

