import { TITLE_STATUS } from '@/constants/domain/titleStatus';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { TABLES } from '@/constants/db/tables';
import { USER_TITLE_STATUS_COLUMNS } from '@/constants/db/columns';
import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { createServerSupabaseClient } from '@/server/utils/supabase';
import { DEFAULT_LANGUAGE } from '@/constants/languages';
import { logWarn, logError, devLog } from '@/server/utils/logger';
import { markAllEpisodesAsSeen } from '@/services/userEpisodeStatus';
import { isTVShowStillOngoing } from '@/server/utils/tv-show-status';
import { deleteUserFollowing, isFollowing } from '@/services/userFollowing';
import { RECOMMENDATION_POOL_COLUMNS } from '@/constants/db/columns';

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
  const supabase = createServerSupabaseClient(config);

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
      } catch {
        // Don't fail if TMDB fetch fails - title might be created later when watchlist is fetched
        logWarn('[Title Status] Could not fetch title from TMDB', {
          tmdbId: tmdb_id,
          type,
        });
      }
    }

    // Get previous status to detect changes (needed for Edge Function)
    const { data: previousStatus } = await supabase
      .from(TABLES.USER_TITLE_STATUS)
      .select(
        `${USER_TITLE_STATUS_COLUMNS.STATUS}, ${USER_TITLE_STATUS_COLUMNS.LIKED}`
      )
      .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
      .eq(USER_TITLE_STATUS_COLUMNS.TMDB_ID, tmdb_id)
      .maybeSingle();

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

    // For TV shows marked as seen, mark all episodes as seen
    if (type === MEDIA_TYPE.TV && status === TITLE_STATUS.SEEN) {
      const { error: markEpisodesError } = await markAllEpisodesAsSeen(
        userId,
        tmdb_id,
        supabase
      );

      if (markEpisodesError) {
        logError('[Title Status] Error marking all episodes as seen', markEpisodesError, {
          tmdbId: tmdb_id,
          userId,
        });
        // Don't fail the request, but log the error
        // The title status will still be set, but episodes won't be marked
      }

      // Check if show is finished or cancelled
      const isStillOngoing = await isTVShowStillOngoing(tmdb_id, supabase);

      // If show is finished or cancelled (not ongoing), remove following
      if (isStillOngoing === false) {
        const { isFollowing: currentlyFollowing } = await isFollowing(
          userId,
          tmdb_id,
          supabase
        );

        if (currentlyFollowing) {
          // Remove following (finished/cancelled shows should not be followed when marked as seen)
          const { error: unfollowError } = await deleteUserFollowing(
            userId,
            tmdb_id,
            supabase
          );

          if (unfollowError) {
            // Log but don't fail - following might not exist
            logError('[Title Status] Error removing following for finished/cancelled show', unfollowError, {
              userId,
              tmdbId: tmdb_id,
            });
          } else {
            // Revert following scoring if it existed
            const { updatePreferenceScore } = await import(
              '@/services/recommendationPool'
            );
            const { revertFollowingInfluence } = await import(
              '@/services/similarityPropagation'
            );

            const { data: currentPoolEntry } = await supabase
              .from(TABLES.RECOMMENDATION_POOL)
              .select(RECOMMENDATION_POOL_COLUMNS.PREFERENCE_SCORE)
              .eq(RECOMMENDATION_POOL_COLUMNS.USER_ID, userId)
              .eq(RECOMMENDATION_POOL_COLUMNS.TMDB_ID, tmdb_id)
              .maybeSingle();

            if (currentPoolEntry) {
              // Revert base following score (-5)
              const FOLLOWING_BASE_SCORE = 5;
              const currentPreferenceScore = currentPoolEntry.preference_score ?? 0;
              const newPreferenceScore = Math.max(
                -100,
                currentPreferenceScore - FOLLOWING_BASE_SCORE
              );

              await updatePreferenceScore(
                userId,
                tmdb_id,
                newPreferenceScore,
                supabase
              );

              // Revert propagation
              await revertFollowingInfluence(userId, tmdb_id, MEDIA_TYPE.TV, supabase);
            }
          }
        }
      }
    }

    const { error } = await supabase
      .from(TABLES.USER_TITLE_STATUS)
      .upsert(upsertData, {
        onConflict: `${USER_TITLE_STATUS_COLUMNS.USER_ID},${USER_TITLE_STATUS_COLUMNS.TMDB_ID}`,
      });

    if (error) {
      logError('[Title Status] Error updating user title status', error, {
        tmdbId: tmdb_id,
        type,
        status,
        userId,
      });
      throw createError({
        statusCode: 500,
        message: 'Error al actualizar el estado del título',
      });
    }

    // Respond immediately to user
    // All recommendation logic is handled asynchronously by Edge Function
    const response = { success: true };

    // Trigger Edge Function asynchronously (fire and forget)
    // This handles all recommendation logic: preference_score, propagations, soft reset
    const supabaseUrl = config.public.supabaseUrl;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/process-title-status`;
      const payload = {
        userId,
        tmdb_id,
        type,
        status,
        liked: typeof liked === 'boolean' ? liked : undefined,
        previousStatus: previousStatus
          ? {
              status: previousStatus.status,
              liked: previousStatus.liked ?? undefined,
            }
          : undefined,
      };

      // Log in development for debugging
      devLog('[Title Status] Calling Edge Function:', {
        url: edgeFunctionUrl,
        payload: { ...payload, userId: '***' }, // Don't log full userId
      });

      // Don't await - let it run in background
      fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
        .then((response) => {
          devLog(
            '[Title Status] Edge Function response status:',
            response.status
          );
          if (!response.ok) {
            return response.text().then((text) => {
              throw new Error(
                `Edge Function returned ${response.status}: ${text}`
              );
            });
          }
        })
        .catch((edgeFunctionError) => {
          // Log error but don't fail the request
          logError(
            '[Title Status] Error calling Edge Function',
            edgeFunctionError,
            {
              tmdbId: tmdb_id,
              type,
              status,
            }
          );
        });
    } else {
      logWarn(
        '[Title Status] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY, skipping Edge Function call',
        {
          hasSupabaseUrl: !!supabaseUrl,
          hasServiceRoleKey: !!serviceRoleKey,
        }
      );
    }

    return response;
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
