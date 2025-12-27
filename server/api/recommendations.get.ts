import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getTMDBConfig } from '../utils/config';
import {
  Recommendations,
  Recommendation,
  Provider,
} from '@/types/Recommendation';
import { UserLike } from '@/types/UserLike';

/**
 * Get recommendations for the authenticated user
 * Logic:
 * 1. Get user's liked titles and their genres
 * 2. Find titles with shared genres (excluding already liked)
 * 3. Prioritize by genre match count, then popularity (vote_average)
 * 4. Return recommendations with explanations
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  let user = null;
  let userId: string | null = null;

  // Try to get user from cookies first (default Supabase behavior)
  const userFromCookies = await serverSupabaseUser(event);

  if (userFromCookies) {
    // serverSupabaseUser returns the JWT payload, which has 'sub' not 'id'
    userId =
      userFromCookies.id || (userFromCookies as { sub?: string }).sub || null;
    console.log('🔴 [Server] User from cookies:', {
      hasId: !!userFromCookies.id,
      hasSub: !!(userFromCookies as { sub?: string }).sub,
      userId,
    });

    if (userId) {
      user = { id: userId, sub: userId };
    }
  } else {
    // If no user from cookies, try to get from Authorization header
    const authHeader = event.node.req.headers.authorization;
    console.log('🔴 [Server] Auth header:', authHeader ? 'Present' : 'Missing');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('🔴 [Server] Token received, length:', token.length);

      try {
        // Decode JWT token to get user ID (sub claim)
        // JWT format: header.payload.signature
        const parts = token.split('.');
        if (parts.length === 3) {
          // Decode payload (base64url)
          // Replace URL-safe base64 characters
          const payload = JSON.parse(
            Buffer.from(
              parts[1].replace(/-/g, '+').replace(/_/g, '/'),
              'base64'
            ).toString()
          );

          // Extract user ID from 'sub' claim
          userId = payload.sub;
          console.log('🔴 [Server] User ID extracted from token:', userId);

          if (userId) {
            user = { id: userId, sub: userId };
            console.log('🔴 [Server] User set from token:', userId);
          } else {
            console.error('🔴 [Server] No sub claim in token payload');
          }
        } else {
          console.error('🔴 [Server] Invalid token format');
        }
      } catch (err) {
        console.error('🔴 [Server] Exception decoding token:', err);
      }
    }
  }

  if (!user || !userId) {
    console.error('🔴 [Server] No user found, returning 401');
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  console.log('🔴 [Server] User authenticated:', user.id);

  // For RLS to work properly, we need to use service role key OR properly set auth context
  // Using service role key temporarily to bypass RLS (ONLY FOR DEVELOPMENT)
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;

  // Create a new client with service role key for queries (bypasses RLS)
  const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    // Debug: Log user ID being used
    console.log('Server: Using userId:', userId);
    console.log('Server: User object:', JSON.stringify(user, null, 2));

    // Get user's liked titles with their genres
    // Note: We're using userId directly in the query, which should work even if RLS is blocking
    // because we're explicitly filtering by user_id
    const { data: userLikes, error: likesError } = await supabase
      .from('user_likes')
      .select('title_id, titles!inner(id, genres, type, tmdb_id)')
      .eq('user_id', userId);

    console.log('Server: userLikes with join:', userLikes?.length || 0);
    console.log('Server: likesError:', likesError);

    if (likesError) {
      console.error('Server: Error fetching user_likes:', likesError);
      throw likesError;
    }

    if (!userLikes || userLikes.length === 0) {
      return {
        recommended: [],
        easyToWatch: [],
        basedOnLikes: [],
      };
    }

    // Extract genre IDs from liked titles
    const likedGenreIds = new Set<number>();
    const likedTitleIds = new Set<string>();
    const likedTmdbIds = new Set<number>();
    const likedTypes = new Set<'movie' | 'tv'>();

    userLikes.forEach((like: UserLike) => {
      likedTitleIds.add(like.title_id);
      if (like.titles?.tmdb_id) {
        likedTmdbIds.add(like.titles.tmdb_id);
      }
      if (like.titles?.type) {
        likedTypes.add(like.titles.type);
      }
      if (like.titles?.genres && Array.isArray(like.titles.genres)) {
        // Genres can be array of numbers (genre_ids) or array of objects with id
        like.titles.genres.forEach((genre: number | { id?: number }) => {
          const genreId = typeof genre === 'number' ? genre : genre?.id;
          if (genreId) {
            likedGenreIds.add(genreId);
          }
        });
      }
    });

    console.log('Server: Extracted from user likes:', {
      likedGenreIds: Array.from(likedGenreIds),
      likedTitleIds: Array.from(likedTitleIds).slice(0, 5),
      likedTmdbIds: Array.from(likedTmdbIds).slice(0, 5),
      likedTypes: Array.from(likedTypes),
    });

    if (likedGenreIds.size === 0) {
      console.log(
        'Server: No liked genres found, returning empty recommendations.'
      );
      return {
        recommended: [],
        easyToWatch: [],
        basedOnLikes: [],
      };
    }

    // Get all titles (we'll filter out liked ones in JavaScript)
    const { data: allTitles, error: titlesError } = await supabase
      .from('titles')
      .select('*');

    if (titlesError) throw titlesError;

    console.log('Server: Total titles in database:', allTitles?.length || 0);

    // Filter out titles already liked by the user
    const filteredTitles = (allTitles || []).filter(
      (title) =>
        !likedTitleIds.has(title.id) && !likedTmdbIds.has(title.tmdb_id)
    );

    console.log(
      'Server: Filtered titles (excluding liked):',
      filteredTitles.length
    );

    if (filteredTitles.length === 0) {
      console.log(
        'Server: No filtered titles after excluding liked ones, returning empty recommendations.'
      );
      return {
        recommended: [],
        easyToWatch: [],
        basedOnLikes: [],
      };
    }

    // Score titles based on genre matches and popularity
    const scoredTitles = filteredTitles
      .map((title) => {
        const titleGenres = Array.isArray(title.genres)
          ? title.genres.map((g: number | { id?: number }) =>
              typeof g === 'number' ? g : g?.id || 0
            )
          : [];
        const matchingGenres = titleGenres.filter((g: number) =>
          likedGenreIds.has(g)
        );
        const genreMatchScore = matchingGenres.length;
        const popularityScore = title.vote_average || 0;
        const typeMatch = likedTypes.has(title.type) ? 1 : 0;

        // Combined score: genre matches (weighted heavily) + popularity + type match
        const score =
          genreMatchScore * 10 + popularityScore * 2 + typeMatch * 5;

        return {
          ...title,
          genreMatchScore,
          matchingGenres,
          score,
        };
      })
      .filter((title) => title.genreMatchScore > 0) // Only titles with at least one matching genre
      .sort((a, b) => b.score - a.score);

    console.log(
      'Server: Scored titles (with genre matches):',
      scoredTitles.length
    );

    // Get top recommendations (up to 20)
    const topRecommendations = scoredTitles.slice(0, 20);

    console.log(
      'Server: Top recommendations (before fetching providers):',
      topRecommendations.length
    );

    // Fetch providers and generate explanations for recommendations
    const config = getTMDBConfig();
    const userRecommendations: Recommendation[] = await Promise.all(
      topRecommendations.map(async (title) => {
        // Fetch providers from TMDB
        let providers: Provider[] = [];
        try {
          const providerPath =
            title.type === 'movie'
              ? `/movie/${title.tmdb_id}/watch/providers`
              : `/tv/${title.tmdb_id}/watch/providers`;
          const providerResponse = await $fetch<{
            results?: {
              ES?: {
                flatrate?: Provider[];
                buy?: Provider[];
                rent?: Provider[];
              };
            };
          }>(`${config.baseUrl}${providerPath}`, {
            query: {
              api_key: config.apiKey,
              language: config.language,
            },
          });

          const esProviders = providerResponse.results?.ES;
          if (esProviders) {
            // Prioritize streaming (flatrate) over buy/rent
            const streamingProviders = esProviders.flatrate || [];
            const buyProviders = esProviders.buy || [];
            const rentProviders = esProviders.rent || [];
            providers = [
              ...streamingProviders,
              ...buyProviders,
              ...rentProviders,
            ].slice(0, 5); // Limit to 5 providers
          }
        } catch (error) {
          console.error(`Error fetching providers for ${title.title}:`, error);
        }

        // Generate better explanations based on genre matches
        const genreCount = title.matchingGenres.length;
        const typeText = title.type === 'movie' ? 'películas' : 'series';
        let explanation = '';

        if (genreCount >= 3) {
          explanation = `Porque te gustan las ${typeText} de estos géneros`;
        } else if (genreCount === 2) {
          explanation = `Porque te gustan ${typeText} con géneros similares`;
        } else {
          explanation = `Porque te gustan ${typeText} similares`;
        }

        // Add popularity context if high rating
        if (title.vote_average && title.vote_average >= 8.0) {
          explanation += ' y tiene excelentes críticas';
        } else if (title.vote_average && title.vote_average >= 7.0) {
          explanation += ' y tiene buenas críticas';
        }

        return {
          id: title.id,
          tmdb_id: title.tmdb_id,
          title: title.title,
          type: title.type,
          poster_path: title.poster_path,
          overview: title.overview,
          vote_average: title.vote_average,
          genres: title.genres as number[],
          release_date: title.release_date,
          first_air_date: title.first_air_date,
          explanation,
          providers,
        };
      })
    );

    // "Easy to watch" - High rating, popular titles (top 10 by vote_average)
    // Fetch providers for easy to watch titles
    const easyToWatchTitles = scoredTitles
      .filter((title) => (title.vote_average || 0) >= 7.5)
      .slice(0, 10);

    const easyToWatch: Recommendation[] = await Promise.all(
      easyToWatchTitles.map(async (title) => {
        // Fetch providers from TMDB
        let providers: Provider[] = [];
        try {
          const providerPath =
            title.type === 'movie'
              ? `/movie/${title.tmdb_id}/watch/providers`
              : `/tv/${title.tmdb_id}/watch/providers`;
          const providerResponse = await $fetch<{
            results?: {
              ES?: {
                flatrate?: Provider[];
                buy?: Provider[];
                rent?: Provider[];
              };
            };
          }>(`${config.baseUrl}${providerPath}`, {
            query: {
              api_key: config.apiKey,
              language: config.language,
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
          console.error(`Error fetching providers for ${title.title}:`, error);
        }

        const recommendation: Recommendation = {
          id: title.id,
          tmdb_id: title.tmdb_id,
          title: title.title,
          type: title.type,
          poster_path: title.poster_path,
          overview: title.overview,
          vote_average: title.vote_average,
          genres: title.genres as number[],
          release_date: title.release_date,
          first_air_date: title.first_air_date,
          explanation: title.explanation,
          providers,
        };

        return recommendation;
      })
    );

    // "Based on what you like" - Top matches (top 10)
    const basedOnLikes = userRecommendations.slice(0, 10);

    // "Recommended for you" - All recommendations (up to 20)
    const recommended = userRecommendations.slice(0, 20);

    const recommendationsResponse: Recommendations = {
      recommended: recommended,
      easyToWatch: easyToWatch,
      basedOnLikes: basedOnLikes,
    };

    console.log('Server: Returning recommendations:', {
      recommendationsResponse,
    });

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
