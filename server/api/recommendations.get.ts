import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getTMDBConfig } from '../utils/config';
import { devLog, devError, devWarn, safeError } from '../utils/logger';
import {
  Recommendations,
  Recommendation,
  Provider,
} from '@/types/Recommendation';
import { TitleStatus } from '@/types/TitleStatus';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';

/**
 * Quality criteria constants for recommendations
 */
const MIN_VOTE_AVERAGE = 7.0;
const MIN_VOTE_COUNT_MOVIE = 1000;
const MIN_VOTE_COUNT_TV = 1500;
const MIN_VOTE_COUNT_EASY_MOVIE = 800;
const MIN_VOTE_COUNT_EASY_TV = 1000;

/**
 * Minimum number of recommendations per list
 */
const MIN_RECOMMENDATIONS_PER_LIST = 6;
const MAX_RECOMMENDATIONS_PER_LIST = 10;

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
 *    - Filter: vote_average >= 7.0, vote_count >= 1000 (movies), >= 1500 (tv)
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
      devLog('[Recommendations] User from cookies');
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
            devLog('[Recommendations] User from Authorization header');
          }
        }
      } catch (err) {
        safeError('[Recommendations] Error decoding token', err);
      }
    } else {
      devWarn(
        '[Recommendations] No user from cookies and no Authorization header'
      );
    }
  }

  if (!user || !userId) {
    devError('[Recommendations] Unauthorized - no user found');
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  // Create Supabase client - Use SERVICE_ROLE_KEY in production to bypass RLS
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    devWarn(
      '[Recommendations] WARNING: Using anon key instead of service role key. RLS policies may block queries.'
    );
  }

  const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    // Get user's liked tmdb_ids (where liked=true) - include type for reference
    const { data: userLikedStatuses, error: likesError } = await supabase
      .from('user_title_status')
      .select('tmdb_id, type')
      .eq('user_id', userId)
      .eq('liked', true);

    if (likesError) {
      safeError(
        '[Recommendations] Error fetching user_title_status (liked)',
        likesError,
        {
          userId,
          supabaseUrl: config.public.supabaseUrl,
        }
      );
      throw likesError;
    }

    devLog(
      '[Recommendations] User likes count:',
      userLikedStatuses?.length || 0
    );

    if (!userLikedStatuses || userLikedStatuses.length === 0) {
      devLog(
        '[Recommendations] No user likes found, returning empty recommendations'
      );
      return {
        recommended: [],
        easyToWatch: [],
        basedOnLikes: [],
      };
    }

    // Get excluded titles (seen + not_interested only - watchlist titles can appear in recommendations)
    const { data: excludedStatuses, error: statusError } = await supabase
      .from('user_title_status')
      .select('tmdb_id')
      .eq('user_id', userId)
      .in('status', [TitleStatus.SEEN, TitleStatus.NOT_INTERESTED]);

    if (statusError) {
      safeError('Error fetching user_title_status', statusError);
      // Don't throw - continue without filtering if there's an error
    }

    // Build set of excluded tmdb_ids (only seen and not_interested)
    const excludedTmdbIds = new Set<number>();
    if (excludedStatuses) {
      excludedStatuses.forEach((status) => {
        excludedTmdbIds.add(status.tmdb_id);
      });
    }

    // Get watchlist titles to mark them in recommendations
    const { data: watchlistStatuses, error: watchlistError } = await supabase
      .from('user_title_status')
      .select('tmdb_id')
      .eq('user_id', userId)
      .eq('status', TitleStatus.WATCHLIST);

    if (watchlistError) {
      safeError('Error fetching watchlist statuses', watchlistError);
      // Don't throw - continue without watchlist info if there's an error
    }

    // Build set of watchlist tmdb_ids
    const watchlistTmdbIds = new Set<number>();
    if (watchlistStatuses) {
      watchlistStatuses.forEach((status) => {
        watchlistTmdbIds.add(status.tmdb_id);
      });
    }

    // Extract liked tmdb_ids
    const likedTmdbIds = new Set<number>();
    userLikedStatuses.forEach((likedStatus) => {
      likedTmdbIds.add(likedStatus.tmdb_id);
    });

    // Get titles data for liked tmdb_ids
    const { data: likedTitlesData, error: titlesError } = await supabase
      .from('titles')
      .select('id, genres, type, tmdb_id, vote_average')
      .in('tmdb_id', Array.from(likedTmdbIds));

    if (titlesError) {
      safeError(
        '[Recommendations] Error fetching titles for liked tmdb_ids',
        titlesError,
        {
          userId,
          likedTmdbIds: Array.from(likedTmdbIds),
        }
      );
      throw titlesError;
    }

    // Extract data from user liked titles
    const likedTitlesWithRating: Array<{
      tmdb_id: number;
      type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
      vote_average: number | null;
    }> = [];
    const genreFrequency = new Map<number, number>();

    if (likedTitlesData) {
      likedTitlesData.forEach((title) => {
        if (title?.tmdb_id) {
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
    }

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

    // Helper function to fetch multiple pages if needed to reach minimum
    const fetchUntilMinimum = async (
      baseUrl: string,
      queryParams: Record<string, unknown>,
      type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv,
      explanation: string,
      minCount: number = MIN_RECOMMENDATIONS_PER_LIST,
      maxCount: number = MAX_RECOMMENDATIONS_PER_LIST
    ): Promise<Recommendation[]> => {
      const allResults: Recommendation[] = [];
      let page = 1;
      const maxPages = 3; // Limit to 3 pages to avoid too many requests

      while (allResults.length < minCount && page <= maxPages) {
        try {
          const response = await $fetch<TMDBResponse>(baseUrl, {
            query: {
              ...queryParams,
              page,
            },
          });

          if (!response.results || response.results.length === 0) break;

          // Filter by quality criteria
          const filtered = response.results.filter((result) => {
            if (type === MediaTypeEnum.movie) {
              return (
                result.vote_average >= MIN_VOTE_AVERAGE &&
                result.vote_count >= MIN_VOTE_COUNT_MOVIE
              );
            } else {
              return (
                result.vote_average >= MIN_VOTE_AVERAGE &&
                result.vote_count >= MIN_VOTE_COUNT_TV
              );
            }
          });

          // Sort by popularity
          const sorted = filtered.sort((a, b) => b.popularity - a.popularity);

          // Process results
          for (const result of sorted) {
            if (allResults.length >= maxCount) break;
            const rec = await transformToRecommendation(result, type);
            if (rec) {
              rec.explanation = explanation;
              allResults.push(rec);
            }
          }

          // If we have enough, break
          if (allResults.length >= minCount) break;

          // If this was the last page, break
          if (page >= response.total_pages) break;

          page++;
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error fetching page ${page}:`, error);
          }
          break;
        }
      }

      return allResults;
    };

    // Helper function to transform TMDB result to Recommendation
    const transformToRecommendation = async (
      result: TMDBResult,
      type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv
    ): Promise<Recommendation | null> => {
      // Skip if already liked
      if (likedTmdbIds.has(result.id)) {
        return null;
      }

      // Skip if excluded (seen or not_interested)
      if (excludedTmdbIds.has(result.id)) {
        return null;
      }

      // Ensure minimum vote_average for all recommendations
      if (!result.vote_average || result.vote_average < MIN_VOTE_AVERAGE) {
        return null;
      }

      // Fetch providers
      let providers: Provider[] = [];
      try {
        const providerPath =
          type === MediaTypeEnum.movie
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
        if (process.env.NODE_ENV === 'development') {
          console.error(`Error fetching providers for ${result.id}:`, error);
        }
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
        in_watchlist: watchlistTmdbIds.has(result.id), // Mark if in watchlist
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
          likedTitle.type === MediaTypeEnum.movie
            ? `/movie/${likedTitle.tmdb_id}/recommendations`
            : `/tv/${likedTitle.tmdb_id}/recommendations`;

        const results = await fetchUntilMinimum(
          `${tmdbConfig.baseUrl}${recommendationPath}`,
          {
            api_key: tmdbConfig.apiKey,
            language: tmdbConfig.language,
          },
          likedTitle.type,
          'Recomendado para ti',
          MIN_RECOMMENDATIONS_PER_LIST,
          MAX_RECOMMENDATIONS_PER_LIST
        );

        recommended.push(...results);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error(
            `Error fetching recommendations for ${likedTitle.tmdb_id}:`,
            error
          );
        }
      }
    }

    // Deduplicate and limit recommended
    const recommendedMap = new Map<number, Recommendation>();
    recommended.forEach((rec) => {
      if (!recommendedMap.has(rec.tmdb_id)) {
        recommendedMap.set(rec.tmdb_id, rec);
      }
    });
    const finalRecommended = Array.from(recommendedMap.values()).slice(
      0,
      MAX_RECOMMENDATIONS_PER_LIST
    );

    // 2. TRENDING FOR YOU: Use trending endpoints filtered by top genres
    const basedOnLikes: Recommendation[] = [];

    // Helper to fetch trending with genre filter
    const fetchTrendingWithGenres = async (
      endpoint: string,
      type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv,
      minCount: number = MIN_RECOMMENDATIONS_PER_LIST
    ): Promise<Recommendation[]> => {
      const results: Recommendation[] = [];
      let page = 1;
      const maxPages = 3;

      while (results.length < minCount && page <= maxPages) {
        try {
          const response = await $fetch<TMDBResponse>(
            `${tmdbConfig.baseUrl}${endpoint}`,
            {
              query: {
                api_key: tmdbConfig.apiKey,
                language: tmdbConfig.language,
                page,
              },
            }
          );

          if (!response.results || response.results.length === 0) break;

          // Filter by top genres and quality criteria
          const filtered = response.results.filter((result) => {
            const hasTopGenre = result.genre_ids.some((genreId) =>
              topGenres.includes(genreId)
            );
            const meetsQualityCriteria =
              type === MediaTypeEnum.movie
                ? result.vote_average >= MIN_VOTE_AVERAGE &&
                  result.vote_count >= MIN_VOTE_COUNT_MOVIE
                : result.vote_average >= MIN_VOTE_AVERAGE &&
                  result.vote_count >= MIN_VOTE_COUNT_TV;
            return hasTopGenre && meetsQualityCriteria;
          });

          // Sort by popularity
          const sorted = filtered.sort((a, b) => b.popularity - a.popularity);

          // Process results
          for (const result of sorted) {
            if (results.length >= MAX_RECOMMENDATIONS_PER_LIST) break;
            const rec = await transformToRecommendation(result, type);
            if (
              rec &&
              rec.vote_average !== null &&
              rec.vote_average >= MIN_VOTE_AVERAGE
            ) {
              rec.explanation = 'Tendencia esta semana';
              results.push(rec);
            }
          }

          if (results.length >= minCount) break;
          if (page >= response.total_pages) break;
          page++;
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error fetching ${endpoint} page ${page}:`, error);
          }
          break;
        }
      }

      return results;
    };

    // Fetch trending movies
    try {
      const movieResults = await fetchTrendingWithGenres(
        '/trending/movie/week',
        MediaTypeEnum.movie,
        MIN_RECOMMENDATIONS_PER_LIST
      );
      basedOnLikes.push(...movieResults);

      if (process.env.NODE_ENV === 'development') {
        devLog('[Recommendations] BasedOnLikes movies added:', {
          count: movieResults.length,
          items: movieResults.map((r) => ({
            title: r.title,
            vote_average: r.vote_average,
          })),
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching trending movies:', error);
      }
    }

    // Fetch trending TV shows
    try {
      const tvResults = await fetchTrendingWithGenres(
        '/trending/tv/week',
        MediaTypeEnum.tv,
        MIN_RECOMMENDATIONS_PER_LIST
      );
      basedOnLikes.push(...tvResults);

      if (process.env.NODE_ENV === 'development') {
        devLog('[Recommendations] BasedOnLikes TV added:', {
          count: tvResults.length,
          items: tvResults.map((r) => ({
            title: r.title,
            vote_average: r.vote_average,
          })),
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching trending TV shows:', error);
      }
    }

    // Deduplicate and limit basedOnLikes (trending)
    const basedOnLikesMap = new Map<number, Recommendation>();
    basedOnLikes.forEach((rec) => {
      if (!basedOnLikesMap.has(rec.tmdb_id)) {
        basedOnLikesMap.set(rec.tmdb_id, rec);
      }
    });
    const finalBasedOnLikes = Array.from(basedOnLikesMap.values()).slice(
      0,
      MAX_RECOMMENDATIONS_PER_LIST
    );

    if (process.env.NODE_ENV === 'development') {
      devLog('[Recommendations] Final basedOnLikes array:', {
        total: finalBasedOnLikes.length,
        items: finalBasedOnLikes.map((r) => ({
          title: r.title,
          type: r.type,
          vote_average: r.vote_average,
        })),
      });
    }

    // 3. EASY TO WATCH: Focus on comedy/animation genres with high quality
    const easyToWatch: Recommendation[] = [];

    // Comedy = 35, Animation = 16
    const lightGenres = [35, 16];
    const genresToUse = lightGenres.filter((g) => topGenres.includes(g));

    // If user doesn't have comedy/animation in top genres, still use them for easy to watch
    const finalLightGenres = genresToUse.length > 0 ? genresToUse : lightGenres;

    // Helper to fetch discover with genres
    const fetchDiscoverWithGenres = async (
      endpoint: string,
      type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv,
      genres: number[],
      minCount: number = MIN_RECOMMENDATIONS_PER_LIST
    ): Promise<Recommendation[]> => {
      const results: Recommendation[] = [];
      let page = 1;
      const maxPages = 3;

      while (results.length < minCount && page <= maxPages) {
        try {
          const response = await $fetch<TMDBResponse>(
            `${tmdbConfig.baseUrl}${endpoint}`,
            {
              query: {
                api_key: tmdbConfig.apiKey,
                language: tmdbConfig.language,
                with_genres: genres.join(','),
                include_adult: false,
                page,
              },
            }
          );

          if (!response.results || response.results.length === 0) break;

          // Filter by quality criteria
          const filtered = response.results.filter((result) => {
            const minVoteCount =
              type === MediaTypeEnum.movie
                ? MIN_VOTE_COUNT_EASY_MOVIE
                : MIN_VOTE_COUNT_EASY_TV;
            return (
              result.vote_average >= MIN_VOTE_AVERAGE &&
              result.vote_count >= minVoteCount
            );
          });

          // Sort by popularity
          const sorted = filtered.sort((a, b) => b.popularity - a.popularity);

          // Process results
          for (const result of sorted) {
            if (results.length >= MAX_RECOMMENDATIONS_PER_LIST) break;
            const rec = await transformToRecommendation(result, type);
            if (rec) {
              rec.explanation = 'Fácil de ver, perfecto para relajarse';
              results.push(rec);
            }
          }

          if (results.length >= minCount) break;
          if (page >= response.total_pages) break;
          page++;
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error fetching ${endpoint} page ${page}:`, error);
          }
          break;
        }
      }

      return results;
    };

    // Fetch easy to watch movies
    try {
      const movieResults = await fetchDiscoverWithGenres(
        '/discover/movie',
        MediaTypeEnum.movie,
        finalLightGenres,
        MIN_RECOMMENDATIONS_PER_LIST
      );
      easyToWatch.push(...movieResults);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching easy to watch movies:', error);
      }
    }

    // Fetch easy to watch TV shows
    try {
      const tvResults = await fetchDiscoverWithGenres(
        '/discover/tv',
        MediaTypeEnum.tv,
        finalLightGenres,
        MIN_RECOMMENDATIONS_PER_LIST
      );
      easyToWatch.push(...tvResults);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
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
    const finalEasyToWatch = Array.from(easyToWatchMap.values()).slice(
      0,
      MAX_RECOMMENDATIONS_PER_LIST
    );

    // Ensure each list has at least MIN_RECOMMENDATIONS_PER_LIST items
    // Log warnings if any list has fewer items (may happen if not enough results available)
    if (process.env.NODE_ENV === 'development') {
      if (finalRecommended.length < MIN_RECOMMENDATIONS_PER_LIST) {
        devWarn(
          `[Recommendations] Recommended list has only ${finalRecommended.length} items (minimum: ${MIN_RECOMMENDATIONS_PER_LIST})`
        );
      }
      if (finalBasedOnLikes.length < MIN_RECOMMENDATIONS_PER_LIST) {
        devWarn(
          `[Recommendations] BasedOnLikes list has only ${finalBasedOnLikes.length} items (minimum: ${MIN_RECOMMENDATIONS_PER_LIST})`
        );
      }
      if (finalEasyToWatch.length < MIN_RECOMMENDATIONS_PER_LIST) {
        devWarn(
          `[Recommendations] EasyToWatch list has only ${finalEasyToWatch.length} items (minimum: ${MIN_RECOMMENDATIONS_PER_LIST})`
        );
      }
    }

    const recommendationsResponse: Recommendations = {
      recommended: finalRecommended,
      easyToWatch: finalEasyToWatch,
      basedOnLikes: finalBasedOnLikes,
    };

    return recommendationsResponse;
  } catch (error: unknown) {
    safeError('Error fetching recommendations', error);
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
