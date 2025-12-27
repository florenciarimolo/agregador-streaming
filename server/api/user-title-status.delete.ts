import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Delete user title status (remove from seen or not_interested)
 * Query params: { tmdb_id: number }
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

  // Get query params
  const query = getQuery(event);
  const { tmdb_id } = query;

  if (!tmdb_id) {
    throw createError({
      statusCode: 400,
      message: 'tmdb_id is required',
    });
  }

  const tmdbIdNumber = parseInt(tmdb_id as string, 10);
  if (isNaN(tmdbIdNumber)) {
    throw createError({
      statusCode: 400,
      message: 'tmdb_id must be a valid number',
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
    // Delete user title status
    const { error } = await supabase
      .from('user_title_status')
      .delete()
      .eq('user_id', userId)
      .eq('tmdb_id', tmdbIdNumber);

    if (error) {
      console.error('Error deleting user title status:', error);
      throw createError({
        statusCode: 500,
        message: 'Error al eliminar el estado del título',
      });
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Error al eliminar el estado del título';
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
