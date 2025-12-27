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
 * TMDB Discover API response type
 */
type TMDBDiscoverResult = {
  id: number;
  title?: string; // movies
  name?: string; // tv shows
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string; // movies
  first_air_date?: string; // tv shows
  vote_average: number;
  genre_ids: number[];
  popularity: number;
  runtime?: number; // movies
  episode_run_time?: number[]; // tv shows
};

type TMDBDiscoverResponse = {
  page: number;
  results: TMDBDiscoverResult[];
  total_pages: number;
  total_results: number;
};

/**
 * Get recommendations for the authenticated user
 *
 * Strategy:
 * 1. Fetch user likes from Supabase
 * 2. Extract top 3 genres from liked titles
 * 3. Use TMDB Discover endpoints to fetch recommendations
 * 4. Filter out already liked titles
 * 5. Return 3 buckets: recommended, easyToWatch, basedOnLikes
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
    // Get user's liked titles with their genres
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
    const likedMovies: Array<{ tmdb_id: number; genres: number[] }> = [];
    const likedTVShows: Array<{ tmdb_id: number; genres: number[] }> = [];
    const genreFrequency = new Map<number, number>();

    // Type assertion: Supabase returns titles as object (not array) with !inner join
    (userLikes as unknown as UserLikeWithTitle[]).forEach((like) => {
      const title = like.titles;
      if (title?.tmdb_id) {
        likedTmdbIds.add(title.tmdb_id);

        // Extract genre IDs
        const genreIds: number[] = [];
        if (title.genres && Array.isArray(title.genres)) {
          title.genres.forEach((genre: number | { id?: number }) => {
            const genreId = typeof genre === 'number' ? genre : genre?.id;
            if (genreId) {
              genreIds.push(genreId);
              genreFrequency.set(
                genreId,
                (genreFrequency.get(genreId) || 0) + 1
              );
            }
          });
        }

        if (title.type === 'movie') {
          likedMovies.push({ tmdb_id: title.tmdb_id, genres: genreIds });
        } else if (title.type === 'tv') {
          likedTVShows.push({ tmdb_id: title.tmdb_id, genres: genreIds });
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
      result: TMDBDiscoverResult,
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
        id: `tmdb-${result.id}`, // Generate a temporary ID
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

    // 1. RECOMMENDED: Based on top genres
    const recommended: Recommendation[] = [];

    // Fetch movies
    if (likedMovies.length > 0) {
      try {
        const movieResponse = await $fetch<TMDBDiscoverResponse>(
          `${tmdbConfig.baseUrl}/discover/movie`,
          {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              with_genres: topGenres.join(','),
              'vote_average.gte': 6.5,
              sort_by: 'popularity.desc',
              include_adult: false,
              page: 1,
            },
          }
        );

        for (const result of movieResponse.results.slice(0, 10)) {
          const rec = await transformToRecommendation(result, 'movie');
          if (rec) {
            rec.explanation = 'Basado en tus géneros favoritos';
            recommended.push(rec);
          }
        }
      } catch (error) {
        console.error('Error fetching recommended movies:', error);
      }
    }

    // Fetch TV shows
    if (likedTVShows.length > 0) {
      try {
        const tvResponse = await $fetch<TMDBDiscoverResponse>(
          `${tmdbConfig.baseUrl}/discover/tv`,
          {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              with_genres: topGenres.join(','),
              'vote_average.gte': 6.5,
              sort_by: 'popularity.desc',
              include_adult: false,
              page: 1,
            },
          }
        );

        for (const result of tvResponse.results.slice(0, 10)) {
          const rec = await transformToRecommendation(result, 'tv');
          if (rec) {
            rec.explanation = 'Basado en tus géneros favoritos';
            recommended.push(rec);
          }
        }
      } catch (error) {
        console.error('Error fetching recommended TV shows:', error);
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

    // 2. EASY TO WATCH: Low attention content
    const easyToWatch: Recommendation[] = [];

    // Movies with runtime <= 45 minutes
    if (likedMovies.length > 0) {
      try {
        const movieResponse = await $fetch<TMDBDiscoverResponse>(
          `${tmdbConfig.baseUrl}/discover/movie`,
          {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              'with_runtime.lte': 45,
              'vote_average.gte': 6,
              sort_by: 'popularity.desc',
              include_adult: false,
              page: 1,
            },
          }
        );

        for (const result of movieResponse.results.slice(0, 10)) {
          const rec = await transformToRecommendation(result, 'movie');
          if (rec) {
            rec.explanation = 'Fácil de ver, perfecto para relajarse';
            easyToWatch.push(rec);
          }
        }
      } catch (error) {
        console.error('Error fetching easy to watch movies:', error);
      }
    }

    // TV shows - prefer light genres (comedy, animation) if available
    if (likedTVShows.length > 0) {
      // Check all liked genres for light genres (35 = Comedy, 16 = Animation)
      const allLikedGenres = Array.from(genreFrequency.keys());
      const lightGenres = [35, 16].filter((g) => allLikedGenres.includes(g));
      const genresToUse = lightGenres.length > 0 ? lightGenres : topGenres;

      try {
        const tvResponse = await $fetch<TMDBDiscoverResponse>(
          `${tmdbConfig.baseUrl}/discover/tv`,
          {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              with_genres: genresToUse.join(','),
              'vote_average.gte': 6,
              sort_by: 'popularity.desc',
              include_adult: false,
              page: 1,
            },
          }
        );

        for (const result of tvResponse.results.slice(0, 10)) {
          const rec = await transformToRecommendation(result, 'tv');
          if (rec) {
            rec.explanation = 'Fácil de ver, perfecto para relajarse';
            easyToWatch.push(rec);
          }
        }
      } catch (error) {
        console.error('Error fetching easy to watch TV shows:', error);
      }
    }

    // Deduplicate and limit easyToWatch
    const easyToWatchMap = new Map<number, Recommendation>();
    easyToWatch.forEach((rec) => {
      if (!easyToWatchMap.has(rec.tmdb_id)) {
        easyToWatchMap.set(rec.tmdb_id, rec);
      }
    });
    const finalEasyToWatch = Array.from(easyToWatchMap.values()).slice(0, 10);

    // 3. BASED ON LIKES: Similar titles to 1-2 liked titles
    const basedOnLikes: Recommendation[] = [];

    // Pick 1-2 liked titles (prefer those with higher ratings)
    const titlesToUse = [
      ...likedMovies.map((m) => ({ ...m, type: 'movie' as const })),
      ...likedTVShows.map((t) => ({ ...t, type: 'tv' as const })),
    ]
      .sort(() => Math.random() - 0.5) // Randomize selection
      .slice(0, 2);

    for (const likedTitle of titlesToUse) {
      try {
        const similarPath =
          likedTitle.type === 'movie'
            ? `/movie/${likedTitle.tmdb_id}/similar`
            : `/tv/${likedTitle.tmdb_id}/similar`;

        const similarResponse = await $fetch<TMDBDiscoverResponse>(
          `${tmdbConfig.baseUrl}${similarPath}`,
          {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              page: 1,
            },
          }
        );

        for (const result of similarResponse.results.slice(0, 10)) {
          const rec = await transformToRecommendation(result, likedTitle.type);
          if (rec) {
            rec.explanation = 'Similar a algo que te gusta';
            basedOnLikes.push(rec);
          }
        }
      } catch (error) {
        console.error(
          `Error fetching similar titles for ${likedTitle.tmdb_id}:`,
          error
        );
      }
    }

    // Deduplicate and limit basedOnLikes
    const basedOnLikesMap = new Map<number, Recommendation>();
    basedOnLikes.forEach((rec) => {
      if (!basedOnLikesMap.has(rec.tmdb_id)) {
        basedOnLikesMap.set(rec.tmdb_id, rec);
      }
    });
    const finalBasedOnLikes = Array.from(basedOnLikesMap.values()).slice(0, 10);

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
