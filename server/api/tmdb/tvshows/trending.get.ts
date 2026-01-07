import { getTMDBConfig } from '@/server/utils/config';
import { getUserTMDBParams } from '@/server/utils/user-tmdb';
import { createError, defineEventHandler, H3Event } from 'h3';
import type { MediaResponse } from '@/types/Media';

export default defineEventHandler(async (event: H3Event) => {
  try {
    // Get user preferences for language and region
    const { language, region } = await getUserTMDBParams(event);
    const config = getTMDBConfig(language, region);

    const response = await $fetch(`${config.baseUrl}/trending/tv/week`, {
      query: {
        api_key: config.apiKey,
        language: config.language,
        region: config.region,
        include_adult: config.includeAdult,
      },
    });

    return response as MediaResponse;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching trending TV shows',
      data: error,
    });
  }
});
