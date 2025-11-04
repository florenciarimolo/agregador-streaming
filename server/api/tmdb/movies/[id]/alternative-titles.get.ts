import { getTMDBConfig } from '../../../../utils/config';
import { createError, defineEventHandler } from 'h3';
import type { AlternativeTitlesResponse } from '@/types/AlternativeTitle';

export default defineEventHandler(async (event) => {
  try {
    const config = getTMDBConfig();
    const { id } = event.context.params as { id: string };

    const response: AlternativeTitlesResponse = await $fetch(
      `${config.baseUrl}/movie/${id}/alternative_titles`,
      {
        query: {
          api_key: config.apiKey,
          country: 'ES', // Get Spanish alternative titles
        },
      }
    );

    return response;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching movie alternative titles',
      data: error,
    });
  }
});
