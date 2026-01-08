import { createClient } from '@supabase/supabase-js';
import { devError, devWarn, safeError } from '@/server/utils/logger';
import { Recommendation, Provider } from '@/types/Recommendation';
import { TITLE_STATUS } from '@/constants/domain/titleStatus';
import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { type Mood } from '@/constants/domain/mood';
import { type Attention } from '@/constants/domain/attention';
import {
  EXPLORATION_MODE,
  type ExplorationMode,
} from '@/constants/domain/explorationMode';
import {
  PRIORITIZE_CONTENT,
  type PrioritizeContent,
} from '@/constants/domain/prioritizeContent';
import { getTMDBConfig } from '@/server/utils/config';
import { getUserTMDBParams } from '@/server/utils/user-tmdb';
import { RECOMMENDATION_POOL_COLUMNS } from '@/constants/db/columns';
import { updateLastShownAt } from '@/services/recommendationPool';
import { TABLES } from '@/constants/db/tables';
import {
  USER_PREFERENCES_COLUMNS,
  USER_TITLE_STATUS_COLUMNS,
} from '@/constants/db/columns';
import { calculateAnimationBias } from '@/services/animationBias';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { QUERY_PARAMS } from '@/constants/api/queryParams';
import { BOOST_WEIGHTS, PROTECTION_FACTOR } from '@/constants/recommendations';
import {
  calculateBoostFactors,
  filterByProviders,
  getTitleData,
} from '@/server/utils/recommendations';
import { getExplanationTranslation } from '@/server/utils/translations';

/**
 * Maximum number of recommendations to return
 */
const MAX_RECOMMENDATIONS = 20;

/**
 * Check if a title is a recent release
 * Movies: within last 2 years
 * TV: within last 1 year
 */
