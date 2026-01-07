import { ref, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useSupabaseUser } from '#imports';
import { getSession } from '@/services/auth';
import { getUserLikedTitle } from '@/services/userTitleStatus';
import { getTitleByTmdbIdWithLanguage } from '@/services/titles';
import { useUserRegion } from '@/composables/useUserRegion';
import { useTitleStatusAction } from '@/composables/useTitleStatusAction';
import { QUERY_PARAMS } from '@/constants/api/queryParams';
import type { Recommendation } from '@/types/Recommendation';
import { TITLE_STATUS, type TitleStatusType } from '@/constants/domain/titleStatus';

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
  filterRecommendationsByType: () => void
) => {
  const route = useRoute();
  const { locale } = useI18n();
  const user = useSupabaseUser();
  const { getUserRegion } = useUserRegion();
  const { executeAction, executeLikedAction } = useTitleStatusAction();

  // Helper function to get title with alphabet detection
  const getTitleWithAlphabetDetection = async (
    title: Recommendation
  ): Promise<string> => {
    try {
      // Get user region from preferences
      const userRegion = await getUserRegion();
      
      // Get title from database with language detection
      const { data: titleData } = await getTitleByTmdbIdWithLanguage(
        title.tmdb_id,
        title.type,
        locale.value || 'es-ES',
        userRegion
      );
      
      // If we got a title from database (with alphabet detection), use it
      if (titleData?.title) {
        return titleData.title;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[getTitleWithAlphabetDetection] Error:', error);
      }
    }
    
    // Fallback to original title if database fetch fails
    return title.title;
  };

  const loadingTitles = ref<Set<number>>(new Set());
  const fetchingReplacement = ref(false);

  // Helper function to fetch replacement title
  const fetchReplacementTitle = async (title: Recommendation) => {
    try {
      const {
        data: { session },
      } = await getSession();

      if (!session?.access_token) {
        return;
      }

      fetchingReplacement.value = true;
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
          query: queryParams,
        }
      );

      if (replacement) {
        allRecommendations.value.push(replacement);
      }
      filterRecommendationsByType();
    } catch (error) {
      console.error('[fetchReplacementTitle] Error:', error);
      filterRecommendationsByType();
    } finally {
      fetchingReplacement.value = false;
    }
  };

  // Handle marking a title with different statuses
  const handleTitleStatus = async (
    title: Recommendation,
    status: TitleStatusType,
    liked: boolean = false
  ) => {
    loadingTitles.value.add(title.tmdb_id);

    let originalTitleIndex = -1;
    let originalInWatchlist: boolean | undefined = undefined;

    try {
      // Store original state for rollback
      originalTitleIndex = recommendations.value.findIndex(
        (r: Recommendation) => r.tmdb_id === title.tmdb_id
      );
      if (originalTitleIndex !== -1 && status === TITLE_STATUS.WATCHLIST) {
        originalInWatchlist =
          recommendations.value[originalTitleIndex].in_watchlist;
      }

      // Get current status (if any)
      const currentStatus = title.in_watchlist
        ? TITLE_STATUS.WATCHLIST
        : null; // For recommendations, we don't track seen/not_interested in the object

      // Get title with alphabet detection
      const titleWithDetection = await getTitleWithAlphabetDetection(title);

      // Use unified composable for API call and toast
      const result = await executeAction(
        {
          tmdb_id: title.tmdb_id,
          type: title.type,
          title: titleWithDetection,
          currentStatus,
          isLiked: liked,
        },
        status
      );

      if (result.success) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[handleTitleStatus] Success:', { status, result });
        }

        // Remove from UI and get replacement (UI-specific logic)
        const removedIndex = allRecommendations.value.findIndex(
          (r: Recommendation) => r.tmdb_id === title.tmdb_id
        );

        if (removedIndex !== -1) {
          allRecommendations.value = allRecommendations.value.filter(
            (r: Recommendation) => r.tmdb_id !== title.tmdb_id
          );
          await fetchReplacementTitle(title);
        } else {
          filterRecommendationsByType();
        }
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
    } finally {
      loadingTitles.value.delete(title.tmdb_id);
    }
  };

  // Handle marking as liked (implies seen, removes from watchlist)
  const handleMarkLiked = async (title: Recommendation) => {
    loadingTitles.value.add(title.tmdb_id);

    try {
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

      // Get current status (if any)
      const currentStatus = title.in_watchlist
        ? TITLE_STATUS.WATCHLIST
        : null;

      // Get title with alphabet detection
      const titleWithDetection = await getTitleWithAlphabetDetection(title);

      // Use unified composable for API call and toast
      const result = await executeLikedAction(
        {
          tmdb_id: title.tmdb_id,
          type: title.type,
          title: titleWithDetection,
          currentStatus,
          isLiked: false,
        },
        false
      );

      if (result.success) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[handleMarkLiked] Success');
        }

        // Remove from UI and get replacement (UI-specific logic)
        const removedIndex = allRecommendations.value.findIndex(
          (r) => r.tmdb_id === title.tmdb_id
        );

        if (removedIndex !== -1) {
          allRecommendations.value = allRecommendations.value.filter(
            (r) => r.tmdb_id !== title.tmdb_id
          );
          await fetchReplacementTitle(title);
        } else {
          filterRecommendationsByType();
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[handleMarkLiked] Error:', error);
      }
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
      // Get current status (if any)
      const currentStatus = title.in_watchlist
        ? TITLE_STATUS.WATCHLIST
        : TITLE_STATUS.SEEN; // If it's liked, it must have SEEN status

      // Get title with alphabet detection
      const titleWithDetection = await getTitleWithAlphabetDetection(title);

      // Use unified composable for API call and toast
      const result = await executeLikedAction(
        {
          tmdb_id: title.tmdb_id,
          type: title.type,
          title: titleWithDetection,
          currentStatus,
          isLiked: true,
        },
        true
      );

      if (result.success && process.env.NODE_ENV === 'development') {
        console.log('[confirmRemoveLike] Success');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[confirmRemoveLike] Error:', error);
      }
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

