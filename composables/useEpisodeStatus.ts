/**
 * Composable for episode/season status management
 * Reactive episode and season seen state for TV series
 */

import { ref, computed, type Ref } from 'vue';
import { getSession } from '@/services/auth';
import { useLogger } from '@/composables/useLogger';

/**
 * Composable to manage episode/season status for a TV series
 */
export const useEpisodeStatus = (
  tmdbSeriesId: Ref<number> | number
) => {
  const { logError } = useLogger();
  const episodeStatuses = ref<
    Map<string, boolean>
  >(new Map()); // Key: "season-episode", Value: seen
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const tmdbSeriesIdRef = computed(() =>
    typeof tmdbSeriesId === 'number' ? tmdbSeriesId : tmdbSeriesId.value
  );

  /**
   * Get episode statuses for the series
   */
  const fetchEpisodeStatuses = async () => {
    try {
      isLoading.value = true;
      error.value = null;

      const {
        data: { session },
      } = await getSession();

      if (!session?.access_token) {
        episodeStatuses.value = new Map();
        return;
      }

      const response = await $fetch<{
        episodes: Array<{
          season_number: number;
          episode_number: number;
        }>;
      }>('/api/users/episode-status', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        query: {
          tmdb_series_id: tmdbSeriesIdRef.value,
        },
      });

      // Build map of episode statuses
      const statusMap = new Map<string, boolean>();
      if (response.episodes) {
        for (const episode of response.episodes) {
          const key = `${episode.season_number}-${episode.episode_number}`;
          statusMap.set(key, true);
        }
      }
      episodeStatuses.value = statusMap;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      logError(
        '[useEpisodeStatus] Error fetching episode statuses',
        error.value,
        {
          tmdbSeriesId: tmdbSeriesIdRef.value,
        }
      );
      episodeStatuses.value = new Map();
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Check if an episode is seen
   */
  const isEpisodeSeen = (seasonNumber: number, episodeNumber: number) => {
    const key = `${seasonNumber}-${episodeNumber}`;
    return episodeStatuses.value.get(key) === true;
  };

  /**
   * Mark an episode as seen
   */
  const markEpisodeSeen = async (
    seasonNumber: number,
    episodeNumber: number
  ) => {
    try {
      isLoading.value = true;
      error.value = null;

      const {
        data: { session },
      } = await getSession();

      if (!session?.access_token) {
        throw new Error('Unauthorized');
      }

      await $fetch('/api/users/episode-status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          tmdb_series_id: tmdbSeriesIdRef.value,
          season_number: seasonNumber,
          episode_number: episodeNumber,
        },
      });

      // Update local state
      const key = `${seasonNumber}-${episodeNumber}`;
      episodeStatuses.value.set(key, true);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      logError('[useEpisodeStatus] Error marking episode as seen', error.value, {
        tmdbSeriesId: tmdbSeriesIdRef.value,
        seasonNumber,
        episodeNumber,
      });
      throw error.value;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Unmark an episode
   */
  const unmarkEpisode = async (
    seasonNumber: number,
    episodeNumber: number
  ) => {
    try {
      isLoading.value = true;
      error.value = null;

      const {
        data: { session },
      } = await getSession();

      if (!session?.access_token) {
        throw new Error('Unauthorized');
      }

      await $fetch('/api/users/episode-status', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        query: {
          tmdb_series_id: tmdbSeriesIdRef.value,
          season_number: seasonNumber,
          episode_number: episodeNumber,
        },
      });

      // Update local state
      const key = `${seasonNumber}-${episodeNumber}`;
      episodeStatuses.value.delete(key);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      logError('[useEpisodeStatus] Error unmarking episode', error.value, {
        tmdbSeriesId: tmdbSeriesIdRef.value,
        seasonNumber,
        episodeNumber,
      });
      throw error.value;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Mark a season as seen (all episodes)
   */
  const markSeasonSeen = async (seasonNumber: number) => {
    try {
      isLoading.value = true;
      error.value = null;

      // Get session with timeout to prevent hanging
      const getSessionPromise = getSession();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('getSession timeout after 5s')), 5000);
      });
      
      let sessionResult;
      try {
        sessionResult = await Promise.race([getSessionPromise, timeoutPromise]);
      } catch {
        throw new Error('Session timeout - please try again');
      }
      
      const {
        data: { session },
      } = sessionResult as Awaited<ReturnType<typeof getSession>>;

      if (!session?.access_token) {
        throw new Error('Unauthorized');
      }

      await $fetch('/api/users/season-status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          tmdb_series_id: tmdbSeriesIdRef.value,
          season_number: seasonNumber,
        },
      });

      // Refresh episode statuses
      await fetchEpisodeStatuses();
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      logError('[useEpisodeStatus] Error marking season as seen', error.value, {
        tmdbSeriesId: tmdbSeriesIdRef.value,
        seasonNumber,
      });
      throw error.value;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Unmark a season (all episodes)
   */
  const unmarkSeason = async (seasonNumber: number) => {
    try {
      isLoading.value = true;
      error.value = null;

      const {
        data: { session },
      } = await getSession();

      if (!session?.access_token) {
        throw new Error('Unauthorized');
      }

      await $fetch('/api/users/season-status', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        query: {
          tmdb_series_id: tmdbSeriesIdRef.value,
          season_number: seasonNumber,
        },
      });

      // Refresh episode statuses
      await fetchEpisodeStatuses();
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      logError('[useEpisodeStatus] Error unmarking season', error.value, {
        tmdbSeriesId: tmdbSeriesIdRef.value,
        seasonNumber,
      });
      throw error.value;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    episodeStatuses: computed(() => episodeStatuses.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    fetchEpisodeStatuses,
    isEpisodeSeen,
    markEpisodeSeen,
    unmarkEpisode,
    markSeasonSeen,
    unmarkSeason,
  };
};
