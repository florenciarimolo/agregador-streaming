/**
 * Service: Similarity propagation for recommendation pool
 * Propagates influence from user interactions to similar titles
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/constants/db/tables';
import { TITLES_COLUMNS, RECOMMENDATION_POOL_COLUMNS } from '@/constants/db/columns';
import { updatePreferenceScore } from './recommendationPool';

/**
 * Find similar titles based on shared genres
 * Returns titles with at least one shared genre
 */
export async function findSimilarTitles(
  tmdbId: number,
  type: 'movie' | 'tv',
  supabaseClient: SupabaseClient,
  userId: string
): Promise<Array<{ tmdb_id: number; sharedGenres: number }>> {
  // Get genres of the source title
  const { data: sourceTitle } = await supabaseClient
    .from(TABLES.TITLES)
    .select(TITLES_COLUMNS.GENRES)
    .eq(TITLES_COLUMNS.TMDB_ID, tmdbId)
    .eq(TITLES_COLUMNS.TYPE, type)
    .maybeSingle();

  if (!sourceTitle?.genres || !Array.isArray(sourceTitle.genres)) {
    return [];
  }

  const sourceGenreIds = sourceTitle.genres.map(
    (g: { id: number } | number) => (typeof g === 'number' ? g : g.id)
  );

  if (sourceGenreIds.length === 0) {
    return [];
  }

  // Find titles with shared genres that are in the user's pool
  const { data: poolEntries } = await supabaseClient
    .from(TABLES.RECOMMENDATION_POOL)
    .select(RECOMMENDATION_POOL_COLUMNS.TMDB_ID)
    .eq(RECOMMENDATION_POOL_COLUMNS.USER_ID, userId);

  if (!poolEntries || poolEntries.length === 0) {
    return [];
  }

  const poolTmdbIds = poolEntries.map((e) => e.tmdb_id);

  // Get titles from pool with genres
  const { data: titlesWithGenres } = await supabaseClient
    .from(TABLES.TITLES)
    .select(`${TITLES_COLUMNS.TMDB_ID}, ${TITLES_COLUMNS.TYPE}, ${TITLES_COLUMNS.GENRES}`)
    .in(TITLES_COLUMNS.TMDB_ID, poolTmdbIds)
    .eq(TITLES_COLUMNS.TYPE, type)
    .not(TITLES_COLUMNS.GENRES, 'is', null);

  if (!titlesWithGenres) {
    return [];
  }

  // Calculate similarity
  const similarTitles: Array<{ tmdb_id: number; sharedGenres: number }> = [];

  for (const title of titlesWithGenres) {
    if (title.tmdb_id === tmdbId) continue; // Skip the source title

    if (!title.genres || !Array.isArray(title.genres)) continue;

    const titleGenreIds = title.genres.map(
      (g: { id: number } | number) => (typeof g === 'number' ? g : g.id)
    );

    const sharedGenres = sourceGenreIds.filter((g) => titleGenreIds.includes(g));

    if (sharedGenres.length > 0) {
      similarTitles.push({
        tmdb_id: title.tmdb_id,
        sharedGenres: sharedGenres.length,
      });
    }
  }

  return similarTitles;
}

/**
 * Propagate like influence to similar titles
 * Strong influence for titles with ≥2 shared genres
 * Moderate influence for titles with 1 shared genre
 */
export async function propagateLikeInfluence(
  userId: string,
  tmdbId: number,
  type: 'movie' | 'tv',
  supabaseClient: SupabaseClient,
  baseIncrement: number = 5
): Promise<void> {
  const similarTitles = await findSimilarTitles(tmdbId, type, supabaseClient, userId);

  for (const similar of similarTitles) {
    // Get current preference_score
    const { data: currentEntry } = await supabaseClient
      .from(TABLES.RECOMMENDATION_POOL)
      .select(RECOMMENDATION_POOL_COLUMNS.PREFERENCE_SCORE)
      .eq(RECOMMENDATION_POOL_COLUMNS.USER_ID, userId)
      .eq(RECOMMENDATION_POOL_COLUMNS.TMDB_ID, similar.tmdb_id)
      .maybeSingle();

    if (!currentEntry) continue;

    const currentPreferenceScore = currentEntry.preference_score ?? 0;

    // Calculate increment based on shared genres
    let increment = baseIncrement;
    if (similar.sharedGenres >= 2) {
      increment = baseIncrement * 1.5; // Strong influence
    } else if (similar.sharedGenres === 1) {
      increment = baseIncrement * 0.7; // Moderate influence
    }

    const newPreferenceScore = Math.min(100, currentPreferenceScore + increment);
    await updatePreferenceScore(userId, similar.tmdb_id, newPreferenceScore, supabaseClient);
  }
}

/**
 * Propagate dislike influence to similar titles
 * Reduces preference_score for similar titles
 */
