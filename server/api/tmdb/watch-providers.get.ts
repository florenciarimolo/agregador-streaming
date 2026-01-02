import { getTMDBConfig } from '../../utils/config';
import { getUserTMDBParams } from '../../utils/user-preferences';
import { createError, defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    // Get user preferences for language and region
    const params = await getUserTMDBParams(event);
    const config = getTMDBConfig(params.language, params.region);

    // Fetch watch providers for movies (they're the same for TV)
    // TMDB returns providers available in the specified region
    const response = await $fetch<{
      results: Array<{
        provider_id: number;
        provider_name: string;
        logo_path: string | null;
        display_priority: number;
        display_priorities?: Record<string, number>;
      }>;
    }>(`${config.baseUrl}/watch/providers/movie`, {
      query: {
        api_key: config.apiKey,
        language: config.language,
        watch_region: config.region,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[WatchProviders] Raw TMDB response:', {
        hasResponse: !!response,
        hasResults: !!response?.results,
        resultsLength: response?.results?.length || 0,
        sample: response?.results?.slice(0, 3),
      });
    }

    // Check if response has results
    if (!response || !response.results || !Array.isArray(response.results)) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[WatchProviders] Invalid response structure:', response);
      }
      return { results: [] };
    }

    // Return unique providers sorted by name
    const uniqueProviders = new Map<number, (typeof response.results)[0]>();
    response.results.forEach((provider) => {
      if (!uniqueProviders.has(provider.provider_id)) {
        uniqueProviders.set(provider.provider_id, provider);
      }
    });

    const processedResults = Array.from(uniqueProviders.values()).sort((a, b) =>
      a.provider_name.localeCompare(b.provider_name)
    );

    return {
      results: processedResults,
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching watch providers',
      data: error,
    });
  }
});
