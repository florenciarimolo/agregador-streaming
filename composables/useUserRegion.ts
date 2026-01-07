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
      console.warn(
        '[useUserRegion] Returning cached region:',
        regionCache.value
      );
      return regionCache.value;
    }

    if (forceRefresh && import.meta.dev) {
      console.log('[useUserRegion] Force refresh requested, bypassing cache');
    }

    // If already loading, wait for the existing promise
    const existingPromise = loadingPromisesMap.get(LOADING_PROMISE_KEY);
    if (existingPromise) {
      if (import.meta.dev) {
        console.log('[useUserRegion] Waiting for existing promise');
      }
      return existingPromise;
    }

    // Create a new promise for this fetch
    const fetchPromise = (async () => {
      try {
        const {
          data: { session },
        } = await getSession();
        if (!session?.access_token) {
          if (import.meta.dev) {
            console.log('[useUserRegion] No session or access token');
          }
          regionCache.value = null;
          return null;
        }

        console.log('[useUserRegion] Fetching preferences from API...');

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

        // Log the raw response first
        console.error(
          '[useUserRegion] RAW API response:',
          JSON.stringify(prefsResponse, null, 2)
        );
        console.error(
          '[useUserRegion] preferences object:',
          prefsResponse?.preferences
        );
        console.error(
          '[useUserRegion] region field:',
          prefsResponse?.preferences?.region
        );
        console.error(
          '[useUserRegion] region type:',
          typeof prefsResponse?.preferences?.region
        );
        console.error(
          '[useUserRegion] region length:',
          prefsResponse?.preferences?.region?.length
        );

        if (prefsResponse?.success && prefsResponse?.preferences) {
          // Check if region exists (even if it's null, we want to know it was checked)
          const region = prefsResponse.preferences.region;
          console.warn('[useUserRegion] Checking region:', {
            region,
            type: typeof region,
            isString: typeof region === 'string',
            length: typeof region === 'string' ? region.length : 'N/A',
            isEmpty:
              !region || (typeof region === 'string' && region.length === 0),
          });

          if (region && typeof region === 'string' && region.length > 0) {
            regionCache.value = region;
            console.warn('[useUserRegion] ✅ Region found and cached:', region);
            return regionCache.value;
          }
          // If preferences exist but region is null/empty, cache null explicitly
          regionCache.value = null;
          console.error(
            '[useUserRegion] ❌ Preferences found but region is null/empty. Full preferences:',
            JSON.stringify(prefsResponse, null, 2)
          );
          return null;
        }

        // If preferences don't exist, cache null explicitly
        if (import.meta.dev) {
          console.log('[useUserRegion] No preferences found or success=false');
        }
        regionCache.value = null;
        return null;
      } catch (error) {
        console.error('[useUserRegion] Error fetching user region:', error);
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
