import { WatchProviderResponse } from '@/types/WatchProvider';
import { getTMDBConfig } from '../../../../../../utils/config';
import { createError, defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    const config = getTMDBConfig();
    const { id, season_id } = event.context.params as { id: string; season_id: string };
    const response: WatchProviderResponse = await $fetch(`${config.baseUrl}/tv/${id}/season/${season_id}/watch/providers`, {
      query: {
        api_key: config.apiKey,
        language: config.language,
        include_adult: config.includeAdult,
      },
    });

    return await(response.results.ES || {});
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching TV Show providers',
      data: error,
    });
  }
});
