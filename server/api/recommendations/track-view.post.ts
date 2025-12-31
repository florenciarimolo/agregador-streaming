import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import {
  updateLastShownAt,
  updatePoolScore,
} from '@/composables/database/recommendationPool';

/**
 * Track when recommendations are shown to a user
 * Decreases score by 1 for each shown recommendation (floored at -100)
 * Body: { tmdb_ids: number[] }
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
  const { tmdb_ids } = body;

  if (!Array.isArray(tmdb_ids) || tmdb_ids.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'tmdb_ids must be a non-empty array',
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
    // Update last_shown_at timestamp
    await updateLastShownAt(userId, tmdb_ids, supabase);

    // Decrease score by 1 for each shown recommendation
    // Do this in parallel for better performance
    await Promise.all(
      tmdb_ids.map((tmdbId: number) =>
        updatePoolScore(userId, tmdbId, -1, supabase).catch((err) => {
          // Don't fail if individual update fails
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error updating score for ${tmdbId}:`, err);
          }
        })
      )
    );

    return { success: true };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Error al registrar visualización';
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
