/**
 * Supabase Edge Function: process-title-status
 * 
 * Handles all heavy recommendation logic asynchronously:
 * - preference_score updates
 * - similarity propagation
 * - soft reset detection
 * 
 * This function is called asynchronously from the title-status endpoint
 * and does NOT block the user's request.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TITLE_STATUS = {
  WATCHLIST: 'watchlist',
  SEEN: 'seen',
  NOT_INTERESTED: 'not_interested',
} as const;

const TABLES = {
  TITLES: 'titles',
  USER_TITLE_STATUS: 'user_title_status',
  RECOMMENDATION_POOL: 'recommendation_pool',
} as const;

const COLUMNS = {
  USER_ID: 'user_id',
  TMDB_ID: 'tmdb_id',
  TYPE: 'type',
  STATUS: 'status',
  LIKED: 'liked',
  PREFERENCE_SCORE: 'preference_score',
  BASE_SCORE: 'base_score',
  SCORE: 'score',
  GENRES: 'genres',
} as const;

interface RequestPayload {
  userId: string;
  tmdb_id: number;
  type: 'movie' | 'tv';
  status: 'seen' | 'not_interested' | 'watchlist';
  liked?: boolean;
  previousStatus?: {
    status: string;
    liked?: boolean;
  };
}

/**
 * Update preference_score and recalculate score
 * score = base_score + preference_score
 */
async function updatePreferenceScore(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tmdbId: number,
  newPreferenceScore: number
): Promise<void> {
  // Get current entry to get base_score
  const { data: currentEntry, error: selectError } = await supabase
    .from(TABLES.RECOMMENDATION_POOL)
    .select(`${COLUMNS.BASE_SCORE}, ${COLUMNS.PREFERENCE_SCORE}`)
    .eq(COLUMNS.USER_ID, userId)
    .eq(COLUMNS.TMDB_ID, tmdbId)
    .single();

  if (selectError || !currentEntry) {
    // Entry doesn't exist in pool, nothing to update
    return;
  }

  const baseScore = currentEntry.base_score ?? 0;
  const newScore = baseScore + newPreferenceScore;

  const { error: updateError } = await supabase
    .from(TABLES.RECOMMENDATION_POOL)
    .update({
      [COLUMNS.PREFERENCE_SCORE]: newPreferenceScore,
      [COLUMNS.SCORE]: newScore,
    })
    .eq(COLUMNS.USER_ID, userId)
    .eq(COLUMNS.TMDB_ID, tmdbId);

  if (updateError) {
    console.error('[process-title-status] Error updating preference_score:', updateError);
    throw updateError;
  }
}

/**
 * Remove an entry from the pool
 */
async function removeFromPool(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tmdbId: number
): Promise<void> {
  const { error } = await supabase
    .from(TABLES.RECOMMENDATION_POOL)
    .delete()
    .eq(COLUMNS.USER_ID, userId)
    .eq(COLUMNS.TMDB_ID, tmdbId);

  if (error) {
    console.error('[process-title-status] Error removing entry from pool:', error);
    throw error;
  }
}

/**
 * Find similar titles based on shared genres
 */
