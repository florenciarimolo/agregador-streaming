import { getSession } from '@/services/auth';

/**
 * Shared Map to track loading promises across all composable instances
 * This avoids storing Promises in useState (which can't be serialized during SSR)
 * The Map is created at module level so it's shared across all instances
 */
const LOADING_PROMISE_KEY = 'user-region-loading';
const loadingPromisesMap = new Map<string, Promise<string | null>>();

/**
 * Composable to get user's region preference
 * Caches the region to avoid multiple API calls
 */
export const useUserRegion = () => {
  const regionCache = useState<string | null>('user-region', () => null);

  /**
   * Get user's region from preferences
   * Returns cached value if available, otherwise fetches from API
   * Uses a shared promise to prevent concurrent API calls
   */
  const getUserRegion = async (): Promise<string | null> => {
    // Return cached value if available
    if (regionCache.value !== null) {
      return regionCache.value;
    }

    // If already loading, wait for the existing promise
    const existingPromise = loadingPromisesMap.get(LOADING_PROMISE_KEY);
    if (existingPromise) {
      return existingPromise;
    }

    // Create a new promise for this fetch
    const fetchPromise = (async () => {
      try {
        const { data: { session } } = await getSession();
        if (session?.access_token) {
          const prefsResponse = await $fetch<{
            success: boolean;
            preferences: { region?: string } | null;
          }>('/api/users/preferences', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (prefsResponse.success && prefsResponse.preferences?.region) {
            regionCache.value = prefsResponse.preferences.region;
            return regionCache.value;
          }
        }
      } catch (error) {
        console.error('Error fetching user region:', error);
      } finally {
        // Clear the loading promise after completion
        loadingPromisesMap.delete(LOADING_PROMISE_KEY);
      }

      // Default to null if no region found
      regionCache.value = null;
      return null;
    })();

    // Store the promise so other concurrent calls can wait for it
    loadingPromisesMap.set(LOADING_PROMISE_KEY, fetchPromise);
    return fetchPromise;
  };

  /**
   * Clear the cached region (useful when user updates preferences)
   */
  const clearRegionCache = () => {
    regionCache.value = null;
  };

  return {
    getUserRegion,
    clearRegionCache,
  };
};

