import { createClient } from '@supabase/supabase-js';
import { TITLE_STATUS, type TitleStatus } from '@/constants/domain/titleStatus';
import { TABLES } from '@/constants/db/tables';
import { USER_TITLE_STATUS_COLUMNS } from '@/constants/db/columns';
import { SCORE_WEIGHTS } from '@/constants/domain/scoring';
import { updatePoolScore } from '@/services/recommendationPool';
import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { logError } from '@/server/utils/logger';

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

  // Use centralized function to get userId
  const userId = await getUserIdFromEvent(event);

  if (!userId) {
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
        `${USER_TITLE_STATUS_COLUMNS.STATUS}, ${USER_TITLE_STATUS_COLUMNS.LIKED}`
      )
      .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
      .eq(USER_TITLE_STATUS_COLUMNS.TMDB_ID, tmdbIdNumber)
      .maybeSingle();

    // Delete user title status
    // NOTE: This deletes the ENTIRE record, including `liked: true` if present.
    // This is correct behavior: `liked` is an attribute of `seen`, not independent.
    const { error } = await supabase
      .from(TABLES.USER_TITLE_STATUS)
      .delete()
      .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
      .eq(USER_TITLE_STATUS_COLUMNS.TMDB_ID, tmdbIdNumber);

    if (error) {
      logError('[Title Status] Error deleting user title status', error, {
        tmdbId: tmdbIdNumber,
        userId,
      });
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
      if (deletedStatus && deletedStatus !== TITLE_STATUS.WATCHLIST) {
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
      logError(
        '[Title Status] Error updating recommendation pool',
        poolError as Error,
        {
          tmdbId: tmdbIdNumber,
          userId,
        }
      );
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
