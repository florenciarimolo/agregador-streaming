import { Season, Episode } from '@/types/TVShow';
import { getTMDBConfig } from '@/server/utils/config';
import { getUserTMDBParams } from '@/server/utils/user-preferences';
import { getPrimaryLanguageForRegion } from '@/utils/language-detection';
import {
  createError,
  defineEventHandler,
  type EventHandlerRequest,
  type H3Event,
} from 'h3';
import { DEFAULT_LANGUAGE_ISO } from '@/constants/languages';
import { createServerSupabaseClient } from '@/server/utils/supabase';
import { upsertSeason } from '@/services/seasons';

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

      const response: Season & { tagline?: string } = await $fetch(
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

      // Determine primary language for region
      const primaryLanguage = region
        ? getPrimaryLanguageForRegion(region)
        : DEFAULT_LANGUAGE_ISO;
      const primaryLanguageKey = `${primaryLanguage}-${region?.toUpperCase() || 'ES'}`;
      const requestedLangCode = language.split('-')[0]?.toLowerCase() || '';
      const primaryLangCode = primaryLanguage.split('-')[0]?.toLowerCase() || '';

      // Check if we need to fetch primary language (if preferred language is not primary)
      const needsPrimaryLanguage =
        requestedLangCode !== primaryLangCode &&
        (!response.overview || response.overview.trim() === '');

      // Also check if any episode has empty overview
      const hasEmptyEpisodeOverview =
        response.episodes?.some(
          (episode) => !episode.overview || episode.overview.trim() === ''
        ) || false;

      let primaryResponse: Season | null = null;

      if (needsPrimaryLanguage || hasEmptyEpisodeOverview) {
        try {
          primaryResponse = await $fetch<Season>(
            `${config.baseUrl}/tv/${id}/season/${season_id}`,
            {
              query: {
                api_key: config.apiKey,
                language: primaryLanguageKey,
                region: config.region,
                include_adult: config.includeAdult,
                append_to_response: 'tv-watch-providers',
              },
            }
          );
        } catch (primaryError) {
          // If primary language fetch fails, continue with original response
          console.error(
            `[Season] Error fetching primary language (${primaryLanguageKey}) for season ${season_id}:`,
            primaryError
          );
        }
      }

      // Use primary language overview if preferred language overview is empty
      if (needsPrimaryLanguage && primaryResponse?.overview) {
        response.overview = primaryResponse.overview;
      }

      // Use primary language episode overviews if preferred language overviews are empty
      if (hasEmptyEpisodeOverview && primaryResponse?.episodes && response.episodes) {
        response.episodes = response.episodes.map((episode, index) => {
          // Match episodes by index (they should be in the same order)
          // or by id if available
          const primaryEpisode = primaryResponse!.episodes?.[index] ||
            primaryResponse!.episodes?.find((ep) => ep.id === episode.id);
          
          if (
            (!episode.overview || episode.overview.trim() === '') &&
            primaryEpisode?.overview
          ) {
            return {
              ...episode,
              overview: primaryEpisode.overview,
            };
          }
          return episode;
        });
      }

      // If air_date is null, try to get it from the first episode
      let finalAirDate = response.air_date;
      if (!finalAirDate && response.episodes && response.episodes.length > 0) {
        // Find the first episode with an air_date
        const firstEpisodeWithDate = response.episodes.find(
          (ep) => ep.air_date && ep.air_date.trim() !== ''
        );
        if (firstEpisodeWithDate?.air_date) {
          finalAirDate = firstEpisodeWithDate.air_date;
          // Update response with the date from first episode
          response.air_date = finalAirDate;

          // Save to database if we have the necessary data
          try {
            const config = useRuntimeConfig();
            const supabase = createServerSupabaseClient(config);
            const tvTmdbId = parseInt(id, 10);
            const seasonNumber = parseInt(season_id, 10);

            await upsertSeason(
              {
                tv_tmdb_id: tvTmdbId,
                season_number: seasonNumber,
                tmdb_season_id: response.id,
                name: response.name || null,
                air_date: finalAirDate,
                poster_path: response.poster_path || null,
                vote_average: response.vote_average || null,
              },
              supabase
            );
          } catch (dbError) {
            // Log error but don't fail the request
            console.error(
              `[Season] Error saving air_date from first episode to database:`,
              dbError
            );
          }
        }
      }

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
