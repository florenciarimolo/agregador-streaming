import { getTMDBConfig } from '../../../utils/config';
import { getUserTMDBParams } from '../../../utils/user-preferences';
import { createError, getRouterParams } from 'h3';
import { createClient } from '@supabase/supabase-js';
import { TABLES, TITLES_FIELDS } from '@/composables/database/constants';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const { id } = getRouterParams(event) as { id: string };
    const tmdbId = parseInt(id, 10);

    if (isNaN(tmdbId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid movie ID',
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
      .eq(TITLES_FIELDS.TYPE, 'movie')
      .maybeSingle();

    // If found in DB, return it (but we still need to fetch genres, providers and alternative titles from TMDB)
    if (titleFromDb && !dbError) {
      // Get user preferences for language and region (for genres, providers and alternative titles)
      const { language, region } = await getUserTMDBParams(event);
      const tmdbConfig = getTMDBConfig(language, region);

      // Fetch genres, providers and alternative titles from TMDB
      const [fullMovieResponse, providersResponse, alternativeTitlesResponse] =
        await Promise.all([
          $fetch(`${tmdbConfig.baseUrl}/movie/${tmdbId}`, {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              region: tmdbConfig.region,
            },
          }).catch(() => null),
          $fetch(`${tmdbConfig.baseUrl}/movie/${tmdbId}/watch/providers`, {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              region: tmdbConfig.region,
            },
          }).catch(() => null),
          $fetch(`${tmdbConfig.baseUrl}/movie/${tmdbId}/alternative/titles`, {
            query: {
              api_key: tmdbConfig.apiKey,
            },
          }).catch(() => null),
        ]);

      // Map DB title to Movie format, but use genres from TMDB if available
      const movie: any = {
        id: titleFromDb.tmdb_id,
        title: fullMovieResponse?.title || titleFromDb.title,
        overview: fullMovieResponse?.overview || titleFromDb.overview,
        poster_path: titleFromDb.poster_path,
        backdrop_path: titleFromDb.backdrop_path,
        release_date: titleFromDb.release_date,
        vote_average: titleFromDb.vote_average,
        genres: fullMovieResponse?.genres || [],
        genre_ids: fullMovieResponse?.genre_ids || [],
      };

      // Add providers if available
      if (providersResponse?.results) {
        const regionProviders =
          providersResponse.results[region] || providersResponse.results.ES;
        if (regionProviders) {
          movie.providers = regionProviders;
        }
      }

      // Add alternative titles if available
      if (alternativeTitlesResponse?.titles) {
        movie.alternative_titles = alternativeTitlesResponse;
      }

      return movie;
    }

    // If not in DB, fetch from TMDB (but don't save it)
    const { language, region } = await getUserTMDBParams(event);
    const tmdbConfig = getTMDBConfig(language, region);

    const response = await $fetch(`${tmdbConfig.baseUrl}/movie/${tmdbId}`, {
      query: {
        api_key: tmdbConfig.apiKey,
        language: tmdbConfig.language,
        region: tmdbConfig.region,
        include_adult: tmdbConfig.includeAdult,
        append_to_response: 'movie-watch-providers',
      },
    });

    return response;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching movie details',
      data: error,
    });
  }
});
