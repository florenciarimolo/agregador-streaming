import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getTMDBConfig } from '../utils/config';
import { devLog, devError, devWarn, safeError } from '../utils/logger';

/**
 * Get user title status history (seen and not_interested)
 * Returns titles with full TMDB details
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  let user = null;
  let userId: string | null = null;

  // Try to get user from cookies first
  const userFromCookies = await serverSupabaseUser(event);

  if (userFromCookies) {
    userId =
      userFromCookies.id || (userFromCookies as { sub?: string }).sub || null;

    if (userId) {
      user = { id: userId, sub: userId };
      devLog('[User History] User from cookies');
    }
  } else {
    // Try Authorization header
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
            devLog('[User History] User from Authorization header');
          }
        }
      } catch (err) {
        safeError('[User History] Error decoding token', err);
      }
    } else {
      devWarn(
        '[User History] No user from cookies and no Authorization header'
      );
    }
  }

  if (!user || !userId) {
    devError('[User History] Unauthorized - no user found');
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
      '[User History] WARNING: Using anon key instead of service role key. RLS policies may block queries.'
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
    // Fetch user title statuses
    const { data: statuses, error: statusError } = await supabase
      .from('user_title_status')
      .select('tmdb_id, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (statusError) {
      safeError(
        '[User History] Error fetching user title statuses',
        statusError,
        {
          userId,
          supabaseUrl: config.public.supabaseUrl,
        }
      );
      throw createError({
        statusCode: 500,
        message: 'Error al obtener el historial',
      });
    }

    devLog('[User History] Statuses count:', statuses?.length || 0);

    if (!statuses || statuses.length === 0) {
      devLog('[User History] No statuses found for user');
      return {
        seen: [],
        not_interested: [],
      };
    }

    // Get TMDB config
    const tmdbConfig = getTMDBConfig();

    // Fetch TMDB details for each title
    type TMDBTitle = {
      id: number;
      title?: string;
      name?: string;
      poster_path: string | null;
      [key: string]: unknown;
    };

    const seenPromises: Promise<
      | (TMDBTitle & {
          type: string;
          tmdb_id: number;
          status: string;
          created_at: string;
        })
      | null
    >[] = [];
    const notInterestedPromises: Promise<
      | (TMDBTitle & {
          type: string;
          tmdb_id: number;
          status: string;
          created_at: string;
        })
      | null
    >[] = [];

    for (const status of statuses) {
      // Determine if it's a movie or TV show by trying both
      // We'll fetch both and see which one returns data
      const fetchPromise = Promise.allSettled([
        $fetch<TMDBTitle>(`${tmdbConfig.baseUrl}/movie/${status.tmdb_id}`, {
          query: {
            api_key: tmdbConfig.apiKey,
            language: tmdbConfig.language,
            include_adult: tmdbConfig.includeAdult,
          },
        }),
        $fetch<TMDBTitle>(`${tmdbConfig.baseUrl}/tv/${status.tmdb_id}`, {
          query: {
            api_key: tmdbConfig.apiKey,
            language: tmdbConfig.language,
            include_adult: tmdbConfig.includeAdult,
          },
        }),
      ]).then((results) => {
        // Find which one succeeded
        const movieResult = results[0];
        const tvResult = results[1];

        if (movieResult.status === 'fulfilled' && movieResult.value?.id) {
          return {
            ...movieResult.value,
            type: 'movie',
            tmdb_id: status.tmdb_id,
            status: status.status,
            created_at: status.created_at,
          };
        } else if (tvResult.status === 'fulfilled' && tvResult.value?.id) {
          return {
            ...tvResult.value,
            type: 'tv',
            tmdb_id: status.tmdb_id,
            status: status.status,
            created_at: status.created_at,
          };
        }
        return null;
      });

      if (status.status === 'seen') {
        seenPromises.push(fetchPromise);
      } else {
        notInterestedPromises.push(fetchPromise);
      }
    }

    // Wait for all promises
    const [seenResults, notInterestedResults] = await Promise.all([
      Promise.all(seenPromises),
      Promise.all(notInterestedPromises),
    ]);

    // Filter out null results and format
    const seen = seenResults
      .filter((result) => result !== null)
      .map((result) => ({
        ...result,
        title: result.title || result.name,
        release_date: result.release_date || result.first_air_date,
      }));

    const notInterested = notInterestedResults
      .filter((result) => result !== null)
      .map((result) => ({
        ...result,
        title: result.title || result.name,
        release_date: result.release_date || result.first_air_date,
      }));

    return {
      seen,
      not_interested: notInterested,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error al obtener el historial';
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
