// useSupabaseClient is auto-imported by Nuxt
import { TABLES, USER_TITLE_STATUS_FIELDS } from './constants';
import { TitleStatus } from '@/types/TitleStatus';

export interface UpsertUserTitleStatusData {
  user_id: string;
  tmdb_id: number;
  type: 'movie' | 'tv';
  status: TitleStatus;
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
        [USER_TITLE_STATUS_FIELDS.USER_ID]: data.user_id,
        [USER_TITLE_STATUS_FIELDS.TMDB_ID]: data.tmdb_id,
        [USER_TITLE_STATUS_FIELDS.TYPE]: data.type,
        [USER_TITLE_STATUS_FIELDS.STATUS]: data.status,
        [USER_TITLE_STATUS_FIELDS.LIKED]: data.liked ?? false,
      },
      {
        onConflict: `${USER_TITLE_STATUS_FIELDS.USER_ID},${USER_TITLE_STATUS_FIELDS.TMDB_ID}`,
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
    .eq(USER_TITLE_STATUS_FIELDS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_FIELDS.LIKED, true)
    .order(USER_TITLE_STATUS_FIELDS.CREATED_AT, { ascending: false });

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
    .eq(USER_TITLE_STATUS_FIELDS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_FIELDS.TMDB_ID, tmdbId)
    .eq(USER_TITLE_STATUS_FIELDS.LIKED, true)
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
    .eq(USER_TITLE_STATUS_FIELDS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_FIELDS.LIKED, true);
}

/**
 * Delete user title status by id
 */
export async function deleteUserTitleStatus(id: string) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .delete()
    .eq(USER_TITLE_STATUS_FIELDS.ID, id);
}

/**
 * Count user's liked titles
 */
export async function countUserLikedTitles(userId: string) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .select('*', { count: 'exact', head: true })
    .eq(USER_TITLE_STATUS_FIELDS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_FIELDS.LIKED, true);
}

/**
 * Get user's seen titles
 */
export async function getUserSeenTitles(userId: string) {
  const supabase = useSupabaseClient();

  if (import.meta.dev) {
    console.log('[getUserSeenTitles] Querying for userId:', userId);
  }

  const result = await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .select('id, tmdb_id, type')
    .eq(USER_TITLE_STATUS_FIELDS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_FIELDS.STATUS, 'seen')
    .order(USER_TITLE_STATUS_FIELDS.CREATED_AT, { ascending: false });

  if (import.meta.dev) {
    console.log('[getUserSeenTitles] Result:', {
      data: result.data,
      error: result.error,
      count: result.data?.length || 0,
    });
  }

  return result;
}

/**
 * Get user's not interested titles
 */
export async function getUserNotInterestedTitles(userId: string) {
  const supabase = useSupabaseClient();

  if (import.meta.dev) {
    console.log('[getUserNotInterestedTitles] Querying for userId:', userId);
  }

  const result = await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .select('id, tmdb_id, type')
    .eq(USER_TITLE_STATUS_FIELDS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_FIELDS.STATUS, 'not_interested')
    .order(USER_TITLE_STATUS_FIELDS.CREATED_AT, { ascending: false });

  if (import.meta.dev) {
    console.log('[getUserNotInterestedTitles] Result:', {
      data: result.data,
      error: result.error,
      count: result.data?.length || 0,
    });
  }

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
    .eq(USER_TITLE_STATUS_FIELDS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_FIELDS.STATUS, 'watchlist')
    .order(USER_TITLE_STATUS_FIELDS.CREATED_AT, { ascending: false });
}

/**
 * Remove not interested status (for undo)
 */
export async function removeNotInterested(userId: string, tmdbId: number) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .delete()
    .eq(USER_TITLE_STATUS_FIELDS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_FIELDS.TMDB_ID, tmdbId)
    .eq(USER_TITLE_STATUS_FIELDS.STATUS, 'not_interested');
}

/**
 * Remove like status (for undo)
 */
export async function removeLike(userId: string, tmdbId: number) {
  const supabase = useSupabaseClient();
  // Update liked to false instead of deleting, to preserve the status
  return await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .update({ [USER_TITLE_STATUS_FIELDS.LIKED]: false })
    .eq(USER_TITLE_STATUS_FIELDS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_FIELDS.TMDB_ID, tmdbId);
}
