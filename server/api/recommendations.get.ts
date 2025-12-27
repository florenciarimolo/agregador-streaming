import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getTMDBConfig } from '../utils/config';

interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

interface Recommendation {
  id: string;
  tmdb_id: number;
  title: string;
  type: 'movie' | 'tv';
  poster_path: string | null;
  overview: string | null;
  vote_average: number | null;
  genres: number[] | null;
  release_date: string | null;
  first_air_date: string | null;
  explanation: string;
  providers: Provider[];
}

/**
 * Get recommendations for the authenticated user
 * Logic:
 * 1. Get user's liked titles and their genres
 * 2. Find titles with shared genres (excluding already liked)
 * 3. Prioritize by genre match count, then popularity (vote_average)
 * 4. Return recommendations with explanations
 */
export default defineEventHandler(async (event) => {
  // Try to get user from cookies first (default Supabase behavior)
  let user = await serverSupabaseUser(event);

  // If no user from cookies, try to get from Authorization header
  if (!user) {
    const authHeader = event.node.req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Create a new Supabase client with the token to ensure RLS works
      const supabase = await serverSupabaseClient(event);
      const {
        data: { user: userFromToken },
        error,
      } = await supabase.auth.getUser(token);
      if (!error && userFromToken) {
        user = { id: userFromToken.id, sub: userFromToken.id } as any;
      }
    }
  }

  // Logs removed for production

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  // Get Supabase client
  // For RLS to work, we need to use service role key OR properly set auth context
  // Using service role key temporarily to bypass RLS (ONLY FOR DEVELOPMENT)
  const config = useRuntimeConfig();
  const authHeader = event.node.req.headers.authorization;

  // Use service role key if available (bypasses RLS) - ONLY FOR DEVELOPMENT
  // In production, we should use the anon key with proper RLS setup
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;

  const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // Verify the user from the token matches the user we're querying for
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const {
      data: { user: tokenUser },
      error: tokenError,
    } = await supabase.auth.getUser(token);
    if (tokenError || !tokenUser || tokenUser.id !== user.id) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized - token mismatch',
      });
    }
  }

  try {
    // Debug: Log user ID being used
    console.log('Server: Using user.id:', user.id);
    console.log('Server: User object:', JSON.stringify(user, null, 2));

    // Get user's liked titles with their genres
    // Note: We're using user.id directly in the query, which should work even if RLS is blocking
    // because we're explicitly filtering by user_id
    const { data: userLikes, error: likesError } = await supabase
      .from('user_likes')
      .select('title_id, titles!inner(id, genres, type, tmdb_id)')
      .eq('user_id', user.id);

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

    userLikes.forEach(
      (like: {
        title_id: string;
        titles?: {
          tmdb_id?: number;
          type?: 'movie' | 'tv';
          genres?: number[] | Array<{ id?: number }>;
        };
      }) => {
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
      }
    );

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
    const recommendations: Recommendation[] = await Promise.all(
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
          explanation: 'Fácil de ver - Alta calificación',
          providers,
        };
      })
    );

    // "Based on what you like" - Top matches (top 10)
    const basedOnLikes = recommendations.slice(0, 10);

    // "Recommended for you" - All recommendations (up to 20)
    const recommended = recommendations.slice(0, 20);

    console.log('Server: Returning recommendations:', {
      recommended: recommended.length,
      easyToWatch: easyToWatch.length,
      basedOnLikes: basedOnLikes.length,
    });

    return {
      recommended,
      easyToWatch,
      basedOnLikes,
    };
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
