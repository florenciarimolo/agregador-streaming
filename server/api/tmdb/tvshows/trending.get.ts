import { getTMDBConfig } from '../../../utils/config';
import { createError, defineEventHandler, H3Event } from 'h3';
import type { MediaResponse } from '@/types/Media';

export default defineEventHandler(async (event: H3Event) => {
  try {
    const config = getTMDBConfig();

    const response = await $fetch(`${config.baseUrl}/trending/tv/week`, {
      query: {
        api_key: config.apiKey,
        language: config.language,
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
