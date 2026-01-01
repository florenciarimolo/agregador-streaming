import { getTMDBConfig } from '../../utils/config';
import { getUserTMDBParams } from '../../utils/user-preferences';
import { createError, defineEventHandler, getQuery } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    // Get user preferences for language and region
    const params = await getUserTMDBParams(event);
    const config = getTMDBConfig(params.language, params.region);

    const query = getQuery(event);
    const type = (query.type as string) || 'movie'; // 'movie' or 'tv'

    // Fetch genres for the specified type
    const response = await $fetch<{
      genres: Array<{
        id: number;
        name: string;
      }>;
    }>(`${config.baseUrl}/genre/${type}/list`, {
      query: {
        api_key: config.apiKey,
        language: config.language,
      },
    });

    return response;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching genres',
      data: error,
    });
  }
});
