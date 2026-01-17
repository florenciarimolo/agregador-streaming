import { getSession } from '@/services/auth';
import { useLogger } from '@/composables/useLogger';

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
   * @param forceRefresh - If true, bypasses cache and fetches fresh data
   */
  const getUserRegion = async (
    forceRefresh = false
  ): Promise<string | null> => {
    // Return cached value if available (unless forcing refresh)
    // IMPORTANT: Only return cached value if it's a valid string, not if it's null
    if (
      !forceRefresh &&
      regionCache.value !== null &&
      regionCache.value !== undefined &&
      typeof regionCache.value === 'string' &&
      regionCache.value.length > 0
    ) {
      // Development-only logging removed
      return regionCache.value;
    }

    // Development-only logging removed

    // If already loading, wait for the existing promise
    const existingPromise = loadingPromisesMap.get(LOADING_PROMISE_KEY);
    if (existingPromise) {
      return existingPromise;
    }

    // Create a new promise for this fetch
    const fetchPromise = (async () => {
      try {
        const {
          data: { session },
        } = await getSession();
        if (!session?.access_token) {
          regionCache.value = null;
          return null;
        }

        const prefsResponse = await $fetch<{
          success: boolean;
          preferences: {
            region?: string | null;
          } | null;
        }>('/api/users/preferences', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (prefsResponse?.success && prefsResponse?.preferences) {
          // Check if region exists (even if it's null, we want to know it was checked)
          const region = prefsResponse.preferences.region;

          if (region && typeof region === 'string' && region.length > 0) {
            regionCache.value = region;
            return regionCache.value;
          }
          // If preferences exist but region is null/empty, cache null explicitly
          regionCache.value = null;
          const { logWarn } = useLogger();
          logWarn('[UserRegion] Preferences found but region is null/empty', {
            hasPreferences: true,
          });
          return null;
        }

        // If preferences don't exist, cache null explicitly
        regionCache.value = null;
        return null;
      } catch (error) {
        const { logError } = useLogger();
        logError('[UserRegion] Error fetching user region', error as Error);
        regionCache.value = null;
        return null;
      } finally {
        // Clear the loading promise after completion
        loadingPromisesMap.delete(LOADING_PROMISE_KEY);
      }
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
