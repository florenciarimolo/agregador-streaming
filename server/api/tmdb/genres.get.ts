import { getTMDBConfig } from '@/server/utils/config';
import { getUserTMDBParams } from '@/server/utils/user-preferences';
import { createError, defineEventHandler, getQuery } from 'h3';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import {
  LanguageIsoCode,
  DEFAULT_LANGUAGE_ISO,
  extractLanguageCode,
} from '@/constants/languages';

export default defineEventHandler(async (event) => {
  try {
    // Get user preferences for language and region
    const params = await getUserTMDBParams(event);
    const config = getTMDBConfig(params.language, params.region);

    const query = getQuery(event);
    const type = (query.type as string) || MediaTypeEnum.movie; // 'movie' or 'tv'

    // Extract language code only (e.g., 'es-ES' -> 'es')
    // TMDB genres API only accepts ISO 639-1 language code, not the full locale
    // IMPORTANT: If region is ES, always use Spanish regardless of preferred language
    const languageCode =
      config.region === 'ES'
        ? LanguageIsoCode.SPANISH
        : extractLanguageCode(config.language) || DEFAULT_LANGUAGE_ISO;

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
