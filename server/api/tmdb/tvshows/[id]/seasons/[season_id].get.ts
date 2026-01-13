import type { Season } from '@/types/TVShow';
import type { MultiLanguageText } from '@/services/titles';
import { updateMissingLanguageValue } from '@/services/titles';
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

      // Get season from database to check if we need to fetch episode_count or poster_path
      const runtimeConfig = useRuntimeConfig();
      const supabase = createServerSupabaseClient(runtimeConfig);
      const tvTmdbId = parseInt(id, 10);
      const seasonNumber = parseInt(season_id, 10);

      const { getSeasonByTmdbIds } = await import('@/services/seasons');
      const seasonFromDb = await getSeasonByTmdbIds(
        tvTmdbId,
        seasonNumber,
        supabase,
        language,
        region
      );

      // Check if episode_count is null in database
      let needsEpisodeCountUpdate = false;
      let episodeCount: number | null = null;

      if (!seasonFromDb?.episode_count && response.episodes) {
        // Calculate episode_count from episodes array
        episodeCount = response.episodes.length;
        needsEpisodeCountUpdate = true;
      }

      // If air_date is null, try to get it from the first episode
      let finalAirDate = response.air_date;
      let needsAirDateUpdate = false;
      if (!finalAirDate && response.episodes && response.episodes.length > 0) {
        // Find the first episode with an air_date
        const firstEpisodeWithDate = response.episodes.find(
          (ep) => ep.air_date && ep.air_date.trim() !== ''
        );
        if (firstEpisodeWithDate?.air_date) {
          finalAirDate = firstEpisodeWithDate.air_date;
          // Update response with the date from first episode
          response.air_date = finalAirDate;
          needsAirDateUpdate = true;
        }
      }

      // Check if poster_path is missing in current language
      let needsPosterPathUpdate = false;
      let posterPathJsonb: MultiLanguageText | null = null;
      if (response.poster_path) {
        // Get current poster_path from database
        const { data: seasonData } = await supabase
          .from('seasons')
          .select('poster_path')
          .eq('tv_tmdb_id', tvTmdbId)
          .eq('season_number', seasonNumber)
          .maybeSingle();

        const updatedPosterPath = updateMissingLanguageValue(
          seasonData?.poster_path,
          response.poster_path,
          language,
          region,
          true // isImagePath
        );

        if (updatedPosterPath) {
          posterPathJsonb = updatedPosterPath;
          needsPosterPathUpdate = true;
        }
      }

      // Update database if we have data to save
      if (
        needsEpisodeCountUpdate ||
        needsAirDateUpdate ||
        needsPosterPathUpdate
      ) {
        try {
          await upsertSeason(
            {
              tv_tmdb_id: tvTmdbId,
              season_number: seasonNumber,
              tmdb_season_id: response.id,
              name: response.name || null,
              air_date: needsAirDateUpdate ? finalAirDate : undefined,
              poster_path: needsPosterPathUpdate
                ? posterPathJsonb
                : undefined,
              vote_average: response.vote_average || null,
              episode_count: needsEpisodeCountUpdate ? episodeCount : undefined,
            },
            supabase
          );
        } catch (dbError) {
          // Log error but don't fail the request
          console.error(
            `[Season] Error saving season data to database:`,
            dbError
          );
        }
      }

      // Set episode_count in response if we calculated it
      if (episodeCount !== null) {
        response.episode_count = episodeCount;
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