function isRecentRelease(
  titleData: { release_date: string | null; first_air_date: string | null },
  type: 'movie' | 'tv'
): boolean {
  const dateStr =
    type === MEDIA_TYPE.MOVIE
      ? titleData.release_date
      : titleData.first_air_date;
  if (!dateStr) return false;

  const releaseDate = new Date(dateStr);
  const now = new Date();
  const yearsDiff =
    (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

  return type === MEDIA_TYPE.MOVIE ? yearsDiff <= 2 : yearsDiff <= 1;
}

/**
 * Check if a title is a classic (older than 20 years)
 */
function isClassic(titleData: {
  release_date: string | null;
  first_air_date: string | null;
}): boolean {
  const dateStr = titleData.release_date || titleData.first_air_date;
  if (!dateStr) return false;

  const releaseDate = new Date(dateStr);
  const now = new Date();
  const yearsDiff =
    (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

  return yearsDiff > 20;
}

/**
 * Get recommendations for the authenticated user from recommendation_pool
 *
 * Strategy:
 * - Read from recommendation_pool (not TMDB)
 * - Exclude titles with status 'seen', 'not_interested', or 'watchlist'
 * - Order by score DESC, created_at DESC
 * - Support mood/attention reordering (no recalculation)
 */
export default defineEventHandler(async (event) => {
  // Disable caching for recommendations
  setHeader(
    event,
    'Cache-Control',
    'no-cache, no-store, must-revalidate, private'
  );
  setHeader(event, 'Pragma', 'no-cache');
  setHeader(event, 'Expires', '0');

  const config = useRuntimeConfig();

  // Get query params for mood, attention, content type, and preserve_ids
  const query = getQuery(event);
  const mood = query[QUERY_PARAMS.MOOD] as Mood | undefined;
  const attention = query[QUERY_PARAMS.ATTENTION] as Attention | undefined;
  const contentType = query[QUERY_PARAMS.TYPE] as 'movie' | 'tv' | undefined; // Filter by content type on server
  const preserveIdsParam = query[QUERY_PARAMS.PRESERVE_IDS] as
    | string
    | undefined; // Format: "tmdb_id:type,tmdb_id:type"

  // Use centralized function to get userId
  const userId = await getUserIdFromEvent(event);

  if (!userId) {
    devError('[Recommendations] Unauthorized - no user found');
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  // Create Supabase client - Use SERVICE_ROLE_KEY in production to bypass RLS
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    devWarn(
      '[Recommendations] WARNING: Using anon key instead of service role key. RLS policies may block queries.'
    );
  }

  const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    // Get user preferences for providers, genres, exploration_mode, and prioritize_content
    const { data: userPreferences } = await supabase
      .from(TABLES.USER_PREFERENCES)
      .select(
        `${USER_PREFERENCES_COLUMNS.INCLUDED_PROVIDERS}, ${USER_PREFERENCES_COLUMNS.FAVORITE_GENRES}, ${USER_PREFERENCES_COLUMNS.EXPLORATION_MODE}, ${USER_PREFERENCES_COLUMNS.PRIORITIZE_CONTENT}`
      )
      .eq(USER_PREFERENCES_COLUMNS.USER_ID, userId)
      .maybeSingle();

    const includedProviders =
      (userPreferences?.[USER_PREFERENCES_COLUMNS.INCLUDED_PROVIDERS] as
        | number[]
        | null) || [];
    const favoriteGenres =
      (userPreferences?.[USER_PREFERENCES_COLUMNS.FAVORITE_GENRES] as
        | number[]
        | null) || [];
    const explorationMode =
      (userPreferences?.[
        USER_PREFERENCES_COLUMNS.EXPLORATION_MODE
      ] as ExplorationMode | null) || EXPLORATION_MODE.BALANCED;
    const prioritizeContent =
      (userPreferences?.[
        USER_PREFERENCES_COLUMNS.PRIORITIZE_CONTENT
      ] as PrioritizeContent | null) || PRIORITIZE_CONTENT.NEW;

    // Get excluded titles (seen + not_interested + watchlist)
    // Watchlist titles should NOT appear in recommendations
    const { data: excludedStatuses, error: statusError } = await supabase
      .from(TABLES.USER_TITLE_STATUS)
      .select(USER_TITLE_STATUS_COLUMNS.TMDB_ID)
      .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
      .in(USER_TITLE_STATUS_COLUMNS.STATUS, [
        TITLE_STATUS.SEEN,
        TITLE_STATUS.NOT_INTERESTED,
        TITLE_STATUS.WATCHLIST,
      ]);

    if (statusError) {
      safeError('Error fetching user_title_status', statusError);
      // Don't throw - continue without filtering if there's an error
    }

    // Build set of excluded tmdb_ids
    const excludedTmdbIds = new Set<number>();
    if (excludedStatuses) {
      excludedStatuses.forEach((status) => {
        excludedTmdbIds.add(status.tmdb_id);
      });
    }

    // Parse preserve_ids if provided (for language changes - maintain same order)
    let preserveIdsOrder: Array<{
      tmdb_id: number;
      type: 'movie' | 'tv';
    }> | null = null;
    if (preserveIdsParam) {
      try {
        preserveIdsOrder = preserveIdsParam.split(',').map((item) => {
          const [tmdbId, type] = item.trim().split(':');
          return {
            tmdb_id: parseInt(tmdbId, 10),
            type: type as 'movie' | 'tv',
          };
        });
        if (import.meta.dev) {
          devWarn(
            `[Recommendations] Preserving recommendation order: ${preserveIdsOrder.length} titles`
          );
        }
      } catch (error) {
        devWarn(
          '[Recommendations] Error parsing preserve_ids, ignoring:',
          error
        );
        preserveIdsOrder = null;
      }
    }

    // Fetch all recommendations from pool (no source filtering)
    const fetchRecommendations = async (): Promise<Recommendation[]> => {
      let poolEntries;
      let poolError;

      // If preserve_ids is provided, fetch only those specific IDs in the specified order
      if (preserveIdsOrder && preserveIdsOrder.length > 0) {
        // Build a map of requested IDs for quick lookup
        const requestedIdsMap = new Map<string, number>();
        preserveIdsOrder.forEach((item, index) => {
          const key = `${item.tmdb_id}:${item.type}`;
          requestedIdsMap.set(key, index);
        });

        // Fetch all requested IDs from pool
        const tmdbIds = preserveIdsOrder.map((item) => item.tmdb_id);
        const types = preserveIdsOrder.map((item) => item.type);

        const query = supabase
          .from(TABLES.RECOMMENDATION_POOL)
          .select(
            `
            ${RECOMMENDATION_POOL_COLUMNS.TMDB_ID},
            ${RECOMMENDATION_POOL_COLUMNS.TYPE},
            ${RECOMMENDATION_POOL_COLUMNS.SOURCE},
            ${RECOMMENDATION_POOL_COLUMNS.SCORE},
            ${RECOMMENDATION_POOL_COLUMNS.BASE_SCORE},
            ${RECOMMENDATION_POOL_COLUMNS.PREFERENCE_SCORE},
            ${RECOMMENDATION_POOL_COLUMNS.LAST_SHOWN_AT},
            ${RECOMMENDATION_POOL_COLUMNS.EXPLANATION_CODE},
            ${RECOMMENDATION_POOL_COLUMNS.CREATED_AT}
          `
          )
          .eq(RECOMMENDATION_POOL_COLUMNS.USER_ID, userId)
          .in(RECOMMENDATION_POOL_COLUMNS.TMDB_ID, tmdbIds);

        const result = await query;
        poolEntries = result.data;
        poolError = result.error;

        if (poolError) {
          safeError('[Recommendations] Error fetching from pool', poolError);
          return [];
        }

        if (!poolEntries || poolEntries.length === 0) {
          return [];
        }

        // Sort entries to match the preserve_ids order
        poolEntries.sort((a, b) => {
          const keyA = `${a.tmdb_id}:${a.type}`;
          const keyB = `${b.tmdb_id}:${b.type}`;
          const indexA = requestedIdsMap.get(keyA) ?? Infinity;
          const indexB = requestedIdsMap.get(keyB) ?? Infinity;
          return indexA - indexB;
        });

        // Filter out excluded titles (shouldn't happen if IDs are from current recommendations, but safety check)
        // When preserve_ids is used, the IDs already reflect all applied filters (mood, attention, content type, etc.)
        // So we should NOT re-apply filters that could remove titles - only safety checks
        let filteredEntries = poolEntries.filter(
          (entry) => !excludedTmdbIds.has(entry.tmdb_id)
        );

        // Note: We don't filter by contentType here because the preserve_ids already reflect the filtered state
        // If contentType filter was applied, the IDs passed already have the correct type
        // Re-filtering could incorrectly remove titles that should be preserved

        // Sort entries to match the preserve_ids order exactly
        filteredEntries.sort((a, b) => {
          const keyA = `${a.tmdb_id}:${a.type}`;
          const keyB = `${b.tmdb_id}:${b.type}`;
          const indexA = requestedIdsMap.get(keyA) ?? Infinity;
          const indexB = requestedIdsMap.get(keyB) ?? Infinity;
          return indexA - indexB;
        });

        // Continue with filtered entries
        // Skip provider/genre/mood/attention filtering to maintain exact order
        // The IDs passed already reflect all filters applied on the client side
        // Get user preferences for language and region (needed for TMDB fallback)
        const { language, region } = await getUserTMDBParams(event);
        const tmdbConfig = getTMDBConfig(language, region);

        // Helper to fetch title data from titles table (or TMDB if missing)
        const getTitleDataForEntry = async (
          entry: (typeof filteredEntries)[0]
        ): Promise<TitleData | null> => {
          return getTitleData(
            entry,
            language,
            region,
            supabase,
            tmdbConfig,
            '[Recommendations]'
          );
        };

        // Get title data for all entries in order
        const entriesWithTitles = await Promise.all(
          filteredEntries.map(async (entry) => {
            const titleData = await getTitleDataForEntry(entry);
            if (!titleData) return null;

            // Get base_score and preference_score from pool entry
            const baseScore = entry.base_score ?? 0;
            const preferenceScore = entry.preference_score ?? 0;

            // Build recommendation object (simplified - no score calculation needed, just preserve order)
            return {
              entry,
              titleData,
              baseScore,
              preferenceScore,
            };
          })
        );

        // Filter out null entries and build recommendations
        const validEntries = entriesWithTitles.filter(
          (item): item is NonNullable<typeof item> => item !== null
        );

        // Build recommendations in the preserved order
        const recommendations: Recommendation[] = validEntries.map(
          ({ entry, titleData }) => {
            // Get explanation text
            const explanationCode = entry.explanation_code;
            const explanation = explanationCode
              ? getExplanationTranslation(event, explanationCode)
              : getExplanationTranslation(event, null);

            return {
              id: `${entry.tmdb_id}-${entry.type}`,
              tmdb_id: entry.tmdb_id,
              title: titleData.title,
              type: entry.type as 'movie' | 'tv',
              poster_path: titleData.poster_path,
              overview: titleData.overview,
              vote_average: titleData.vote_average,
              genres: titleData.genres.map((g) => g.id),
              release_date: titleData.release_date,
              first_air_date: titleData.first_air_date,
              explanation,
              explanation_code: explanationCode,
              providers: titleData.providers,
              in_watchlist: false, // Will be set below if needed
              liked: false, // Will be set below if needed
            };
          }
        );

        // Set watchlist and liked status
        const recommendationTmdbIds = new Set(
          recommendations.map((r) => r.tmdb_id)
        );
        const { data: statusData } = await supabase
          .from(TABLES.USER_TITLE_STATUS)
          .select(
            `${USER_TITLE_STATUS_COLUMNS.TMDB_ID}, ${USER_TITLE_STATUS_COLUMNS.STATUS}, ${USER_TITLE_STATUS_COLUMNS.LIKED}`
          )
          .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
          .in(
            USER_TITLE_STATUS_COLUMNS.TMDB_ID,
            Array.from(recommendationTmdbIds)
          );

        if (statusData) {
          const statusMap = new Map<
            number,
            { status: string; liked: boolean }
          >();
          statusData.forEach((status) => {
            statusMap.set(status.tmdb_id, {
              status: status.status,
              liked: status.liked || false,
            });
          });

          recommendations.forEach((rec) => {
            const status = statusMap.get(rec.tmdb_id);
            if (status) {
              rec.in_watchlist = status.status === TITLE_STATUS.WATCHLIST;
              rec.liked = status.liked;
            }
          });
        }

        // Update last_shown_at for all recommendations
        if (recommendations.length > 0) {
          const tmdbIdsToUpdate = recommendations.map((r) => r.tmdb_id);
          await updateLastShownAt(userId, tmdbIdsToUpdate, supabase);
        }

        return recommendations;
      }

      // Normal flow: fetch all recommendations from pool
      // Build query to get pool entries (title_data removed, will fetch from titles table)
      // IMPORTANT: We read base_score and preference_score, but order by score (base + preference)
      // Final ordering will be done by final_score calculated in runtime
      const query = supabase
        .from(TABLES.RECOMMENDATION_POOL)
        .select(
          `
          ${RECOMMENDATION_POOL_COLUMNS.TMDB_ID},
          ${RECOMMENDATION_POOL_COLUMNS.TYPE},
          ${RECOMMENDATION_POOL_COLUMNS.SOURCE},
          ${RECOMMENDATION_POOL_COLUMNS.SCORE},
          ${RECOMMENDATION_POOL_COLUMNS.BASE_SCORE},
          ${RECOMMENDATION_POOL_COLUMNS.PREFERENCE_SCORE},
          ${RECOMMENDATION_POOL_COLUMNS.LAST_SHOWN_AT},
          ${RECOMMENDATION_POOL_COLUMNS.EXPLANATION_CODE},
          ${RECOMMENDATION_POOL_COLUMNS.CREATED_AT}
        `
        )
        .eq(RECOMMENDATION_POOL_COLUMNS.USER_ID, userId);

      // Get entries ordered by score (base + preference) as initial ranking
      // Final ordering will be by final_score calculated in runtime
      const result = await query
        .order(RECOMMENDATION_POOL_COLUMNS.SCORE, { ascending: false })
        .order(RECOMMENDATION_POOL_COLUMNS.CREATED_AT, { ascending: false })
        .limit(MAX_RECOMMENDATIONS * 3); // Get more to filter excluded titles and apply boosts

      poolEntries = result.data;
      poolError = result.error;

      if (poolError) {
        safeError('[Recommendations] Error fetching from pool', poolError);
        return [];
      }

      if (!poolEntries || poolEntries.length === 0) {
        return [];
      }

      // Filter out excluded titles in JavaScript (more reliable than .not() with large arrays)
      let filteredEntries = poolEntries.filter(
        (entry) => !excludedTmdbIds.has(entry.tmdb_id)
      );

      // Filter by content type on server if specified
      if (contentType) {
        filteredEntries = filteredEntries.filter(
          (entry) => entry.type === contentType
        );
      }

      // Get user preferences for language and region (needed for TMDB fallback)
      const { language, region } = await getUserTMDBParams(event);
      const tmdbConfig = getTMDBConfig(language, region);

      // Filter by providers if user has preferences
      // Only include titles that have the selected providers in flatrate
      // Exclude titles that don't have the provider in flatrate
      filteredEntries = await filterByProviders(
        filteredEntries,
        includedProviders,
        region,
        tmdbConfig,
        '[Recommendations]'
      );

      // Filter by genres if user has preferences
      // This will be applied after we get title data (genres come from titles table)

      // Helper to fetch title data from titles table (or TMDB if missing)
      // IMPORTANT: title_data has been removed from recommendation_pool, all data comes from titles table
      const getTitleDataForEntry = async (
        entry: (typeof filteredEntries)[0]
      ): Promise<TitleData | null> => {
        return getTitleData(
          entry,
          language,
          region,
          supabase,
          tmdbConfig,
          '[Recommendations]'
        );
      };

      // Combine pool entries with title data from titles table and calculate final scores
      const entriesWithTitles = await Promise.all(
        filteredEntries.map(async (entry) => {
          const titleData = await getTitleDataForEntry(entry);
          if (!titleData) return null;

          const genreIds = titleData.genres.map((g) => g.id);
          const voteAverage = titleData.vote_average;

          // Filter by genres if user has preferences
          if (favoriteGenres.length > 0) {
            const hasMatchingGenre = genreIds.some((genreId) =>
              favoriteGenres.includes(genreId)
            );
            if (!hasMatchingGenre) {
              return null; // Exclude if no matching genre
            }
          }

          // Get base_score and preference_score from pool entry
          const baseScore = entry.base_score ?? 0;
          const preferenceScore = entry.preference_score ?? 0;

          // Calculate recency_weight based on last_shown_at
          // Exponential decay: e^(-days_since_shown * decay_rate)
          // Normalize to range 0.5 - 1.0
          let recencyWeight = 1.0;
          if (entry.last_shown_at) {
            const daysSinceShown =
              (Date.now() - new Date(entry.last_shown_at).getTime()) /
              (1000 * 60 * 60 * 24);
            const decayRate = 0.1; // Adjustable decay rate
            const decayFactor = Math.exp(-daysSinceShown * decayRate);
            // Normalize to 0.5 - 1.0 range
            recencyWeight = 0.5 + decayFactor * 0.5;
          }

          // Calculate animation_bias
          const animationBias = await calculateAnimationBias(
            entry.tmdb_id,
            entry.type as 'movie' | 'tv',
            titleData.genres,
            voteAverage,
            null, // popularity not available from titles table
            userId,
            supabase
          );

          // Calculate final_score with new formula:
          // final_score = (base_score * 0.4 + preference_score * 0.4 + recency_weight * 0.2) * animation_bias
          // Note: recency_weight is normalized 0.5-1.0, so we scale it appropriately
          const recencyComponent = recencyWeight * 50; // Scale to 0-50 range
          let finalScore =
            (baseScore * 0.4 + preferenceScore * 0.4 + recencyComponent * 0.2) *
            animationBias;

          // Store base finalScore before runtime boosts for cap calculation
          const baseFinalScore = finalScore;

          // Apply exploration_mode adjustments (runtime only, before mood/attention)
          if (explorationMode === EXPLORATION_MODE.SIMILAR) {
            // Boost titles with source = 'based_on_like' by 10%
            if (entry.source === 'based_on_like') {
              finalScore *= 1.1;
            }
          } else if (explorationMode === EXPLORATION_MODE.SURPRISE) {
            // Boost titles with low preference_score (< 5) by 5%
            // preference_score < 5 is considered "low historical affinity" (not reinforced by previous likes)
            if (preferenceScore < 5) {
              finalScore *= 1.05;
            }
          }
          // BALANCED: No modification (default behavior)

          // Apply prioritize_content adjustments (runtime only, after exploration_mode)
          if (prioritizeContent === PRIORITIZE_CONTENT.NEW) {
            // Boost recent releases: last 2 years for movies, 1 year for TV
            if (isRecentRelease(titleData, entry.type as 'movie' | 'tv')) {
              finalScore *= 1.05;
            }
          } else if (prioritizeContent === PRIORITIZE_CONTENT.CLASSICS) {
            // Boost older titles (>20 years) with high base_score (>= 40)
            if (isClassic(titleData) && baseScore >= 40) {
              finalScore *= 1.05;
            }
          } else if (prioritizeContent === PRIORITIZE_CONTENT.TOP_RATED) {
            // Boost titles with base_score >= 40
            if (baseScore >= 40) {
              finalScore *= 1.05;
            }
          }

          // Calculate boost factors for mood/attention (applied as runtime adjustment)
          // Note: runtime and episodeCount not available from titles table,
          // so we'll use genre-based heuristics for attention
          const { attentionFactor, moodFactor } = calculateBoostFactors(
            genreIds,
            voteAverage,
            null, // runtime not available
            null, // episodeCount not available
            entry.type as 'movie' | 'tv',
            mood,
            attention
          );

          // Apply mood/attention as runtime multiplicative adjustment
          const combinedFactor =
            attentionFactor * BOOST_WEIGHTS.ATTENTION +
            moodFactor * BOOST_WEIGHTS.MOOD;
          let adjustedFinalScore =
            finalScore * Math.max(1 + combinedFactor, PROTECTION_FACTOR);

          // Apply boost cap: sum of runtime boosts never exceeds +25% of base score
          // This prevents "hyper-optimized" feeds if more signals are added in the future
          adjustedFinalScore = Math.min(
            adjustedFinalScore,
            baseFinalScore * 1.25
          );

          // Determine runtime explanation code (MOOD_MATCH override if applicable)
          // MOOD_MATCH has highest priority, then persisted explanation_code
          let runtimeExplanationCode = entry.explanation_code;
          if (mood && moodFactor > 0) {
            // If mood is active and title matches mood (moodFactor > 0), override explanation
            runtimeExplanationCode = 'MOOD_MATCH';
          }

          return {
            ...entry,
            titleData,
            finalScore: adjustedFinalScore,
            baseScore,
            preferenceScore,
            genreIds,
            voteAverage,
            recencyWeight,
            animationBias,
            runtimeExplanationCode, // Include runtime explanation for use in recommendations array
          };
        })
      );

      const validEntries = entriesWithTitles.filter(
        (entry) => entry !== null
      ) as Array<
        (typeof filteredEntries)[0] & {
          titleData: TitleData;
          finalScore: number;
          baseScore: number;
          preferenceScore: number;
          genreIds: number[];
          voteAverage: number | null;
          recencyWeight: number;
          animationBias: number;
          runtimeExplanationCode: string | null;
        }
      >;

      // Apply controlled randomization (±5%)
      validEntries.forEach((entry) => {
        const randomFactor = 1 + (Math.random() - 0.5) * 0.1; // ±5%
        entry.finalScore = entry.finalScore * randomFactor;
      });

      // Sort by final_score (NOT by score)
      // IMPORTANT: score is base_score + preference_score (persisted)
      // final_score includes recency_weight and animation_bias (runtime)
      validEntries.sort((a, b) => {
        // First sort by final score
        if (b.finalScore !== a.finalScore) {
          return b.finalScore - a.finalScore;
        }

        // Then by base score
        if (b.baseScore !== a.baseScore) {
          return b.baseScore - a.baseScore;
        }

        // Finally by created_at (most recent first)
        const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bCreated - aCreated;
      });

      // Apply 50/50 balance between movies and TV shows when no filters are active
      // Note: contentType filter is applied on server, so we don't need to balance here
      const hasFilters =
        mood !== undefined ||
        attention !== undefined ||
        contentType !== undefined;
      let balancedEntries = validEntries;

      if (!hasFilters) {
        // Separate movies and TV shows
        const movies = validEntries.filter(
          (entry) => entry.type === MEDIA_TYPE.MOVIE
        );
        const tvShows = validEntries.filter(
          (entry) => entry.type === MEDIA_TYPE.TV
        );

        // Try to get 10 of each type, but fill up to MAX_RECOMMENDATIONS (20) total
        const moviesToTake = Math.min(10, movies.length);
        const tvShowsToTake = Math.min(10, tvShows.length);
        const topMovies = movies.slice(0, moviesToTake);
        const topTvShows = tvShows.slice(0, tvShowsToTake);

        // Interleave to achieve 50/50 balance
        const balanced: typeof validEntries = [];
        const maxLength = Math.max(topMovies.length, topTvShows.length);

        for (let i = 0; i < maxLength; i++) {
          // Alternate between movie and TV show
          if (i < topMovies.length) {
            balanced.push(topMovies[i]);
          }
          if (i < topTvShows.length) {
            balanced.push(topTvShows[i]);
          }
        }

        // If we don't have 20 results yet, fill with remaining entries from the type that has more
        if (balanced.length < MAX_RECOMMENDATIONS) {
          const remaining = MAX_RECOMMENDATIONS - balanced.length;
          const usedMovieIds = new Set(topMovies.map((m) => m.tmdb_id));
          const usedTvShowIds = new Set(topTvShows.map((t) => t.tmdb_id));

          // Determine which type has more unused entries
          const remainingMovies = movies.filter(
            (m) => !usedMovieIds.has(m.tmdb_id)
          );
          const remainingTvShows = tvShows.filter(
            (t) => !usedTvShowIds.has(t.tmdb_id)
          );

          // Fill with the type that has more remaining entries, or alternate if both have some
          let movieIndex = 0;
          let tvShowIndex = 0;
          for (
            let i = 0;
            i < remaining && balanced.length < MAX_RECOMMENDATIONS;
            i++
          ) {
            // Alternate between types if both have remaining entries
            if (
              movieIndex < remainingMovies.length &&
              tvShowIndex < remainingTvShows.length
            ) {
              // Alternate based on current balance
              if (
                balanced.length % 2 === 0 &&
                movieIndex < remainingMovies.length
              ) {
                balanced.push(remainingMovies[movieIndex++]);
              } else if (tvShowIndex < remainingTvShows.length) {
                balanced.push(remainingTvShows[tvShowIndex++]);
              }
            } else if (movieIndex < remainingMovies.length) {
              balanced.push(remainingMovies[movieIndex++]);
            } else if (tvShowIndex < remainingTvShows.length) {
              balanced.push(remainingTvShows[tvShowIndex++]);
            } else {
              break; // No more entries available
            }
          }
        }

        balancedEntries = balanced;
      }

      // Transform sorted pool entries to recommendations
      // Deduplicate by tmdb_id to ensure no duplicates
      const recommendations: Recommendation[] = [];
      const tmdbIdsToTrack: number[] = [];
      const seenTmdbIds = new Set<number>();

      for (const entry of balancedEntries.slice(0, MAX_RECOMMENDATIONS * 2)) {
        // Skip if we've already seen this tmdb_id
        if (seenTmdbIds.has(entry.tmdb_id)) {
          continue;
        }

        // Stop if we've reached the maximum number of recommendations
        if (recommendations.length >= MAX_RECOMMENDATIONS) {
          break;
        }

        // Mark this tmdb_id as seen
        seenTmdbIds.add(entry.tmdb_id);
        const titleData = entry.titleData;

        // Fetch providers from TMDB (still need this for display)
        let providers: Provider[] = [];
        try {
          const providerPath =
            entry.type === MEDIA_TYPE.MOVIE
              ? `/movie/${entry.tmdb_id}/watch/providers`
              : `/tv/${entry.tmdb_id}/watch/providers`;
          const providerResponse = await $fetch<{
            results?: {
              [key: string]: {
                flatrate?: Provider[];
                buy?: Provider[];
                rent?: Provider[];
              };
            };
          }>(`${tmdbConfig.baseUrl}${providerPath}`, {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
            },
          });

          // Use user's region for providers, fallback to ES
          // IMPORTANT: Only use flatrate providers (streaming services)
          const regionProviders =
            providerResponse.results?.[region] || providerResponse.results?.ES;
          if (regionProviders) {
            providers = (regionProviders.flatrate || []).slice(0, 5);
          }
        } catch (error) {
          // Don't fail if providers can't be fetched
          if (process.env.NODE_ENV === 'development') {
            console.error(
              `Error fetching providers for ${entry.tmdb_id}:`,
              error
            );
          }
        }

        // Map explanation_code to explanation text using translations
        // Priority: MOOD_MATCH (runtime) > persisted explanation_code > fallback
        // Note: explanation is NOT a single causal reason, it's the best available explanation for the user
        const { getExplanationTranslation } =
          await import('@/server/utils/translations');

        // Use runtime explanation code (may be MOOD_MATCH override) or fallback to persisted
        const explanationCodeToUse =
          entry.runtimeExplanationCode || entry.explanation_code || null;
        const explanation = getExplanationTranslation(
          event,
          explanationCodeToUse
        );

        recommendations.push({
          id: `pool-${entry.tmdb_id}`,
          tmdb_id: entry.tmdb_id,
          title: titleData.title || '',
          type: entry.type as typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV,
          poster_path: titleData.poster_path,
          overview: titleData.overview || null,
          vote_average: titleData.vote_average,
          genres: entry.genreIds.length > 0 ? entry.genreIds : null,
          release_date: titleData.release_date,
          first_air_date: titleData.first_air_date,
          explanation,
          explanation_code: explanationCodeToUse,
          providers,
          in_watchlist: false, // Watchlist titles are excluded, so this is always false
        });

        tmdbIdsToTrack.push(entry.tmdb_id);
      }

      // Track that these recommendations were shown
      if (tmdbIdsToTrack.length > 0) {
        // Update last_shown_at in background (don't await)
        // Note: updateLastShownAt expects useSupabaseClient type, but we have createClient type
        // This is fine for server-side usage
        updateLastShownAt(
          userId,
          tmdbIdsToTrack,
          supabase as ReturnType<typeof useSupabaseClient>
        ).catch((err) => {
          // Don't fail if tracking fails
          safeError('[Recommendations] Error tracking views', err);
        });
      }

      return recommendations.slice(0, MAX_RECOMMENDATIONS);
    };

    // Fetch all recommendations from pool
    const allRecommendations = await fetchRecommendations();

    // If pool is empty, return empty array
    if (allRecommendations.length === 0) {
      devWarn(
        '[Recommendations] Pool is empty, returning empty recommendations'
      );
      return [];
    }

    return allRecommendations;
  } catch (error: unknown) {
    safeError('Error fetching recommendations', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Error al obtener recomendaciones';
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
