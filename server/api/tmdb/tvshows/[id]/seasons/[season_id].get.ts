import { Season } from '@/types/TVShow';
import { getTMDBConfig } from '../../../../../utils/config';
import { getUserTMDBParams } from '../../../../../utils/user-preferences';
import {
  createError,
  defineEventHandler,
  type EventHandlerRequest,
  type H3Event,
} from 'h3';

export default defineEventHandler(
  async (event: H3Event<EventHandlerRequest>) => {
    try {
      // Get user preferences for language and region
      const { language, region } = await getUserTMDBParams(event);
      const config = getTMDBConfig(language, region);
      
      const { id, season_id } = event.context.params as {
        id: string;
        season_id: string;
      };

      const response: Season = await $fetch(
        `${config.baseUrl}/tv/${id}/season/${season_id}`,
        {
          query: {
            api_key: config.apiKey,
            language: config.language,
            region: config.region,
            include_adult: config.includeAdult,
            append_to_response: 'tv-watch-providers',
          },
        }
      );

      return response;
    } catch (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Error fetching TV Show Season details',
        data: error,
      });
    }
  }
);
