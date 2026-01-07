// useSupabaseClient is auto-imported by Nuxt
import { TABLES } from '@/constants/db/tables';
import { USER_TITLE_STATUS_COLUMNS } from '@/constants/db/columns';
import type { TitleStatusType } from '@/constants/domain/titleStatus';

/**
 * Service: User title status operations
 * Infrastructure layer - pure CRUD operations, no UI state
 */

export interface UpsertUserTitleStatusData {
  user_id: string;
  tmdb_id: number;
  type: 'movie' | 'tv';
  status: TitleStatusType;
  liked?: boolean;
}

/**
 * Upsert user title status (insert or update)
 */
export async function upsertUserTitleStatus(data: UpsertUserTitleStatusData) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .upsert(
      {
        [USER_TITLE_STATUS_COLUMNS.USER_ID]: data.user_id,
        [USER_TITLE_STATUS_COLUMNS.TMDB_ID]: data.tmdb_id,
        [USER_TITLE_STATUS_COLUMNS.TYPE]: data.type,
        [USER_TITLE_STATUS_COLUMNS.STATUS]: data.status,
        [USER_TITLE_STATUS_COLUMNS.LIKED]: data.liked ?? false,
      },
      {
        onConflict: `${USER_TITLE_STATUS_COLUMNS.USER_ID},${USER_TITLE_STATUS_COLUMNS.TMDB_ID}`,
        ignoreDuplicates: false,
      }
    )
    .select('id')
    .single();
}

/**
 * Get user's liked titles (where liked = true)
 */
export async function getUserLikedTitles(userId: string) {
  const supabase = useSupabaseClient();

  if (import.meta.dev) {
    console.log('[getUserLikedTitles] Querying for userId:', userId);
  }

  const result = await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .select('id, tmdb_id, type')
    .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_COLUMNS.LIKED, true)
    .order(USER_TITLE_STATUS_COLUMNS.CREATED_AT, { ascending: false });

  if (import.meta.dev) {
    console.log('[getUserLikedTitles] Result:', {
      data: result.data,
      error: result.error,
      count: result.data?.length || 0,
    });
  }

  return result;
}

/**
 * Check if user has liked a title
 */
export async function getUserLikedTitle(userId: string, tmdbId: number) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .select('id')
    .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_COLUMNS.TMDB_ID, tmdbId)
    .eq(USER_TITLE_STATUS_COLUMNS.LIKED, true)
    .maybeSingle();
}

/**
 * Get user's liked statuses with tmdb_ids and types
 */
export async function getUserLikedStatuses(userId: string) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .select('tmdb_id, type')
    .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_COLUMNS.LIKED, true);
}

/**
 * Delete user title status by id
 */
export async function deleteUserTitleStatus(id: string) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .delete()
    .eq(USER_TITLE_STATUS_COLUMNS.ID, id);
}

/**
 * Count user's liked titles
 */
export async function countUserLikedTitles(userId: string) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .select('*', { count: 'exact', head: true })
    .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_COLUMNS.LIKED, true);
}

/**
 * Get user's seen titles
 */
export async function getUserSeenTitles(userId: string) {
  const supabase = useSupabaseClient();

  const result = await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .select('id, tmdb_id, type, liked')
    .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_COLUMNS.STATUS, 'seen')
    .order(USER_TITLE_STATUS_COLUMNS.CREATED_AT, { ascending: false });

  return result;
}

/**
 * Get user's not interested titles
 */
export async function getUserNotInterestedTitles(userId: string) {
  const supabase = useSupabaseClient();

  const result = await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .select('id, tmdb_id, type')
    .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_COLUMNS.STATUS, 'not_interested')
    .order(USER_TITLE_STATUS_COLUMNS.CREATED_AT, { ascending: false });

  return result;
}

/**
 * Get user's watchlist titles
 */
export async function getUserWatchlistTitles(userId: string) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .select('id, tmdb_id, type')
    .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_COLUMNS.STATUS, 'watchlist')
    .order(USER_TITLE_STATUS_COLUMNS.CREATED_AT, { ascending: false });
}

/**
 * Remove not interested status (for undo)
 */
export async function removeNotInterested(userId: string, tmdbId: number) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .delete()
    .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_COLUMNS.TMDB_ID, tmdbId)
    .eq(USER_TITLE_STATUS_COLUMNS.STATUS, 'not_interested');
}

/**
 * Remove like status (for undo)
 */
export async function removeLike(userId: string, tmdbId: number) {
  const supabase = useSupabaseClient();
  // Update liked to false instead of deleting, to preserve the status
  return await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .update({ [USER_TITLE_STATUS_COLUMNS.LIKED]: false })
    .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_COLUMNS.TMDB_ID, tmdbId);
}

/**
 * Get title status (liked and watchlist) for a specific title
 */
export async function getTitleStatus(userId: string, tmdbId: number) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .select(`${USER_TITLE_STATUS_COLUMNS.LIKED}, ${USER_TITLE_STATUS_COLUMNS.STATUS}`)
    .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_COLUMNS.TMDB_ID, tmdbId)
    .maybeSingle();
}

