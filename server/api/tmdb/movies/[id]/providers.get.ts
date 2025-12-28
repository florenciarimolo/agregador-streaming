import { WatchProviderResponse } from '@/types/WatchProvider';
import { getTMDBConfig } from '../../../../utils/config';
import { createError, getRouterParams } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    const config = getTMDBConfig();
    const { id } = getRouterParams(event) as { id: string };
    const response: WatchProviderResponse = await $fetch(`${config.baseUrl}/movie/${id}/watch/providers`, {
      query: {
        api_key: config.apiKey,
        language: config.language,
        include_adult: config.includeAdult,
      },
    });

    return (await response).results.ES || {};
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching trending movies',
      data: error,
    });
  }
});
