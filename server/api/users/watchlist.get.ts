import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getTMDBConfig } from '../../utils/config';
import { devLog, devError, devWarn, safeError } from '../../utils/logger';
import { TitleStatus } from '@/types/TitleStatus';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';

/**
 * Get user watchlist (watchlist status)
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
      devLog('[User Watchlist] User from cookies');
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
            devLog('[User Watchlist] User from Authorization header');
          }
        }
      } catch (err) {
        safeError('[User Watchlist] Error decoding token', err);
      }
    } else {
      devWarn(
        '[User Watchlist] No user from cookies and no Authorization header'
      );
    }
  }

  if (!user || !userId) {
    devError('[User Watchlist] Unauthorized - no user found');
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
      '[User Watchlist] WARNING: Using anon key instead of service role key. RLS policies may block queries.'
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
    // Fetch user title statuses with watchlist status (include type)
    const { data: statuses, error: statusError } = await supabase
      .from('user_title_status')
      .select('tmdb_id, type, created_at')
      .eq('user_id', userId)
      .eq('status', TitleStatus.WATCHLIST)
      .order('created_at', { ascending: false });

    if (statusError) {
      safeError(
        '[User Watchlist] Error fetching user title statuses',
        statusError,
        {
          userId,
          supabaseUrl: config.public.supabaseUrl,
        }
      );
      throw createError({
        statusCode: 500,
        message: 'Error al obtener la lista para ver',
      });
    }

    devLog('[User Watchlist] Statuses count:', statuses?.length || 0);

    if (!statuses || statuses.length === 0) {
      devLog('[User Watchlist] No watchlist statuses found for user');
      return {
        watchlist: [],
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

    const watchlistPromises: Promise<
      | (TMDBTitle & {
          type: string;
          tmdb_id: number;
          created_at: string;
        })
      | null
    >[] = [];

    for (const status of statuses) {
      // Use the type stored in the database to fetch from the correct endpoint
      const endpoint = status.type === MediaTypeEnum.movie ? 'movie' : 'tv';
      const fetchPromise = $fetch<TMDBTitle>(
        `${tmdbConfig.baseUrl}/${endpoint}/${status.tmdb_id}`,
        {
          query: {
            api_key: tmdbConfig.apiKey,
            language: tmdbConfig.language,
            include_adult: tmdbConfig.includeAdult,
          },
        }
      )
        .then((result) => {
          if (result?.id) {
            return {
              ...result,
              type: status.type,
              tmdb_id: status.tmdb_id,
              created_at: status.created_at,
            };
          }
          return null;
        })
        .catch(() => {
          // If fetch fails, return null
          return null;
        });

      watchlistPromises.push(fetchPromise);
    }

    // Wait for all promises
    const watchlistResults = await Promise.all(watchlistPromises);

    // Filter out null results and format
    const watchlist = watchlistResults
      .filter((result) => result !== null)
      .map((result) => ({
        ...result,
        title: result.title || result.name,
        release_date: result.release_date || result.first_air_date,
      }));

    return {
      watchlist,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Error al obtener la lista para ver';
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
