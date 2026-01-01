import { getTMDBConfig } from '../../../../utils/config';
import { getUserTMDBParams } from '../../../../utils/user-preferences';
import { createError, defineEventHandler } from 'h3';
import type { AlternativeTitlesResponse } from '@/types/AlternativeTitle';

export default defineEventHandler(async (event) => {
  try {
    // Get user preferences for language and region
    const { language, region } = await getUserTMDBParams(event);
    const config = getTMDBConfig(language, region);

    const { id } = event.context.params as { id: string };

    const response: AlternativeTitlesResponse = await $fetch(
      `${config.baseUrl}/movie/${id}/alternative_titles`,
      {
        query: {
          api_key: config.apiKey,
          country: config.region, // Use user's region
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
