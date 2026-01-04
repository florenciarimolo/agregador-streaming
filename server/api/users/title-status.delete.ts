import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { TitleStatus } from '@/types/TitleStatus';
import {
  TABLES,
  USER_TITLE_STATUS_FIELDS,
  SCORE_WEIGHTS,
} from '@/services/constants';
import { updatePoolScore } from '@/services/recommendationPool';

/**
 * Delete user title status (remove from seen or not_interested)
 * Query params: { tmdb_id: number }
 *
 * IMPORTANT: Product Decision - Liked Dependency
 * ==============================================
 * When deleting a title status (typically `seen`), the ENTIRE record is deleted.
 * This includes `liked: true` if it was present, because:
 * - `liked` is an attribute of `seen`, not an independent status
 * - `liked` cannot exist without `seen`
 * - This behavior is CORRECT and must be maintained
 *
 * Do NOT attempt to preserve `liked` when removing `seen`.
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
    // Get previous status before deleting
    const { data: previousStatus } = await supabase
      .from(TABLES.USER_TITLE_STATUS)
      .select(
        `${USER_TITLE_STATUS_FIELDS.STATUS}, ${USER_TITLE_STATUS_FIELDS.LIKED}`
      )
      .eq(USER_TITLE_STATUS_FIELDS.USER_ID, userId)
      .eq(USER_TITLE_STATUS_FIELDS.TMDB_ID, tmdbIdNumber)
      .maybeSingle();

    // Delete user title status
    // NOTE: This deletes the ENTIRE record, including `liked: true` if present.
    // This is correct behavior: `liked` is an attribute of `seen`, not independent.
    const { error } = await supabase
      .from(TABLES.USER_TITLE_STATUS)
      .delete()
      .eq(USER_TITLE_STATUS_FIELDS.USER_ID, userId)
      .eq(USER_TITLE_STATUS_FIELDS.TMDB_ID, tmdbIdNumber);

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting user title status:', error);
      }
      throw createError({
        statusCode: 500,
        message: 'Error al eliminar el estado del título',
      });
    }

    // Update recommendation pool score based on deleted status
    // Official reversal logic: score -= SCORE_WEIGHTS[state]
    try {
      const deletedStatus = previousStatus?.status as TitleStatus | undefined;
      const deletedLiked = previousStatus?.liked ?? false;

      // Revert status impact (if status was not watchlist)
      if (
        deletedStatus &&
        deletedStatus !== TitleStatus.WATCHLIST
      ) {
        // Revert: score -= SCORE_WEIGHTS[deletedStatus]
        const deletedWeight =
          SCORE_WEIGHTS[deletedStatus as keyof typeof SCORE_WEIGHTS];
        if (deletedWeight !== 0) {
          await updatePoolScore(userId, tmdbIdNumber, -deletedWeight, supabase);
        }
      }

      // Revert liked impact (if liked was true)
      if (deletedLiked === true) {
        // Revert: score -= SCORE_WEIGHTS.liked
        await updatePoolScore(
          userId,
          tmdbIdNumber,
          -SCORE_WEIGHTS.liked,
          supabase
        );
      }
    } catch (poolError) {
      // Don't fail the request if pool update fails
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating recommendation pool:', poolError);
      }
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
