import type { Season } from '@/types/TVShow';
import { getTMDBConfig } from '@/server/utils/config';
import { getUserTMDBParams } from '@/server/utils/user-tmdb';
import { getPrimaryLanguageForRegion } from '@/utils/language-detection';
import {
  createError,
  defineEventHandler,
  type EventHandlerRequest,
  type H3Event,
} from 'h3';
import { DEFAULT_LANGUAGE_ISO } from '@/constants/languages';
import { createServerSupabaseClient } from '@/server/utils/supabase';

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
      const primaryLangCode =
        primaryLanguage.split('-')[0]?.toLowerCase() || '';

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
          const { logError } = await import('@/server/utils/logger');
          logError(
            '[Season] Error fetching primary language',
            primaryError as Error,
            {
              tvTmdbId: id,
              seasonId: season_id,
              primaryLanguageKey,
            }
          );
        }
      }

      // Use primary language overview if preferred language overview is empty
      if (needsPrimaryLanguage && primaryResponse?.overview) {
        response.overview = primaryResponse.overview;
      }

      // Use primary language episode overviews if preferred language overviews are empty
      if (
        hasEmptyEpisodeOverview &&
        primaryResponse?.episodes &&
        response.episodes
      ) {
        response.episodes = response.episodes.map((episode, index) => {
          // Match episodes by index (they should be in the same order)
          // or by id if available
          const primaryEpisode =
            primaryResponse!.episodes?.[index] ||
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

      // Get season from database to check for missing data
      const runtimeConfig = useRuntimeConfig();
      const supabase = createServerSupabaseClient(runtimeConfig);
      const tvTmdbId = parseInt(id, 10);
      const seasonNumber = parseInt(season_id, 10);

      // Fetch English overview as final fallback if needed
      const { fetchSeasonOverviewEnglishFallback } =
        await import('@/server/utils/season-update');
      const englishOverview = await fetchSeasonOverviewEnglishFallback(
        tvTmdbId,
        seasonNumber,
        response.overview,
        language,
        region,
        supabase
      );

      // Use English overview if we got it
      if (englishOverview) {
        response.overview = englishOverview;
      }

      const { getSeasonByTmdbIds } = await import('@/services/seasons');

      const seasonFromDb = await getSeasonByTmdbIds(
        tvTmdbId,
        seasonNumber,
        supabase,
        language,
        region
      );

      // Calculate episode_count from episodes array if available
      const episodeCount =
        response.episodes && response.episodes.length > 0
          ? response.episodes.length
          : null;

      // Update missing season data using shared utility
      // The utility will handle getting air_date from first episode if needed
      const { updateMissingSeasonFields } =
        await import('@/server/utils/season-update');

      // Prepare TMDB season data
      const tmdbSeasonData = {
        id: response.id,
        name: response.name,
        season_number: seasonNumber,
        overview: response.overview,
        air_date: response.air_date,
        poster_path: response.poster_path,
        vote_average: response.vote_average,
        episode_count: episodeCount ?? response.episode_count,
        // Pass episodes array so utility can get air_date from first episode if needed
        episodes: response.episodes?.map((ep) => ({
          air_date: ep.air_date,
        })),
      };

      // Determine which language to use for saving overview
      // If we got English overview as fallback, save it with 'en-US' key
      const languageForUpdate = englishOverview ? 'en-US' : language;

      await updateMissingSeasonFields(
        tvTmdbId,
        seasonNumber,
        seasonFromDb
          ? {
              name: seasonFromDb.name,
              poster_path: seasonFromDb.poster_path,
              vote_average: seasonFromDb.vote_average,
              overview: seasonFromDb.overview,
              air_date: seasonFromDb.air_date,
              episode_count: seasonFromDb.episode_count,
            }
          : null,
        tmdbSeasonData,
        languageForUpdate,
        supabase,
        region
      );

      // Always return stored data from database (source of truth)
      const seasonFromDbAfterUpdate = await getSeasonByTmdbIds(
        tvTmdbId,
        seasonNumber,
        supabase,
        language,
        region
      );

      // Build response using database data as source of truth
      // Only use TMDB data for fields not stored in database (like episodes)
      if (seasonFromDbAfterUpdate) {
        return {
          ...seasonFromDbAfterUpdate,
          episodes: response.episodes, // Episodes are not stored in DB, use TMDB
          vote_count: response.vote_count, // vote_count is not stored in DB
        };
      }

      // Fallback to TMDB response if database doesn't have the season
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