export async function propagateDislikeInfluence(
  userId: string,
  tmdbId: number,
  type: 'movie' | 'tv',
  supabaseClient: SupabaseClient,
  basePenalty: number = -8
): Promise<void> {
  const similarTitles = await findSimilarTitles(tmdbId, type, supabaseClient, userId);

  for (const similar of similarTitles) {
    // Get current preference_score
    const { data: currentEntry } = await supabaseClient
      .from(TABLES.RECOMMENDATION_POOL)
      .select(RECOMMENDATION_POOL_COLUMNS.PREFERENCE_SCORE)
      .eq(RECOMMENDATION_POOL_COLUMNS.USER_ID, userId)
      .eq(RECOMMENDATION_POOL_COLUMNS.TMDB_ID, similar.tmdb_id)
      .maybeSingle();

    if (!currentEntry) continue;

    const currentPreferenceScore = currentEntry.preference_score ?? 0;

    // Calculate penalty based on shared genres
    let penalty = basePenalty;
    if (similar.sharedGenres >= 2) {
      penalty = basePenalty * 1.3; // Strong penalty
    } else if (similar.sharedGenres === 1) {
      penalty = basePenalty * 0.6; // Moderate penalty
    }

    const newPreferenceScore = Math.max(-100, currentPreferenceScore + penalty);
    await updatePreferenceScore(userId, similar.tmdb_id, newPreferenceScore, supabaseClient);
  }
}

/**
 * Propagate remove like influence (soft decay)
 * Applies decay factor (*0.7) to similar titles
 */
export async function propagateRemoveLikeInfluence(
  userId: string,
  tmdbId: number,
  type: 'movie' | 'tv',
  supabaseClient: SupabaseClient,
  decayFactor: number = 0.7
): Promise<void> {
  const similarTitles = await findSimilarTitles(tmdbId, type, supabaseClient, userId);

  for (const similar of similarTitles) {
    // Get current preference_score
    const { data: currentEntry } = await supabaseClient
      .from(TABLES.RECOMMENDATION_POOL)
      .select(RECOMMENDATION_POOL_COLUMNS.PREFERENCE_SCORE)
      .eq(RECOMMENDATION_POOL_COLUMNS.USER_ID, userId)
      .eq(RECOMMENDATION_POOL_COLUMNS.TMDB_ID, similar.tmdb_id)
      .maybeSingle();

    if (!currentEntry) continue;

    const currentPreferenceScore = currentEntry.preference_score ?? 0;

    // Apply decay factor
    // Only apply if preference_score is positive (from previous likes)
    if (currentPreferenceScore > 0) {
      const newPreferenceScore = currentPreferenceScore * decayFactor;
      await updatePreferenceScore(userId, similar.tmdb_id, newPreferenceScore, supabaseClient);
    }
  }
}

/**
 * Propagate following influence to similar titles
 * Following is a soft, editorial signal with fixed propagation values:
 * - ≥2 shared genres: +4
 * - 1 shared genre: +2
 * 
 * This is separate from like propagation and uses fixed values instead of multipliers.
 */
export async function propagateFollowingInfluence(
  userId: string,
  tmdbId: number,
  type: 'movie' | 'tv',
  supabaseClient: SupabaseClient
): Promise<void> {
  const similarTitles = await findSimilarTitles(tmdbId, type, supabaseClient, userId);

  for (const similar of similarTitles) {
    // Get current preference_score
    const { data: currentEntry } = await supabaseClient
      .from(TABLES.RECOMMENDATION_POOL)
      .select(RECOMMENDATION_POOL_COLUMNS.PREFERENCE_SCORE)
      .eq(RECOMMENDATION_POOL_COLUMNS.USER_ID, userId)
      .eq(RECOMMENDATION_POOL_COLUMNS.TMDB_ID, similar.tmdb_id)
      .maybeSingle();

    if (!currentEntry) continue;

    const currentPreferenceScore = currentEntry.preference_score ?? 0;

    // Calculate increment based on shared genres (fixed values, not multipliers)
    let increment = 0;
    if (similar.sharedGenres >= 2) {
      increment = 4; // Strong influence
    } else if (similar.sharedGenres === 1) {
      increment = 2; // Moderate influence
    }

    if (increment > 0) {
      const newPreferenceScore = Math.min(100, currentPreferenceScore + increment);
      await updatePreferenceScore(userId, similar.tmdb_id, newPreferenceScore, supabaseClient);
    }
  }
}

/**
 * Revert following influence from similar titles
 * Removes the propagation that was applied when following
 */
export async function revertFollowingInfluence(
  userId: string,
  tmdbId: number,
  type: 'movie' | 'tv',
  supabaseClient: SupabaseClient
): Promise<void> {
  const similarTitles = await findSimilarTitles(tmdbId, type, supabaseClient, userId);

  for (const similar of similarTitles) {
    // Get current preference_score
    const { data: currentEntry } = await supabaseClient
      .from(TABLES.RECOMMENDATION_POOL)
      .select(RECOMMENDATION_POOL_COLUMNS.PREFERENCE_SCORE)
      .eq(RECOMMENDATION_POOL_COLUMNS.USER_ID, userId)
      .eq(RECOMMENDATION_POOL_COLUMNS.TMDB_ID, similar.tmdb_id)
      .maybeSingle();

    if (!currentEntry) continue;

    const currentPreferenceScore = currentEntry.preference_score ?? 0;

    // Calculate decrement based on shared genres (inverse of propagation)
    let decrement = 0;
    if (similar.sharedGenres >= 2) {
      decrement = 4; // Revert strong influence
    } else if (similar.sharedGenres === 1) {
      decrement = 2; // Revert moderate influence
    }

    if (decrement > 0) {
      const newPreferenceScore = Math.max(-100, currentPreferenceScore - decrement);
      await updatePreferenceScore(userId, similar.tmdb_id, newPreferenceScore, supabaseClient);
    }
  }
}
