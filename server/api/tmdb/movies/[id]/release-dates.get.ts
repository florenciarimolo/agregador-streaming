import { getTMDBConfig } from '../../../../utils/config';
import { createError, getRouterParams } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    const config = getTMDBConfig();
    const { id } = getRouterParams(event) as { id: string };

    const response = await $fetch(
      `${config.baseUrl}/movie/${id}/release_dates`,
      {
        query: {
          api_key: config.apiKey,
        },
      }
    );

    return response;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching movie release dates',
      data: error,
    });
  }
});
