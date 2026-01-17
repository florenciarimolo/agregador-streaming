/**
 * Service: User following operations
 * Infrastructure layer - pure CRUD operations for following state
 * Following is an interest signal, separate from consumption states
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/constants/db/tables';
import { USER_TITLE_FOLLOWING_COLUMNS } from '@/constants/db/columns';

/**
 * Upsert user following (insert or update)
 */
export async function upsertUserFollowing(
  userId: string,
  tmdbId: number,
  type: 'movie' | 'tv',
  supabaseClient?: SupabaseClient
) {
  const supabase = supabaseClient || useSupabaseClient();
  
  return await supabase
    .from(TABLES.USER_TITLE_FOLLOWING)
    .upsert(
      {
        [USER_TITLE_FOLLOWING_COLUMNS.USER_ID]: userId,
        [USER_TITLE_FOLLOWING_COLUMNS.TMDB_ID]: tmdbId,
        [USER_TITLE_FOLLOWING_COLUMNS.TYPE]: type,
      },
      {
        onConflict: `${USER_TITLE_FOLLOWING_COLUMNS.USER_ID},${USER_TITLE_FOLLOWING_COLUMNS.TMDB_ID}`,
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();
}

/**
 * Delete user following
 */
export async function deleteUserFollowing(
  userId: string,
  tmdbId: number,
  supabaseClient?: SupabaseClient
) {
  const supabase = supabaseClient || useSupabaseClient();
  
  return await supabase
    .from(TABLES.USER_TITLE_FOLLOWING)
    .delete()
    .eq(USER_TITLE_FOLLOWING_COLUMNS.USER_ID, userId)
    .eq(USER_TITLE_FOLLOWING_COLUMNS.TMDB_ID, tmdbId);
}

/**
 * Check if user is following a title
 */
export async function isFollowing(
  userId: string,
  tmdbId: number,
  supabaseClient?: SupabaseClient
) {
  const supabase = supabaseClient || useSupabaseClient();
  
  const { data, error } = await supabase
    .from(TABLES.USER_TITLE_FOLLOWING)
    .select('id')
    .eq(USER_TITLE_FOLLOWING_COLUMNS.USER_ID, userId)
    .eq(USER_TITLE_FOLLOWING_COLUMNS.TMDB_ID, tmdbId)
    .maybeSingle();

  if (error) {
    return { isFollowing: false, error };
  }

  return { isFollowing: !!data, error: null };
}

/**
 * Get all titles user is following
 */
export async function getUserFollowing(
  userId: string,
  supabaseClient?: SupabaseClient
) {
  const supabase = supabaseClient || useSupabaseClient();
  
  return await supabase
    .from(TABLES.USER_TITLE_FOLLOWING)
    .select('*')
    .eq(USER_TITLE_FOLLOWING_COLUMNS.USER_ID, userId)
    .order(USER_TITLE_FOLLOWING_COLUMNS.CREATED_AT, { ascending: false });
}
