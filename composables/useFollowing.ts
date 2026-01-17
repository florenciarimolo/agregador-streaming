/**
 * Composable for following state management
 * Reactive following state for TV series
 */

import { ref, computed, type Ref } from 'vue';
import { getSession } from '@/services/auth';
import { useLogger } from '@/composables/useLogger';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';

export interface FollowingState {
  isFollowing: boolean;
  isLoading: boolean;
}

/**
 * Composable to manage following state for a TV series
 */
export const useFollowing = (tmdbId: Ref<number> | number) => {
  const { logError } = useLogger();
  const isFollowing = ref(false);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const tmdbIdRef = computed(() =>
    typeof tmdbId === 'number' ? tmdbId : tmdbId.value
  );

  /**
   * Check if user is following the series
   */
  const checkFollowing = async () => {
    try {
      isLoading.value = true;
      error.value = null;

      const {
        data: { session },
      } = await getSession();

      if (!session?.access_token) {
        isFollowing.value = false;
        return;
      }

      const response = await $fetch<{ isFollowing: boolean }>(
        `/api/users/following/check`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          query: {
            tmdb_id: tmdbIdRef.value,
          },
        }
      );

      isFollowing.value = response.isFollowing;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      logError('[useFollowing] Error checking following', error.value, {
        tmdbId: tmdbIdRef.value,
      });
      isFollowing.value = false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Follow the series
   */
  const followSeries = async () => {
    try {
      isLoading.value = true;
      error.value = null;

      const {
        data: { session },
      } = await getSession();

      if (!session?.access_token) {
        throw new Error('Unauthorized');
      }

      await $fetch('/api/users/following', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          tmdb_id: tmdbIdRef.value,
          type: MEDIA_TYPE.TV,
        },
      });

      isFollowing.value = true;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      logError('[useFollowing] Error following series', error.value, {
        tmdbId: tmdbIdRef.value,
      });
      throw error.value;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Unfollow the series
   */
  const unfollowSeries = async () => {
    try {
      isLoading.value = true;
      error.value = null;

      const {
        data: { session },
      } = await getSession();

      if (!session?.access_token) {
        throw new Error('Unauthorized');
      }

      await $fetch('/api/users/following', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        query: {
          tmdb_id: tmdbIdRef.value,
        },
      });

      isFollowing.value = false;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      logError('[useFollowing] Error unfollowing series', error.value, {
        tmdbId: tmdbIdRef.value,
      });
      throw error.value;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    isFollowing: computed(() => isFollowing.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    checkFollowing,
    followSeries,
    unfollowSeries,
  };
};
