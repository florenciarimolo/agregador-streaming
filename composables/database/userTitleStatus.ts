// useSupabaseClient is auto-imported by Nuxt
import { TABLES, USER_TITLE_STATUS_FIELDS } from './constants';
import { TitleStatus } from '@/types/TitleStatus';

export interface UpsertUserTitleStatusData {
  user_id: string;
  tmdb_id: number;
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
  return await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .select('id, tmdb_id')
    .eq(USER_TITLE_STATUS_FIELDS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_FIELDS.LIKED, true)
    .order(USER_TITLE_STATUS_FIELDS.CREATED_AT, { ascending: false });
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
 * Get user's liked statuses with tmdb_ids
 */
export async function getUserLikedStatuses(userId: string) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .select('tmdb_id')
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
