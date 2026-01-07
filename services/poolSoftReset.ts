/**
 * Service: Soft reset for recommendation pool
 * Detects extreme user behavior and performs soft reset (reduces preference_score)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/constants/db/tables';
import { USER_TITLE_STATUS_COLUMNS, RECOMMENDATION_POOL_COLUMNS } from '@/constants/db/columns';
import { updatePreferenceScore } from './recommendationPool';

/**
 * Detect extreme behavior that warrants a soft reset
 * Conditions:
 * - User removes >60% of likes in a short window
 * - Recent behavior contradicts historical preferences
 */
export async function detectExtremeBehavior(
  userId: string,
  supabaseClient: SupabaseClient,
  timeWindowHours: number = 24
): Promise<boolean> {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - timeWindowHours);

  // Get all likes (historical)
  const { data: allLikes } = await supabaseClient
    .from(TABLES.USER_TITLE_STATUS)
    .select(USER_TITLE_STATUS_COLUMNS.CREATED_AT)
    .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_COLUMNS.LIKED, true);

  if (!allLikes || allLikes.length === 0) {
    return false;
  }

  // Get recent removals (unlikes) within time window
  // Note: We track this by checking if a title was liked before but is no longer liked
  // This is a simplified check - in a real system, you might track unlikes explicitly
  const { data: recentStatuses } = await supabaseClient
    .from(TABLES.USER_TITLE_STATUS)
    .select('*')
    .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
    .gte(USER_TITLE_STATUS_COLUMNS.CREATED_AT, cutoffTime.toISOString());

  // Count how many likes were removed
  // This is a heuristic - we check if there are status updates that removed likes
  // In practice, you might want to track this more explicitly
  const totalLikes = allLikes.length;
  const recentUnlikes = recentStatuses?.filter(
    (s) => s.liked === false && s.created_at >= cutoffTime.toISOString()
  ).length || 0;

  // If >60% of likes were removed in short window, trigger soft reset
  if (totalLikes > 0 && recentUnlikes / totalLikes > 0.6) {
    return true;
  }

  return false;
}

/**
 * Perform soft reset on preference_score
 * Reduces historical preference_score by decay factor (default 0.5)
 * Maintains base_score unchanged
 */
export async function performSoftReset(
  userId: string,
  supabaseClient: SupabaseClient,
  decayFactor: number = 0.5
): Promise<void> {
  // Get all pool entries with positive preference_score
  const { data: poolEntries } = await supabaseClient
    .from(TABLES.RECOMMENDATION_POOL)
    .select(
      `${RECOMMENDATION_POOL_COLUMNS.TMDB_ID}, ${RECOMMENDATION_POOL_COLUMNS.PREFERENCE_SCORE}`
    )
    .eq(RECOMMENDATION_POOL_COLUMNS.USER_ID, userId)
    .gt(RECOMMENDATION_POOL_COLUMNS.PREFERENCE_SCORE, 0);

  if (!poolEntries || poolEntries.length === 0) {
    return;
  }

  // Apply decay to each entry
  for (const entry of poolEntries) {
    const currentPreferenceScore = entry.preference_score ?? 0;
    const newPreferenceScore = currentPreferenceScore * decayFactor;
    await updatePreferenceScore(
      userId,
      entry.tmdb_id,
      newPreferenceScore,
      supabaseClient
    );
  }
}

