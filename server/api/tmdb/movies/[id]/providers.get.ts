import { getTMDBConfig } from '../../../../utils/config';
import { createError } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    const config = getTMDBConfig();
    const { id } = event.context.params;
    const response = await $fetch(`${config.baseUrl}/movie/${id}/watch/providers`, {
      query: {
        api_key: config.apiKey,
        language: config.language,
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
