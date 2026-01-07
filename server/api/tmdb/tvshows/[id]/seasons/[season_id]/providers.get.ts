import {
  WatchProviderResponse,
  WatchProviderTypes,
} from '@/types/WatchProvider';
import { getTMDBConfig } from '@/server/utils/config';
import { getUserTMDBParams } from '@/server/utils/user-tmdb';
import { createError, defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    // Get user preferences for language and region
    const { language, region } = await getUserTMDBParams(event);
    const config = getTMDBConfig(language, region);

    const { id, season_id } = event.context.params as {
      id: string;
      season_id: string;
    };
    const response: WatchProviderResponse = await $fetch(
      `${config.baseUrl}/tv/${id}/season/${season_id}/watch/providers`,
      {
        query: {
          api_key: config.apiKey,
          language: config.language,
          include_adult: config.includeAdult,
        },
      }
    );

    // Use user's region for providers, fallback to ES
    const results = response.results;
    return (results[region] || results.ES || {}) as WatchProviderTypes;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching TV Show providers',
      data: error,
    });
  }
});
