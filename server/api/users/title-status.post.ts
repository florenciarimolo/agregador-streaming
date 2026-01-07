import { createClient } from '@supabase/supabase-js';
import { TITLE_STATUS, type TitleStatusType } from '@/constants/domain/titleStatus';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { TABLES } from '@/constants/db/tables';
import { USER_TITLE_STATUS_COLUMNS } from '@/constants/db/columns';
import { getUserIdFromEvent } from '@/server/utils/user-auth';
import {
  updatePreferenceScore,
  removeFromPool,
} from '@/services/recommendationPool';
import {
  propagateLikeInfluence,
  propagateDislikeInfluence,
  propagateRemoveLikeInfluence,
} from '@/services/similarityPropagation';
import {
  detectExtremeBehavior,
  performSoftReset,
} from '@/services/poolSoftReset';
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
  // Use centralized function to get userId
  const userId = await getUserIdFromEvent(event);

  if (!userId) {
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

    // Update recommendation pool preference_score based on status changes
    // New scoring model: preference_score is updated incrementally, score = base_score + preference_score
    try {
      const previousLiked = previousStatus?.liked ?? false;
      // Only consider liked change if it was explicitly provided in the request
      const likedWasProvided = typeof liked === 'boolean';
      const newLiked = likedWasProvided ? liked : previousLiked;

      // Get current preference_score
      const { data: currentPoolEntry } = await supabase
        .from(TABLES.RECOMMENDATION_POOL)
        .select('preference_score')
        .eq('user_id', userId)
        .eq('tmdb_id', tmdb_id)
        .maybeSingle();

      const currentPreferenceScore = currentPoolEntry?.preference_score ?? 0;

      // Handle LIKE (liked changed from false to true)
      if (likedWasProvided && previousLiked === false && newLiked === true) {
        // Increment preference_score
        const increment = 10; // Base increment for like
        const newPreferenceScore = Math.min(100, currentPreferenceScore + increment);
        await updatePreferenceScore(userId, tmdb_id, newPreferenceScore, supabase);

        // Propagate influence to similar titles
        await propagateLikeInfluence(userId, tmdb_id, type, supabase, increment);
      }

      // Handle REMOVE LIKE (liked changed from true to false)
      if (likedWasProvided && previousLiked === true && newLiked === false) {
        // Apply soft decay (*0.7)
        const newPreferenceScore = currentPreferenceScore * 0.7;
        await updatePreferenceScore(userId, tmdb_id, newPreferenceScore, supabase);

        // Propagate decay to similar titles
        await propagateRemoveLikeInfluence(userId, tmdb_id, type, supabase, 0.7);
      }

      // Handle DISLIKE (not_interested)
      if (status === TITLE_STATUS.NOT_INTERESTED) {
        // Strong penalty
        const penalty = -15;
        const newPreferenceScore = Math.max(-100, currentPreferenceScore + penalty);
        await updatePreferenceScore(userId, tmdb_id, newPreferenceScore, supabase);

        // Propagate penalty to similar titles
        await propagateDislikeInfluence(userId, tmdb_id, type, supabase, penalty);

        // Remove from pool
        await removeFromPool(userId, tmdb_id, supabase);
      }

      // Check for extreme behavior and perform soft reset if needed
      const shouldSoftReset = await detectExtremeBehavior(userId, supabase);
      if (shouldSoftReset) {
        await performSoftReset(userId, supabase, 0.5);
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
