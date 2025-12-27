import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getTMDBConfig } from '../utils/config';
import {
  Recommendations,
  Recommendation,
  Provider,
} from '@/types/Recommendation';

/**
 * Type for Supabase user_likes query result with joined titles
 */
type UserLikeWithTitle = {
  title_id: string;
  titles: {
    id: string;
    genres: number[] | Array<{ id?: number }>;
    type: 'movie' | 'tv';
    tmdb_id: number;
    vote_average: number | null;
  };
};

/**
 * TMDB API response types (used by recommendations, trending, etc.)
 */
type TMDBResult = {
  id: number;
  title?: string; // movies
  name?: string; // tv shows
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string; // movies
  first_air_date?: string; // tv shows
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
  runtime?: number; // movies
  episode_run_time?: number[]; // tv shows
};

type TMDBResponse = {
  page: number;
  results: TMDBResult[];
  total_pages: number;
  total_results: number;
};

/**
 * Get recommendations for the authenticated user
 *
 * New Strategy:
 * 1. Main "Recommended for you": Use /movie/{id}/recommendations and /tv/{id}/recommendations
 *    - Pick 1-2 liked titles with highest vote_average
 *    - Filter: vote_average >= 7.2, vote_count >= 300 (movies), >= 200 (tv)
 *    - Sort by popularity.desc
 * 2. Secondary "Trending for you": Use /trending/movie/week and /trending/tv/week
 *    - Filter by user's top genres
 *    - Exclude already liked titles
 * 3. Easy to watch: Focus on comedy/animation genres with high vote_count
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  let user = null;
  let userId: string | null = null;

  // Try to get user from cookies first (default Supabase behavior)
  const userFromCookies = await serverSupabaseUser(event);

  if (userFromCookies) {
    userId =
      userFromCookies.id || (userFromCookies as { sub?: string }).sub || null;

    if (userId) {
      user = { id: userId, sub: userId };
    }
  } else {
    // If no user from cookies, try to get from Authorization header
    const authHeader = event.node.req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(
              parts[1].replace(/-/g, '+').replace(/_/g, '/'),
              'base64'
            ).toString()
          );

          userId = payload.sub;

          if (userId) {
            user = { id: userId, sub: userId };
          }
        }
      } catch (err) {
        console.error('Error decoding token:', err);
      }
    }
  }

  if (!user || !userId) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  // Create Supabase client
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;

  const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    // Get user's liked titles with their genres and ratings
    const { data: userLikes, error: likesError } = await supabase
      .from('user_likes')
      .select('title_id, titles!inner(id, genres, type, tmdb_id, vote_average)')
      .eq('user_id', userId);

    if (likesError) {
      console.error('Error fetching user_likes:', likesError);
      throw likesError;
    }

    if (!userLikes || userLikes.length === 0) {
      return {
        recommended: [],
        easyToWatch: [],
        basedOnLikes: [],
      };
    }

    // Extract data from user likes
    const likedTmdbIds = new Set<number>();
    const likedTitlesWithRating: Array<{
      tmdb_id: number;
      type: 'movie' | 'tv';
      vote_average: number | null;
    }> = [];
    const genreFrequency = new Map<number, number>();

    // Type assertion: Supabase returns titles as object (not array) with !inner join
    (userLikes as unknown as UserLikeWithTitle[]).forEach((like) => {
      const title = like.titles;
      if (title?.tmdb_id) {
        likedTmdbIds.add(title.tmdb_id);

        // Store title with rating for sorting
        likedTitlesWithRating.push({
          tmdb_id: title.tmdb_id,
          type: title.type,
          vote_average: title.vote_average,
        });

        // Extract genre IDs
        if (title.genres && Array.isArray(title.genres)) {
          title.genres.forEach((genre: number | { id?: number }) => {
            const genreId = typeof genre === 'number' ? genre : genre?.id;
            if (genreId) {
              genreFrequency.set(
                genreId,
                (genreFrequency.get(genreId) || 0) + 1
              );
            }
          });
        }
      }
    });

    // Get top 3 genres by frequency
    const topGenres = Array.from(genreFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genreId]) => genreId);

    if (topGenres.length === 0) {
      return {
        recommended: [],
        easyToWatch: [],
        basedOnLikes: [],
      };
    }

    const tmdbConfig = getTMDBConfig();

    // Helper function to transform TMDB result to Recommendation
    const transformToRecommendation = async (
      result: TMDBResult,
      type: 'movie' | 'tv'
    ): Promise<Recommendation | null> => {
      // Skip if already liked
      if (likedTmdbIds.has(result.id)) {
        return null;
      }

      // Fetch providers
      let providers: Provider[] = [];
      try {
        const providerPath =
          type === 'movie'
            ? `/movie/${result.id}/watch/providers`
            : `/tv/${result.id}/watch/providers`;
        const providerResponse = await $fetch<{
          results?: {
            ES?: {
              flatrate?: Provider[];
              buy?: Provider[];
              rent?: Provider[];
            };
          };
        }>(`${tmdbConfig.baseUrl}${providerPath}`, {
          query: {
            api_key: tmdbConfig.apiKey,
            language: tmdbConfig.language,
          },
        });

        const esProviders = providerResponse.results?.ES;
        if (esProviders) {
          const streamingProviders = esProviders.flatrate || [];
          const buyProviders = esProviders.buy || [];
          const rentProviders = esProviders.rent || [];
          providers = [
            ...streamingProviders,
            ...buyProviders,
            ...rentProviders,
          ].slice(0, 5);
        }
      } catch (error) {
        console.error(`Error fetching providers for ${result.id}:`, error);
      }

      return {
        id: `tmdb-${result.id}`,
        tmdb_id: result.id,
        title: result.title || result.name || '',
        type,
        poster_path: result.poster_path,
        overview: result.overview,
        vote_average: result.vote_average,
        genres: result.genre_ids,
        release_date: result.release_date || null,
        first_air_date: result.first_air_date || null,
        explanation: '', // Will be set by caller
        providers,
      };
    };

    // 1. RECOMMENDED FOR YOU: Use recommendation endpoints
    // Pick 1-2 liked titles with highest vote_average
    const topLikedTitles = likedTitlesWithRating
      .filter((t) => t.vote_average !== null)
      .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
      .slice(0, 2);

    const recommended: Recommendation[] = [];

    for (const likedTitle of topLikedTitles) {
      try {
        const recommendationPath =
          likedTitle.type === 'movie'
            ? `/movie/${likedTitle.tmdb_id}/recommendations`
            : `/tv/${likedTitle.tmdb_id}/recommendations`;

        const recommendationResponse = await $fetch<TMDBResponse>(
          `${tmdbConfig.baseUrl}${recommendationPath}`,
          {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              page: 1,
            },
          }
        );

        // Filter by quality criteria
        const filteredResults = recommendationResponse.results.filter(
          (result) => {
            if (likedTitle.type === 'movie') {
              return result.vote_average >= 7.0 && result.vote_count >= 1000;
            } else {
              return result.vote_average >= 7.2 && result.vote_count >= 1500;
            }
          }
        );

        // Sort by popularity descending AFTER filtering
        const sortedResults = filteredResults.sort(
          (a, b) => b.popularity - a.popularity
        );

        // Process top results
        for (const result of sortedResults.slice(0, 10)) {
          const rec = await transformToRecommendation(result, likedTitle.type);
          if (rec) {
            rec.explanation = 'Recomendado para ti';
            recommended.push(rec);
          }
        }
      } catch (error) {
        console.error(
          `Error fetching recommendations for ${likedTitle.tmdb_id}:`,
          error
        );
      }
    }

    // Deduplicate and limit recommended
    const recommendedMap = new Map<number, Recommendation>();
    recommended.forEach((rec) => {
      if (!recommendedMap.has(rec.tmdb_id)) {
        recommendedMap.set(rec.tmdb_id, rec);
      }
    });
    const finalRecommended = Array.from(recommendedMap.values()).slice(0, 10);

    // 2. TRENDING FOR YOU: Use trending endpoints filtered by top genres
    const basedOnLikes: Recommendation[] = [];

    // Fetch trending movies
    try {
      const trendingMoviesResponse = await $fetch<TMDBResponse>(
        `${tmdbConfig.baseUrl}/trending/movie/week`,
        {
          query: {
            api_key: tmdbConfig.apiKey,
            language: tmdbConfig.language,
            page: 1,
          },
        }
      );

      // Filter by top genres
      const genreFilteredMovies = trendingMoviesResponse.results.filter(
        (result) => {
          return result.genre_ids.some((genreId) =>
            topGenres.includes(genreId)
          );
        }
      );

      for (const result of genreFilteredMovies.slice(0, 10)) {
        const rec = await transformToRecommendation(result, 'movie');
        if (rec) {
          rec.explanation = 'Tendencia esta semana';
          basedOnLikes.push(rec);
        }
      }
    } catch (error) {
      console.error('Error fetching trending movies:', error);
    }

    // Fetch trending TV shows
    try {
      const trendingTVResponse = await $fetch<TMDBResponse>(
        `${tmdbConfig.baseUrl}/trending/tv/week`,
        {
          query: {
            api_key: tmdbConfig.apiKey,
            language: tmdbConfig.language,
            page: 1,
          },
        }
      );

      // Filter by top genres
      const genreFilteredTV = trendingTVResponse.results.filter((result) => {
        return result.genre_ids.some((genreId) => topGenres.includes(genreId));
      });

      for (const result of genreFilteredTV.slice(0, 10)) {
        const rec = await transformToRecommendation(result, 'tv');
        if (rec) {
          rec.explanation = 'Tendencia esta semana';
          basedOnLikes.push(rec);
        }
      }
    } catch (error) {
      console.error('Error fetching trending TV shows:', error);
    }

    // Deduplicate and limit basedOnLikes (trending)
    const basedOnLikesMap = new Map<number, Recommendation>();
    basedOnLikes.forEach((rec) => {
      if (!basedOnLikesMap.has(rec.tmdb_id)) {
        basedOnLikesMap.set(rec.tmdb_id, rec);
      }
    });
    const finalBasedOnLikes = Array.from(basedOnLikesMap.values()).slice(0, 10);

    // 3. EASY TO WATCH: Focus on comedy/animation genres with high quality
    const easyToWatch: Recommendation[] = [];

    // Comedy = 35, Animation = 16
    const lightGenres = [35, 16];
    const genresToUse = lightGenres.filter((g) => topGenres.includes(g));

    // If user doesn't have comedy/animation in top genres, still use them for easy to watch
    const finalLightGenres = genresToUse.length > 0 ? genresToUse : lightGenres;

    // Fetch easy to watch movies
    try {
      const easyMoviesResponse = await $fetch<TMDBResponse>(
        `${tmdbConfig.baseUrl}/discover/movie`,
        {
          query: {
            api_key: tmdbConfig.apiKey,
            language: tmdbConfig.language,
            with_genres: finalLightGenres.join(','),
            include_adult: false,
            page: 1,
          },
        }
      );

      // Filter by quality criteria: vote_average >= 6.8, vote_count >= 800
      const filteredMovies = easyMoviesResponse.results.filter(
        (result) => result.vote_average >= 6.8 && result.vote_count >= 800
      );

      // Sort by popularity descending AFTER filtering
      const sortedMovies = filteredMovies.sort(
        (a, b) => b.popularity - a.popularity
      );

      for (const result of sortedMovies.slice(0, 10)) {
        const rec = await transformToRecommendation(result, 'movie');
        if (rec) {
          rec.explanation = 'Fácil de ver, perfecto para relajarse';
          easyToWatch.push(rec);
        }
      }
    } catch (error) {
      console.error('Error fetching easy to watch movies:', error);
    }

    // Fetch easy to watch TV shows
    try {
      const easyTVResponse = await $fetch<TMDBResponse>(
        `${tmdbConfig.baseUrl}/discover/tv`,
        {
          query: {
            api_key: tmdbConfig.apiKey,
            language: tmdbConfig.language,
            with_genres: finalLightGenres.join(','),
            include_adult: false,
            page: 1,
          },
        }
      );

      // Filter by quality criteria: vote_average >= 6.8, vote_count >= 1000
      const filteredTV = easyTVResponse.results.filter(
        (result) => result.vote_average >= 6.8 && result.vote_count >= 1000
      );

      // Sort by popularity descending AFTER filtering
      const sortedTV = filteredTV.sort((a, b) => b.popularity - a.popularity);

      for (const result of sortedTV.slice(0, 10)) {
        const rec = await transformToRecommendation(result, 'tv');
        if (rec) {
          rec.explanation = 'Fácil de ver, perfecto para relajarse';
          easyToWatch.push(rec);
        }
      }
    } catch (error) {
      console.error('Error fetching easy to watch TV shows:', error);
    }

    // Deduplicate and limit easyToWatch
    const easyToWatchMap = new Map<number, Recommendation>();
    easyToWatch.forEach((rec) => {
      if (!easyToWatchMap.has(rec.tmdb_id)) {
        easyToWatchMap.set(rec.tmdb_id, rec);
      }
    });
    const finalEasyToWatch = Array.from(easyToWatchMap.values()).slice(0, 10);

    const recommendationsResponse: Recommendations = {
      recommended: finalRecommended,
      easyToWatch: finalEasyToWatch,
      basedOnLikes: finalBasedOnLikes,
    };

    return recommendationsResponse;
  } catch (error: unknown) {
    console.error('Error fetching recommendations:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Error al obtener recomendaciones';
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
