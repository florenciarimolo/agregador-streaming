/**
 * Service: Recommendation pool operations
 * Infrastructure layer - pure CRUD operations, no UI state
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from './constants';

export const RECOMMENDATION_POOL_FIELDS = {
  ID: 'id',
  USER_ID: 'user_id',
  TMDB_ID: 'tmdb_id',
  TYPE: 'type',
  SOURCE: 'source',
  SCORE: 'score',
  EXPLANATION_CODE: 'explanation_code',
  CREATED_AT: 'created_at',
  LAST_SHOWN_AT: 'last_shown_at',
} as const;

export type RecommendationPoolSource =
  | 'based_on_like'
  | 'trending'
  | 'discover'
  | 'easy'
  | 'mood';

export type TitleData = {
  title: string; // Depende de idioma
  overview: string; // Depende de idioma
  poster_path: string | null; // NO depende de idioma
  backdrop_path: string | null; // NO depende de idioma
  vote_average: number | null; // NO depende de idioma
  genres: Array<{ id: number; name: string }>; // NO depende de idioma (guardar completo)
  release_date: string | null; // NO depende de idioma (movies)
  first_air_date: string | null; // NO depende de idioma (tv)
  language?: string; // Idioma en el que está el contenido (formato ISO: 'ca-ES', 'es-ES', etc.)
};

export type RecommendationPoolEntry = {
  id: string;
  user_id: string;
  tmdb_id: number;
  type: 'movie' | 'tv';
  source: RecommendationPoolSource;
  score: number;
  explanation_code: string | null;
  created_at: string;
  last_shown_at: string | null;
};

/**
 * Get the count of entries in the recommendation pool for a user
 */
export async function getPoolCount(
  userId: string,
  supabaseClient?: SupabaseClient
): Promise<number> {
  const supabase = supabaseClient || useSupabaseClient();

  const { count, error } = await supabase
    .from(TABLES.RECOMMENDATION_POOL)
    .select('*', { count: 'exact', head: true })
    .eq(RECOMMENDATION_POOL_FIELDS.USER_ID, userId);

  if (error) {
    console.error('[RecommendationPool] Error getting pool count:', error);
    throw error;
  }

  return count || 0;
}

/**
 * Delete the lowest score entries from the pool
 * Used when the pool reaches the limit (200 entries)
 */
export async function deleteLowestScoreEntries(
  userId: string,
  count: number,
  supabaseClient?: SupabaseClient
): Promise<void> {
  const supabase = supabaseClient || useSupabaseClient();

  // Get IDs of entries with lowest scores
  const { data: entriesToDelete, error: selectError } = await supabase
    .from(TABLES.RECOMMENDATION_POOL)
    .select(RECOMMENDATION_POOL_FIELDS.ID)
    .eq(RECOMMENDATION_POOL_FIELDS.USER_ID, userId)
    .order(RECOMMENDATION_POOL_FIELDS.SCORE, { ascending: true })
    .order(RECOMMENDATION_POOL_FIELDS.CREATED_AT, { ascending: true })
    .limit(count);

  if (selectError) {
    console.error(
      '[RecommendationPool] Error selecting entries to delete:',
      selectError
    );
    throw selectError;
  }

  if (!entriesToDelete || entriesToDelete.length === 0) {
    return;
  }

  const idsToDelete = entriesToDelete.map((entry: { id: string }) => entry.id);

  const { error: deleteError } = await supabase
    .from(TABLES.RECOMMENDATION_POOL)
    .delete()
    .in(RECOMMENDATION_POOL_FIELDS.ID, idsToDelete);

  if (deleteError) {
    console.error('[RecommendationPool] Error deleting entries:', deleteError);
    throw deleteError;
  }
}

/**
 * Insert entries into the recommendation pool
 * Handles duplicates (UNIQUE constraint) by skipping them
 */
export async function insertPoolEntries(
  userId: string,
  entries: Array<{
    tmdb_id: number;
    type: 'movie' | 'tv';
    source: RecommendationPoolSource;
    score?: number;
    explanation_code?: string | null;
  }>,
  supabaseClient?: SupabaseClient
): Promise<number> {
  const supabase = supabaseClient || useSupabaseClient();

  const entriesToInsert = entries.map((entry) => ({
    user_id: userId,
    tmdb_id: entry.tmdb_id,
    type: entry.type,
    source: entry.source,
    score: entry.score ?? 0,
    explanation_code: entry.explanation_code ?? null,
  }));

  // Use upsert with ignoreDuplicates to skip existing entries
  const { data, error } = await supabase
    .from(TABLES.RECOMMENDATION_POOL)
    .upsert(entriesToInsert, {
      onConflict: 'user_id,tmdb_id',
      ignoreDuplicates: true,
    })
    .select();

  if (error) {
    // If it's a unique constraint error, that's expected (entry already exists)
    if (error.code === '23505') {
      return 0;
    }
    console.error('[RecommendationPool] Error inserting entries:', error);
    throw error;
  }

  return data?.length || 0;
}

