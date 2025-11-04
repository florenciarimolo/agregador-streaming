import { getTMDBConfig } from '../../../utils/config';
import { createError, defineEventHandler, getQuery, H3Event } from 'h3';
import type { MediaResponse } from '@/types/Media';

export default defineEventHandler(async (event: H3Event) => {
  try {
    const config = getTMDBConfig();
    const query = getQuery(event);
    const searchQuery = query.query as string;

    if (!searchQuery || searchQuery.length < 4) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Query parameter is required and must be at least 4 characters long',
      });
    }

    const response = await $fetch(`${config.baseUrl}/search/multi`, {
      query: {
        api_key: config.apiKey,
        language: config.language,
        include_adult: config.includeAdult,
        query: searchQuery,
      },
    });

    return { data: response as MediaResponse };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching search results',
      data: error,
    });
  }
});
