/**
 * Service: Animation bias calculation
 * Dynamic multiplier to adjust scores of animated content (0.7-1.0)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/constants/db/tables';
import { TITLES_COLUMNS, USER_TITLE_STATUS_COLUMNS } from '@/constants/db/columns';

/**
 * Detect if a title is animated
 */
export function isAnimated(genres: Array<{ id: number; name: string }> | null): boolean {
  if (!genres || !Array.isArray(genres)) return false;
  return genres.some((g) => g.name === 'Animation' || g.id === 16);
}

/**
 * Detect if animation is "adult/serious"
 * Heuristics:
 * - Animation + dark genres (Sci-Fi, Thriller, Drama, Mystery)
 * - High rating/popularity
 */
export function detectAdultAnimation(
  genres: Array<{ id: number; name: string }> | null,
  voteAverage: number | null,
  popularity: number | null
): boolean {
  if (!isAnimated(genres)) return false;

  if (!genres || !Array.isArray(genres)) return false;

  // Dark/serious genres
  const darkGenres = [878, 53, 18, 9648]; // Sci-Fi, Thriller, Drama, Mystery
  const hasDarkGenre = genres.some((g) => darkGenres.includes(g.id));

  // High rating or popularity
  const hasHighRating = voteAverage !== null && voteAverage >= 7.5;
  const hasHighPopularity = popularity !== null && popularity >= 100;

  return hasDarkGenre || hasHighRating || hasHighPopularity;
}

/**
 * Calculate animation bias based on user behavior and title characteristics
 * Returns multiplier between 0.7 and 1.0
 */
export async function calculateAnimationBias(
  tmdbId: number,
  type: 'movie' | 'tv',
  genres: Array<{ id: number; name: string }> | null,
  voteAverage: number | null,
  popularity: number | null,
  userId: string,
  supabaseClient: SupabaseClient
): Promise<number> {
  // If not animated, no bias
  if (!isAnimated(genres)) {
    return 1.0;
  }

  // Base bias for animation
  let bias = 0.85;

  // Check user's interaction with animation
  await supabaseClient
    .from(TABLES.USER_TITLE_STATUS)
    .select(USER_TITLE_STATUS_COLUMNS.LIKED)
    .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
    .in(USER_TITLE_STATUS_COLUMNS.TMDB_ID, [tmdbId]); // Check this specific title

  // Get all user's liked titles to check for animation affinity
  const { data: allLikedTitles } = await supabaseClient
    .from(TABLES.USER_TITLE_STATUS)
    .select(USER_TITLE_STATUS_COLUMNS.TMDB_ID)
    .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_COLUMNS.LIKED, true)
    .limit(50);

  if (allLikedTitles && allLikedTitles.length > 0) {
    const likedTmdbIds = allLikedTitles.map((t) => t.tmdb_id);

    // Get genres of liked titles
    const { data: likedTitlesGenres } = await supabaseClient
      .from(TABLES.TITLES)
      .select(`${TITLES_COLUMNS.TMDB_ID}, ${TITLES_COLUMNS.GENRES}`)
      .in(TITLES_COLUMNS.TMDB_ID, likedTmdbIds);

    if (likedTitlesGenres) {
      // Count how many liked titles are animated
      const animatedLikedCount = likedTitlesGenres.filter((title) =>
        isAnimated(title.genres as Array<{ id: number; name: string }> | null)
      ).length;

      const animationAffinity = animatedLikedCount / likedTitlesGenres.length;

      // If user has high affinity for animation, reduce penalty
      if (animationAffinity >= 0.3) {
        bias = 0.95; // High affinity
      } else if (animationAffinity >= 0.15) {
        bias = 0.9; // Moderate affinity
      }
    }
  }

  // Check for explicit dislikes of animation
  const { data: dislikedTitles } = await supabaseClient
    .from(TABLES.USER_TITLE_STATUS)
    .select(USER_TITLE_STATUS_COLUMNS.TMDB_ID)
    .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
    .eq(USER_TITLE_STATUS_COLUMNS.STATUS, 'not_interested')
    .limit(20);

  if (dislikedTitles && dislikedTitles.length > 0) {
    const dislikedTmdbIds = dislikedTitles.map((t) => t.tmdb_id);

    const { data: dislikedTitlesGenres } = await supabaseClient
      .from(TABLES.TITLES)
      .select(`${TITLES_COLUMNS.TMDB_ID}, ${TITLES_COLUMNS.GENRES}`)
      .in(TITLES_COLUMNS.TMDB_ID, dislikedTmdbIds);

    if (dislikedTitlesGenres) {
      const animatedDislikedCount = dislikedTitlesGenres.filter((title) =>
        isAnimated(title.genres as Array<{ id: number; name: string }> | null)
      ).length;

      const animationDislikeRatio = animatedDislikedCount / dislikedTitlesGenres.length;

      // If user explicitly dislikes animation, increase penalty
      if (animationDislikeRatio >= 0.5) {
        bias = 0.7; // Strong penalty
      } else if (animationDislikeRatio >= 0.3) {
        bias = 0.75; // Moderate penalty
      }
    }
  }

  // Reduce penalty for adult/serious animation
  if (detectAdultAnimation(genres, voteAverage, popularity)) {
    bias = Math.min(1.0, bias + 0.1); // Reduce penalty by 0.1
  }

  return Math.max(0.7, Math.min(1.0, bias));
}