/**
 * Update the score of a pool entry
 * Clamps score to -100 to 100 range
 */
export async function updatePoolScore(
  userId: string,
  tmdbId: number,
  delta: number,
  supabaseClient?: SupabaseClient
): Promise<void> {
  const supabase = supabaseClient || useSupabaseClient();

  // First get current score
  const { data: currentEntry, error: selectError } = await supabase
    .from(TABLES.RECOMMENDATION_POOL)
    .select(RECOMMENDATION_POOL_FIELDS.SCORE)
    .eq(RECOMMENDATION_POOL_FIELDS.USER_ID, userId)
    .eq(RECOMMENDATION_POOL_FIELDS.TMDB_ID, tmdbId)
    .single();

  if (selectError || !currentEntry) {
    // Entry doesn't exist in pool, nothing to update
    return;
  }

  const newScore = Math.max(
    -100,
    Math.min(100, (currentEntry.score || 0) + delta)
  );

  const { error: updateError } = await supabase
    .from(TABLES.RECOMMENDATION_POOL)
    .update({ [RECOMMENDATION_POOL_FIELDS.SCORE]: newScore })
    .eq(RECOMMENDATION_POOL_FIELDS.USER_ID, userId)
    .eq(RECOMMENDATION_POOL_FIELDS.TMDB_ID, tmdbId);

  if (updateError) {
    console.error('[RecommendationPool] Error updating score:', updateError);
    throw updateError;
  }
}

/**
 * Remove an entry from the pool
 * Used when user marks title as "not_interested"
 */
export async function removeFromPool(
  userId: string,
  tmdbId: number,
  supabaseClient?: SupabaseClient
): Promise<void> {
  const supabase = supabaseClient || useSupabaseClient();

  const { error } = await supabase
    .from(TABLES.RECOMMENDATION_POOL)
    .delete()
    .eq(RECOMMENDATION_POOL_FIELDS.USER_ID, userId)
    .eq(RECOMMENDATION_POOL_FIELDS.TMDB_ID, tmdbId);

  if (error) {
    console.error('[RecommendationPool] Error removing entry:', error);
    throw error;
  }
}

/**
 * Delete all pool entries for a user
 * Used when preferences change and pool needs to be completely regenerated
 */
export async function deleteAllPoolEntries(
  userId: string,
  supabaseClient?: SupabaseClient
): Promise<void> {
  const supabase = supabaseClient || useSupabaseClient();

  const { error } = await supabase
    .from(TABLES.RECOMMENDATION_POOL)
    .delete()
    .eq(RECOMMENDATION_POOL_FIELDS.USER_ID, userId);

  if (error) {
    console.error(
      '[RecommendationPool] Error deleting all pool entries:',
      error
    );
    throw error;
  }
}

/**
 * Update last_shown_at timestamp for pool entries
 * Used to track when recommendations are displayed
 */
export async function updateLastShownAt(
  userId: string,
  tmdbIds: number[],
  supabaseClient?: SupabaseClient
): Promise<void> {
  if (tmdbIds.length === 0) return;

  const supabase = supabaseClient || useSupabaseClient();

  const { error } = await supabase
    .from(TABLES.RECOMMENDATION_POOL)
    .update({
      [RECOMMENDATION_POOL_FIELDS.LAST_SHOWN_AT]: new Date().toISOString(),
    })
    .eq(RECOMMENDATION_POOL_FIELDS.USER_ID, userId)
    .in(RECOMMENDATION_POOL_FIELDS.TMDB_ID, tmdbIds);

  if (error) {
    console.error('[RecommendationPool] Error updating last_shown_at:', error);
    // Don't throw - this is not critical
    console.warn('[RecommendationPool] Continuing despite error');
  }
}

/**
 * Get pool entries for a user, ordered by score
 */
export async function getPoolEntries(
  userId: string,
  limit?: number,
  supabaseClient?: SupabaseClient
): Promise<RecommendationPoolEntry[]> {
  const supabase = supabaseClient || useSupabaseClient();

  let query = supabase
    .from(TABLES.RECOMMENDATION_POOL)
    .select('*')
    .eq(RECOMMENDATION_POOL_FIELDS.USER_ID, userId)
    .order(RECOMMENDATION_POOL_FIELDS.SCORE, { ascending: false })
    .order(RECOMMENDATION_POOL_FIELDS.CREATED_AT, { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[RecommendationPool] Error getting pool entries:', error);
    throw error;
  }

  return (data as RecommendationPoolEntry[]) || [];
}

/**
 * @deprecated This function is no longer needed as title_data has been removed from recommendation_pool.
 * Title data is now fetched from the titles table when needed.
 */
export async function updateTitleDataLanguage(
  userId: string,
  _newLanguage: string,
  supabaseClient?: SupabaseClient
): Promise<void> {
  // No-op: title_data has been removed from recommendation_pool
  // Title data is now fetched from titles table when needed
}

