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

    // Extract language code only (e.g., 'es-ES' -> 'es')
    // TMDB genres API only accepts ISO 639-1 language code, not the full locale
    // IMPORTANT: If region is ES, always use 'es' regardless of preferred language
    const languageCode =
      config.region === 'ES' ? 'es' : config.language.split('-')[0] || 'es';

    const url = `${config.baseUrl}/genre/${type}/list`;
    const queryParams = {
      api_key: config.apiKey,
      language: languageCode,
    };


    // Fetch genres for the specified type
    const response = await $fetch<{
      genres: Array<{
        id: number;
        name: string;
      }>;
    }>(url, {
      query: queryParams,
    });


    return response;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[TMDB Genres] Error:', error);
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching genres',
      data: error,
    });
  }
});
