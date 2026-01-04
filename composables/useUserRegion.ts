import { getSession } from '@/services/auth';

/**
 * Composable to get user's region preference
 * Caches the region to avoid multiple API calls
 */
export const useUserRegion = () => {
  const regionCache = useState<string | null>('user-region', () => null);
  const isLoading = ref(false);

  /**
   * Get user's region from preferences
   * Returns cached value if available, otherwise fetches from API
   */
  const getUserRegion = async (): Promise<string | null> => {
    // Return cached value if available
    if (regionCache.value !== null) {
      return regionCache.value;
    }

    // If already loading, wait a bit and return cached value
    if (isLoading.value) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return regionCache.value;
    }

    isLoading.value = true;

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
      isLoading.value = false;
    }

    // Default to null if no region found
    regionCache.value = null;
    return null;
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

