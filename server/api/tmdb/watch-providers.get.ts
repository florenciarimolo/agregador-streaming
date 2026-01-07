import { getTMDBConfig } from '@/server/utils/config';
import { getUserTMDBParams } from '@/server/utils/user-tmdb';
import { createError, defineEventHandler, getQuery } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    // Get user preferences for language and region
    const params = await getUserTMDBParams(event);
    
    // Allow override of region and language via query parameters (for preview before saving)
    const query = getQuery(event);
    const region = (query.region as string) || params.region;
    const language = (query.language as string) || params.language;
    
    const config = getTMDBConfig(language, region);

    // Fetch watch providers for both movies and TV
    // TMDB returns providers available in the specified region
    const [movieResponse, tvResponse] = await Promise.all([
      $fetch<{
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
      }).catch(() => ({ results: [] })),
      $fetch<{
        results: Array<{
          provider_id: number;
          provider_name: string;
          logo_path: string | null;
          display_priority: number;
          display_priorities?: Record<string, number>;
        }>;
      }>(`${config.baseUrl}/watch/providers/tv`, {
        query: {
          api_key: config.apiKey,
          language: config.language,
          watch_region: config.region,
        },
      }).catch(() => ({ results: [] })),
    ]);

    // Combine both lists
    const allProviders = [
      ...(movieResponse?.results || []),
      ...(tvResponse?.results || []),
    ];

    // Remove duplicates by provider_id and sort by name
    const uniqueProviders = new Map<number, (typeof allProviders)[0]>();
    allProviders.forEach((provider) => {
      if (provider && provider.provider_id && provider.provider_name) {
        // Keep the first occurrence (or prefer one with logo_path if available)
        if (!uniqueProviders.has(provider.provider_id)) {
          uniqueProviders.set(provider.provider_id, provider);
        } else {
          // If duplicate exists, prefer the one with logo_path
          const existing = uniqueProviders.get(provider.provider_id);
          if (!existing?.logo_path && provider.logo_path) {
            uniqueProviders.set(provider.provider_id, provider);
          }
        }
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
