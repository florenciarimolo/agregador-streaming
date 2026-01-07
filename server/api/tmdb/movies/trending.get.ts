import { getTMDBConfig } from '@/server/utils/config';
import { getUserTMDBParams } from '@/server/utils/user-tmdb';
import { createError } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    // Get user preferences for language and region
    const { language, region } = await getUserTMDBParams(event);
    const config = getTMDBConfig(language, region);

    const response = await $fetch(`${config.baseUrl}/trending/movie/week`, {
      query: {
        api_key: config.apiKey,
        language: config.language,
        region: config.region,
        include_adult: config.includeAdult,
      },
    });

    return response;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching trending movies',
      data: error,
    });
  }
});
