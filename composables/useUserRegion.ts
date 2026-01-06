import { getSession } from '@/services/auth';

/**
 * Composable to get user's region preference
 * Caches the region to avoid multiple API calls
 */
export const useUserRegion = () => {
  const regionCache = useState<string | null>('user-region', () => null);
  // Use useState for loadingPromise to share the same promise across all composable instances
  // This ensures only one API call is made even if multiple components call getUserRegion() simultaneously
  const loadingPromise = useState<Promise<string | null> | null>('user-region-loading-promise', () => null);

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
    if (loadingPromise.value) {
      return loadingPromise.value;
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
        loadingPromise.value = null;
      }

      // Default to null if no region found
      regionCache.value = null;
      return null;
    })();

    // Store the promise so other concurrent calls can wait for it
    loadingPromise.value = fetchPromise;
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

