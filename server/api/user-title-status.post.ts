import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Update user title status (seen or not_interested)
 * Body: { tmdb_id: number, status: 'seen' | 'not_interested' }
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
        // Error decoding token - only log in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Error decoding token:', err);
        }
      }
    }
  }

  if (!user || !userId) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  // Get request body
  const body = await readBody(event);
  const { tmdb_id, status } = body;

  if (!tmdb_id || !status) {
    throw createError({
      statusCode: 400,
      message: 'tmdb_id and status are required',
    });
  }

  if (status !== 'seen' && status !== 'not_interested') {
    throw createError({
      statusCode: 400,
      message: "status must be 'seen' or 'not_interested'",
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
    // Upsert user title status (insert or update)
    const { error } = await supabase.from('user_title_status').upsert(
      {
        user_id: userId,
        tmdb_id,
        status,
      },
      {
        onConflict: 'user_id,tmdb_id',
      }
    );

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating user title status:', error);
      }
      throw createError({
        statusCode: 500,
        message: 'Error al actualizar el estado del título',
      });
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Error al actualizar el estado del título';
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
