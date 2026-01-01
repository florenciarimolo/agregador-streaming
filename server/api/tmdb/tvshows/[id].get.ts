import { getTMDBConfig } from '../../../utils/config';
import { getUserTMDBParams } from '../../../utils/user-preferences';
import { createError, defineEventHandler } from 'h3';
import { createClient } from '@supabase/supabase-js';
import { TABLES, TITLES_FIELDS } from '@/composables/database/constants';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const { id } = event.context.params as { id: string };
    const tmdbId = parseInt(id, 10);

    if (isNaN(tmdbId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid TV show ID',
      });
    }

    // First, try to get from database
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;
    const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data: titleFromDb, error: dbError } = await supabase
      .from(TABLES.TITLES)
      .select('*')
      .eq(TITLES_FIELDS.TMDB_ID, tmdbId)
      .eq(TITLES_FIELDS.TYPE, 'tv')
      .maybeSingle();

    // If found in DB, return it (but we still need to fetch seasons, genres, providers and alternative titles from TMDB)
    if (titleFromDb && !dbError) {
      // Get user preferences for language and region (for seasons, genres, providers and alternative titles)
      const { language, region } = await getUserTMDBParams(event);
      const tmdbConfig = getTMDBConfig(language, region);

      // Fetch full TV show data, providers and alternative titles from TMDB
      const [fullTvShowResponse, providersResponse, alternativeTitlesResponse] =
        await Promise.all([
          $fetch(`${tmdbConfig.baseUrl}/tv/${tmdbId}`, {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              region: tmdbConfig.region,
            },
          }).catch(() => null),
          $fetch(`${tmdbConfig.baseUrl}/tv/${tmdbId}/watch/providers`, {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              region: tmdbConfig.region,
            },
          }).catch(() => null),
          $fetch(`${tmdbConfig.baseUrl}/tv/${tmdbId}/alternative/titles`, {
            query: {
              api_key: tmdbConfig.apiKey,
            },
          }).catch(() => null),
        ]);

      // Map DB title to TVShow format, but use seasons, genres, etc. from TMDB if available
      const tvShow: any = {
        id: titleFromDb.tmdb_id,
        name: fullTvShowResponse?.name || titleFromDb.title,
        original_name: fullTvShowResponse?.original_name,
        overview: fullTvShowResponse?.overview || titleFromDb.overview,
        poster_path: titleFromDb.poster_path,
        backdrop_path: titleFromDb.backdrop_path,
        first_air_date: titleFromDb.first_air_date,
        vote_average: titleFromDb.vote_average,
        genres: fullTvShowResponse?.genres || [],
        genre_ids: fullTvShowResponse?.genre_ids || [],
        seasons: fullTvShowResponse?.seasons || [],
        number_of_seasons: fullTvShowResponse?.number_of_seasons || 0,
        in_production: fullTvShowResponse?.in_production || false,
      };

      // Add providers if available
      if (providersResponse?.results) {
        const regionProviders =
          providersResponse.results[region] || providersResponse.results.ES;
        if (regionProviders) {
          tvShow.providers = regionProviders;
        }
      }

      // Add alternative titles if available
      if (alternativeTitlesResponse?.titles) {
        tvShow.alternative_titles = alternativeTitlesResponse;
      }

      return tvShow;
    }

    // If not in DB, fetch from TMDB (but don't save it)
    const { language, region } = await getUserTMDBParams(event);
    const tmdbConfig = getTMDBConfig(language, region);

    const response = await $fetch(`${tmdbConfig.baseUrl}/tv/${tmdbId}`, {
      query: {
        api_key: tmdbConfig.apiKey,
        language: tmdbConfig.language,
        region: tmdbConfig.region,
        include_adult: tmdbConfig.includeAdult,
        append_to_response: 'tv-watch-providers',
      },
    });

    return response;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching TV Show details',
      data: error,
    });
  }
});
