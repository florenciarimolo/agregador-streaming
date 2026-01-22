import { getTMDBConfig } from '@/server/utils/config';
import { getUserTMDBParams } from '@/server/utils/user-tmdb';
import { createError, defineEventHandler, getQuery } from 'h3';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import {
  LanguageIsoCode,
  DEFAULT_LANGUAGE_ISO,
  extractLanguageCode,
} from '@/constants/languages';
import { logError } from '@/server/utils/logger';

export default defineEventHandler(async (event) => {
  try {
    // Get user preferences for language and region
    const params = await getUserTMDBParams(event);
    const config = getTMDBConfig(params.language, params.region);

    const query = getQuery(event);
    const type = (query.type as string) || MEDIA_TYPE.MOVIE; // 'movie' or 'tv'

    // Extract language code only (e.g., 'es-ES' -> 'es')
    // TMDB genres API only accepts ISO 639-1 language code, not the full locale
    // Priority: Use language from params (which comes from query.lang or URL) over region-based override
    // The query parameter lang should be respected to allow users to see genres in their selected language
    const languageCode = extractLanguageCode(config.language) || DEFAULT_LANGUAGE_ISO;

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
    logError('[TMDB Genres] Error fetching genres', error as Error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching genres',
      data: error,
    });
  }
});
