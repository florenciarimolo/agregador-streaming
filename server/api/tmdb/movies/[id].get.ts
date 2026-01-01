import { getTMDBConfig } from '../../../utils/config';
import { getUserTMDBParams } from '../../../utils/user-preferences';
import { createError, getRouterParams } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    // Get user preferences for language and region
    const { language, region } = await getUserTMDBParams(event);
    const config = getTMDBConfig(language, region);

    const { id } = getRouterParams(event) as { id: string };

    const response = await $fetch(`${config.baseUrl}/movie/${id}`, {
      query: {
        api_key: config.apiKey,
        language: config.language,
        region: config.region,
        include_adult: config.includeAdult,
        append_to_response: 'movie-watch-providers',
      },
    });

    return response;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching movie details',
      data: error,
    });
  }
});
