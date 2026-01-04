import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { TITLE_STATUS, type TitleStatusType } from '@/constants/domain/titleStatus';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { TABLES } from '@/constants/db/tables';
import { USER_TITLE_STATUS_COLUMNS } from '@/constants/db/columns';
import { SCORE_WEIGHTS } from '@/constants/domain/scoring';
import {
  updatePoolScore,
  removeFromPool,
} from '@/services/recommendationPool';
import { DEFAULT_LANGUAGE } from '@/constants/languages';

/**
 * Update user title status (seen, not_interested, or watchlist)
 * Body: { tmdb_id: number, type: 'movie' | 'tv', status: TitleStatus, liked?: boolean }
 * Note: Single active status - setting a new status replaces the old one
 *
 * IMPORTANT: Product Decision - Liked Dependency
 * ==============================================
 * `liked` is an ATTRIBUTE of `seen`, not an independent status:
 * - `liked: true` can ONLY be set when `status === 'seen'`
 * - When marking as liked, automatically set `status: 'seen'` and `liked: true`
 * - `liked` cannot exist without `seen`
 * - When `seen` is deleted, the entire record (including `liked`) is deleted
 *
 * This ensures data consistency and prevents orphaned states.
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
  const { tmdb_id, type, status, liked } = body;

  if (!tmdb_id || !type || !status) {
    throw createError({
      statusCode: 400,
      message: 'tmdb_id, type, and status are required',
    });
  }

  if (type !== MEDIA_TYPE.MOVIE && type !== MEDIA_TYPE.TV) {
    throw createError({
      statusCode: 400,
      message: `type must be '${MEDIA_TYPE.MOVIE}' or '${MEDIA_TYPE.TV}'`,
    });
  }

  if (
    status !== TITLE_STATUS.SEEN &&
    status !== TITLE_STATUS.NOT_INTERESTED &&
    status !== TITLE_STATUS.WATCHLIST
  ) {
    throw createError({
      statusCode: 400,
      message: `status must be '${TITLE_STATUS.SEEN}', '${TITLE_STATUS.NOT_INTERESTED}', or '${TITLE_STATUS.WATCHLIST}'`,
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
    // Ensure title exists in database (especially important for watchlist)
    // Check if title exists
    const { data: existingTitle } = await supabase
      .from(TABLES.TITLES)
      .select('tmdb_id')
      .eq('tmdb_id', tmdb_id)
      .maybeSingle();

    // If title doesn't exist, fetch it from TMDB endpoint (this will auto-create it)
    if (!existingTitle) {
      try {
        const endpoint = type === MEDIA_TYPE.MOVIE ? 'movie' : 'tv';
        
        // Call internal TMDB endpoint which will fetch and create the title
        await $fetch(`/api/tmdb/${endpoint}s/${tmdb_id}`, {
          query: {
            language: DEFAULT_LANGUAGE, // Default language, will be updated with user preferences later
          },
        });
      } catch (tmdbError) {
        // Don't fail if TMDB fetch fails - title might be created later when watchlist is fetched
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `[Title Status] Could not fetch title ${tmdb_id} from TMDB:`,
            tmdbError
          );
        }
      }
    }

    // Upsert user title status (insert or update)
    const upsertData: {
      user_id: string;
      tmdb_id: number;
      type: string;
      status: string;
      liked?: boolean;
    } = {
      user_id: userId,
      tmdb_id,
      type,
      status,
    };

    // Only include liked if provided
    // IMPORTANT: `liked` can only be true when status is 'seen'
    // This is enforced by the product logic: liked is an attribute of seen
    if (typeof liked === 'boolean') {
      upsertData.liked = liked;
    }

    // Get previous status to detect changes
    const { data: previousStatus } = await supabase
      .from(TABLES.USER_TITLE_STATUS)
      .select(
        `${USER_TITLE_STATUS_COLUMNS.STATUS}, ${USER_TITLE_STATUS_COLUMNS.LIKED}`
      )
      .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
      .eq(USER_TITLE_STATUS_COLUMNS.TMDB_ID, tmdb_id)
      .maybeSingle();

    const { error } = await supabase
      .from(TABLES.USER_TITLE_STATUS)
      .upsert(upsertData, {
        onConflict: `${USER_TITLE_STATUS_COLUMNS.USER_ID},${USER_TITLE_STATUS_COLUMNS.TMDB_ID}`,
      });

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating user title status:', error);
      }
      throw createError({
        statusCode: 500,
        message: 'Error al actualizar el estado del título',
      });
    }

    // Update recommendation pool score based on status changes
    // Official scoring logic: each signal is applied independently and reversibly
    try {
      const previousStatusValue = previousStatus?.status as
        | TitleStatusType
        | undefined;
      const previousLiked = previousStatus?.liked ?? false;
      // Only consider liked change if it was explicitly provided in the request
      const likedWasProvided = typeof liked === 'boolean';
      const newLiked = likedWasProvided ? liked : previousLiked;

      // 1. Revert previous status impact (if status changed)
      if (
        previousStatusValue &&
        previousStatusValue !== status &&
        previousStatusValue !== TITLE_STATUS.WATCHLIST
      ) {
        // Revert: score -= SCORE_WEIGHTS[previousStatus]
        const previousWeight = SCORE_WEIGHTS[
          previousStatusValue as keyof typeof SCORE_WEIGHTS
        ];
        if (previousWeight !== 0) {
          await updatePoolScore(userId, tmdb_id, -previousWeight, supabase);
        }
      }

      // 2. Revert previous liked impact (if liked changed from true to false)
      if (likedWasProvided && previousLiked === true && newLiked === false) {
        // Revert: score -= SCORE_WEIGHTS.liked
        await updatePoolScore(
          userId,
          tmdb_id,
          -SCORE_WEIGHTS.liked,
          supabase
        );
      }

      // 3. Apply new status impact (if status changed and not watchlist)
      if (
        previousStatusValue !== status &&
        status !== TITLE_STATUS.WATCHLIST
      ) {
        const newWeight =
          SCORE_WEIGHTS[status as keyof typeof SCORE_WEIGHTS];
        if (newWeight !== 0) {
          await updatePoolScore(userId, tmdb_id, newWeight, supabase);
        }
      }

      // 4. Apply new liked impact (if liked changed from false to true)
      if (likedWasProvided && previousLiked === false && newLiked === true) {
        // Apply: score += SCORE_WEIGHTS.liked
        await updatePoolScore(userId, tmdb_id, SCORE_WEIGHTS.liked, supabase);
      }

      // 5. Handle not_interested: remove from pool after score update
      if (status === TITLE_STATUS.NOT_INTERESTED) {
        await removeFromPool(userId, tmdb_id, supabase);
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
        : 'Error al actualizar el estado del título';
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