async function findSimilarTitles(
  supabase: ReturnType<typeof createClient>,
  tmdbId: number,
  type: 'movie' | 'tv',
  userId: string
): Promise<Array<{ tmdb_id: number; sharedGenres: number }>> {
  // Get genres of the source title
  const { data: sourceTitle } = await supabase
    .from(TABLES.TITLES)
    .select(COLUMNS.GENRES)
    .eq(COLUMNS.TMDB_ID, tmdbId)
    .eq(COLUMNS.TYPE, type)
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
  const { data: poolEntries } = await supabase
    .from(TABLES.RECOMMENDATION_POOL)
    .select(COLUMNS.TMDB_ID)
    .eq(COLUMNS.USER_ID, userId);

  if (!poolEntries || poolEntries.length === 0) {
    return [];
  }

  const poolTmdbIds = poolEntries.map((e) => e.tmdb_id);

  // Get titles from pool with genres
  const { data: titlesWithGenres } = await supabase
    .from(TABLES.TITLES)
    .select(`${COLUMNS.TMDB_ID}, ${COLUMNS.TYPE}, ${COLUMNS.GENRES}`)
    .in(COLUMNS.TMDB_ID, poolTmdbIds)
    .eq(COLUMNS.TYPE, type)
    .not(COLUMNS.GENRES, 'is', null);

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
 */
async function propagateLikeInfluence(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tmdbId: number,
  type: 'movie' | 'tv',
  baseIncrement: number
): Promise<void> {
  const similarTitles = await findSimilarTitles(supabase, tmdbId, type, userId);

  for (const similar of similarTitles) {
    // Get current preference_score
    const { data: currentEntry } = await supabase
      .from(TABLES.RECOMMENDATION_POOL)
      .select(COLUMNS.PREFERENCE_SCORE)
      .eq(COLUMNS.USER_ID, userId)
      .eq(COLUMNS.TMDB_ID, similar.tmdb_id)
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
    await updatePreferenceScore(supabase, userId, similar.tmdb_id, newPreferenceScore);
  }
}

/**
 * Propagate dislike influence to similar titles
 */
async function propagateDislikeInfluence(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tmdbId: number,
  type: 'movie' | 'tv',
  basePenalty: number
): Promise<void> {
  const similarTitles = await findSimilarTitles(supabase, tmdbId, type, userId);

  for (const similar of similarTitles) {
    // Get current preference_score
    const { data: currentEntry } = await supabase
      .from(TABLES.RECOMMENDATION_POOL)
      .select(COLUMNS.PREFERENCE_SCORE)
      .eq(COLUMNS.USER_ID, userId)
      .eq(COLUMNS.TMDB_ID, similar.tmdb_id)
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
    await updatePreferenceScore(supabase, userId, similar.tmdb_id, newPreferenceScore);
  }
}

/**
 * Propagate remove like influence (soft decay)
 */
async function propagateRemoveLikeInfluence(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tmdbId: number,
  type: 'movie' | 'tv',
  decayFactor: number
): Promise<void> {
  const similarTitles = await findSimilarTitles(supabase, tmdbId, type, userId);

  for (const similar of similarTitles) {
    // Get current preference_score
    const { data: currentEntry } = await supabase
      .from(TABLES.RECOMMENDATION_POOL)
      .select(COLUMNS.PREFERENCE_SCORE)
      .eq(COLUMNS.USER_ID, userId)
      .eq(COLUMNS.TMDB_ID, similar.tmdb_id)
      .maybeSingle();

    if (!currentEntry) continue;

    const currentPreferenceScore = currentEntry.preference_score ?? 0;

    // Apply decay factor
    // Only apply if preference_score is positive (from previous likes)
    if (currentPreferenceScore > 0) {
      const newPreferenceScore = currentPreferenceScore * decayFactor;
      await updatePreferenceScore(supabase, userId, similar.tmdb_id, newPreferenceScore);
    }
  }
}

/**
 * Detect extreme behavior that warrants a soft reset
 */
async function detectExtremeBehavior(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  timeWindowHours: number = 24
): Promise<boolean> {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - timeWindowHours);

  // Get all likes (historical)
  const { data: allLikes } = await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .select('created_at')
    .eq(COLUMNS.USER_ID, userId)
    .eq(COLUMNS.LIKED, true);

  if (!allLikes || allLikes.length === 0) {
    return false;
  }

  // Get recent removals (unlikes) within time window
  const { data: recentStatuses } = await supabase
    .from(TABLES.USER_TITLE_STATUS)
    .select('*')
    .eq(COLUMNS.USER_ID, userId)
    .gte('created_at', cutoffTime.toISOString());

  // Count how many likes were removed
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
 */
async function performSoftReset(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  decayFactor: number = 0.5
): Promise<void> {
  // Get all pool entries with positive preference_score
  const { data: poolEntries } = await supabase
    .from(TABLES.RECOMMENDATION_POOL)
    .select(`${COLUMNS.TMDB_ID}, ${COLUMNS.PREFERENCE_SCORE}`)
    .eq(COLUMNS.USER_ID, userId)
    .gt(COLUMNS.PREFERENCE_SCORE, 0);

  if (!poolEntries || poolEntries.length === 0) {
    return;
  }

  // Apply decay to each entry
  for (const entry of poolEntries) {
    const currentPreferenceScore = entry.preference_score ?? 0;
    const newPreferenceScore = currentPreferenceScore * decayFactor;
    await updatePreferenceScore(supabase, userId, entry.tmdb_id, newPreferenceScore);
  }
}

Deno.serve(async (req) => {
  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    console.log('[process-title-status] Function called', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!supabaseServiceRoleKey,
      method: req.method,
    });

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('[process-title-status] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY', {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceRoleKey: !!supabaseServiceRoleKey,
      });
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // Parse request payload
    const payload: RequestPayload = await req.json();

    console.log('[process-title-status] Received payload:', {
      userId: payload.userId ? '***' : undefined,
      tmdb_id: payload.tmdb_id,
      type: payload.type,
      status: payload.status,
      liked: payload.liked,
      hasPreviousStatus: !!payload.previousStatus,
    });

    const { userId, tmdb_id, type, status, liked, previousStatus } = payload;

    if (!userId || !tmdb_id || !type || !status) {
      console.error('[process-title-status] Missing required fields', {
        hasUserId: !!userId,
        hasTmdbId: !!tmdb_id,
        hasType: !!type,
        hasStatus: !!status,
      });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get current preference_score
    const { data: currentPoolEntry } = await supabase
      .from(TABLES.RECOMMENDATION_POOL)
      .select(COLUMNS.PREFERENCE_SCORE)
      .eq(COLUMNS.USER_ID, userId)
      .eq(COLUMNS.TMDB_ID, tmdb_id)
      .maybeSingle();

    const currentPreferenceScore = currentPoolEntry?.preference_score ?? 0;

    // Handle LIKE (liked changed from false to true)
    const previousLiked = previousStatus?.liked ?? false;
    const likedWasProvided = typeof liked === 'boolean';
    const newLiked = likedWasProvided ? liked : previousLiked;

    if (likedWasProvided && previousLiked === false && newLiked === true) {
      // Increment preference_score
      const increment = 10; // Base increment for like
      const newPreferenceScore = Math.min(100, currentPreferenceScore + increment);
      await updatePreferenceScore(supabase, userId, tmdb_id, newPreferenceScore);

      // Propagate influence to similar titles
      await propagateLikeInfluence(supabase, userId, tmdb_id, type, increment);
    }

    // Handle REMOVE LIKE (liked changed from true to false)
    if (likedWasProvided && previousLiked === true && newLiked === false) {
      // Apply soft decay (*0.7)
      const newPreferenceScore = currentPreferenceScore * 0.7;
      await updatePreferenceScore(supabase, userId, tmdb_id, newPreferenceScore);

      // Propagate decay to similar titles
      await propagateRemoveLikeInfluence(supabase, userId, tmdb_id, type, 0.7);
    }

    // Handle DISLIKE (not_interested)
    if (status === TITLE_STATUS.NOT_INTERESTED) {
      // Strong penalty
      const penalty = -15;
      const newPreferenceScore = Math.max(-100, currentPreferenceScore + penalty);
      await updatePreferenceScore(supabase, userId, tmdb_id, newPreferenceScore);

      // Propagate penalty to similar titles
      await propagateDislikeInfluence(supabase, userId, tmdb_id, type, penalty);

      // Remove from pool
      await removeFromPool(supabase, userId, tmdb_id);
    }

    // Check for extreme behavior and perform soft reset if needed
    const shouldSoftReset = await detectExtremeBehavior(supabase, userId);
    if (shouldSoftReset) {
      console.log('[process-title-status] Performing soft reset');
      await performSoftReset(supabase, userId, 0.5);
    }

    console.log('[process-title-status] Processing completed successfully');
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[process-title-status] Error:', error);
    // Don't expose internal errors to caller
    // This function runs asynchronously, so errors are logged but don't affect UX
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

