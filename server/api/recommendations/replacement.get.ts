import { createClient } from '@supabase/supabase-js';
import { devError, safeError } from '@/server/utils/logger';
import { Recommendation, Provider } from '@/types/Recommendation';
import { TITLE_STATUS } from '@/constants/domain/titleStatus';
import { QUERY_PARAMS } from '@/constants/api/queryParams';
import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { type Mood } from '@/constants/domain/mood';
import { type Attention } from '@/constants/domain/attention';
import { getTMDBConfig } from '@/server/utils/config';
import { getUserTMDBParams } from '@/server/utils/user-tmdb';
import { type TitleData } from '@/services/recommendationPool';
import { TABLES } from '@/constants/db/tables';
import { RECOMMENDATION_POOL_COLUMNS } from '@/constants/db/columns';
import {
  USER_PREFERENCES_COLUMNS,
  USER_TITLE_STATUS_COLUMNS,
} from '@/constants/db/columns';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { BOOST_WEIGHTS, PROTECTION_FACTOR } from '@/constants/recommendations';
import {
  calculateBoostFactors,
  filterByProviders,
  getTitleData,
} from '@/server/utils/recommendations';

/**
 * Get a replacement recommendation when one is removed
 *
 * Query params:
 * - excluded_tmdb_id: The tmdb_id of the removed title
 * - excluded_type: The type (movie/tv) of the removed title
 * - mood: Optional mood filter
 * - attention: Optional attention filter
 */
export default defineEventHandler(async (event) => {
  // Disable caching for replacement recommendations
  setHeader(
    event,
    'Cache-Control',
    'no-cache, no-store, must-revalidate, private'
  );
  setHeader(event, 'Pragma', 'no-cache');
  setHeader(event, 'Expires', '0');

  const config = useRuntimeConfig();

  // Get query params
  const query = getQuery(event);
  const excludedTmdbId = query.excluded_tmdb_id
    ? Number(query.excluded_tmdb_id)
    : null;
  const excludedType = query.excluded_type as 'movie' | 'tv' | undefined;
  const mood = query[QUERY_PARAMS.MOOD] as Mood | undefined;
  const attention = query[QUERY_PARAMS.ATTENTION] as Attention | undefined;
  // Optional: exclude titles already in current recommendations
  const excludedRecommendations = query.excluded_recommendations
    ? (query.excluded_recommendations as string)
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => !isNaN(id))
    : [];

  if (!excludedTmdbId || !excludedType) {
    throw createError({
      statusCode: 400,
      message: 'excluded_tmdb_id and excluded_type are required',
    });
  }

  // Use centralized function to get userId
  const userId = await getUserIdFromEvent(event);

  if (!userId) {
    devError('[Replacement] Unauthorized - no user found');
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;

  const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    // Get user preferences for providers and genres
    const { data: userPreferences } = await supabase
      .from(TABLES.USER_PREFERENCES)
      .select(
        `${USER_PREFERENCES_COLUMNS.INCLUDED_PROVIDERS}, ${USER_PREFERENCES_COLUMNS.FAVORITE_GENRES}`
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

    // Get excluded titles (seen + not_interested + watchlist + the one being replaced)
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
    }

    const excludedTmdbIds = new Set<number>();
    excludedTmdbIds.add(excludedTmdbId); // Add the one being replaced
    if (excludedStatuses) {
      excludedStatuses.forEach((status) => {
        excludedTmdbIds.add(status.tmdb_id);
      });
    }
    // Add titles already in current recommendations to avoid duplicates
    excludedRecommendations.forEach((id) => {
      excludedTmdbIds.add(id);
    });

    // Get watchlist titles to mark them in recommendations
    const { data: watchlistStatuses } = await supabase
      .from(TABLES.USER_TITLE_STATUS)
      .select(USER_TITLE_STATUS_COLUMNS.TMDB_ID)
      .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
      .eq(USER_TITLE_STATUS_COLUMNS.STATUS, TITLE_STATUS.WATCHLIST);

    const watchlistTmdbIds = new Set<number>();
    if (watchlistStatuses) {
      watchlistStatuses.forEach((status) => {
        watchlistTmdbIds.add(status.tmdb_id);
      });
    }

    // Fetch recommendations from pool
    // IMPORTANT: We read base_score and preference_score, but order by score (base + preference) as initial ranking
    // Final ordering will be done by final_score calculated in runtime
    const { data: poolEntries, error: poolError } = await supabase
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
      .order(RECOMMENDATION_POOL_COLUMNS.SCORE, { ascending: false })
      .order(RECOMMENDATION_POOL_COLUMNS.CREATED_AT, { ascending: false })
      .limit(100); // Get more to filter

    if (poolError) {
      safeError('[Replacement] Error fetching from pool', poolError);
      return null;
    }

    if (!poolEntries || poolEntries.length === 0) {
      return null;
    }

    // Filter out excluded titles
    let filteredEntries = poolEntries.filter(
      (entry) => !excludedTmdbIds.has(entry.tmdb_id)
    );

    // Get user preferences for language and region
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
      '[Replacement]'
    );

    // Helper to fetch title data from titles table (or TMDB if missing)
    // IMPORTANT: title_data has been removed from recommendation_pool, all data comes from titles table
    const getTitleDataForEntry = async (entry: (typeof filteredEntries)[0]) => {
      return getTitleData(
        entry,
        language,
        region,
        supabase,
        tmdbConfig,
        '[Replacement]'
      );
    };

    // Process entries with title data from titles table and calculate final_score
    // IMPORTANT: Use ranking existing (score = base_score + preference_score) as base
    // Calculate final_score with recency_weight (NO animation_bias in replacement)
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

        // Calculate final_score with formula:
        // final_score = (base_score * 0.4 + preference_score * 0.4 + recency_weight * 0.2)
        // Note: NO animation_bias in replacement (already applied in central scoring)
        const recencyComponent = recencyWeight * 50; // Scale to 0-50 range
        const finalScore =
          baseScore * 0.4 + preferenceScore * 0.4 + recencyComponent * 0.2;

        // Apply mood/attention as runtime multiplicative adjustment
        // IMPORTANT: This is runtime only, does NOT persist to DB
        const { attentionFactor, moodFactor } = calculateBoostFactors(
          genreIds,
          voteAverage,
          null, // runtime not available
          null, // episodeCount not available
          entry.type as 'movie' | 'tv',
          mood,
          attention
        );

        // Combine factors with explicit weights
        const combinedFactor =
          attentionFactor * BOOST_WEIGHTS.ATTENTION +
          moodFactor * BOOST_WEIGHTS.MOOD;

        // Apply mood/attention as runtime multiplicative adjustment
        const adjustedFinalScore =
          finalScore * Math.max(1 + combinedFactor, PROTECTION_FACTOR);

        return {
          ...entry,
          titleData,
          finalScore: adjustedFinalScore,
          baseScore,
          preferenceScore,
          genreIds,
          voteAverage,
          recencyWeight,
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
      }
    >;

    // Sort by final_score (NOT by score)
    // IMPORTANT: score is base_score + preference_score (persisted)
    // final_score includes recency_weight and mood/attention adjustments (runtime)
    validEntries.sort((a, b) => {
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
      if (b.baseScore !== a.baseScore) {
        return b.baseScore - a.baseScore;
      }
      const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bCreated - aCreated;
    });

    // Determine replacement strategy
    const hasFilters = mood !== undefined || attention !== undefined;
    let replacementEntry = null;

    if (!hasFilters) {
      // No filters: replace with same type to maintain 50/50 balance
      replacementEntry = validEntries.find(
        (entry) => entry.type === excludedType
      );
    } else {
      // Has filters: get next most relevant (any type)
      replacementEntry = validEntries[0];
    }

    if (!replacementEntry) {
      return null;
    }

    // Fetch providers
    let providers: Provider[] = [];
    try {
      const providerPath =
        replacementEntry.type === MEDIA_TYPE.MOVIE
          ? `/movie/${replacementEntry.tmdb_id}/watch/providers`
          : `/tv/${replacementEntry.tmdb_id}/watch/providers`;
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

      const regionProviders =
        providerResponse.results?.[region] || providerResponse.results?.ES;
      if (regionProviders) {
        // IMPORTANT: Only use flatrate providers (streaming services)
        providers = (regionProviders.flatrate || []).slice(0, 5);
      }
    } catch {
      // Don't fail if providers can't be fetched
    }

    // Get translated explanation using server-side translation utility
    const { getExplanationTranslation } =
      await import('@/server/utils/translations');
    const explanation = getExplanationTranslation(
      event,
      replacementEntry.explanation_code || null
    );

    const replacement: Recommendation = {
      id: `pool-${replacementEntry.tmdb_id}`,
      tmdb_id: replacementEntry.tmdb_id,
      title: replacementEntry.titleData.title || '',
      type: replacementEntry.type as
        | typeof MEDIA_TYPE.MOVIE
        | typeof MEDIA_TYPE.TV,
      poster_path: replacementEntry.titleData.poster_path,
      overview: replacementEntry.titleData.overview || null,
      vote_average: replacementEntry.titleData.vote_average,
      genres:
        replacementEntry.genreIds.length > 0 ? replacementEntry.genreIds : null,
      release_date: replacementEntry.titleData.release_date,
      first_air_date: replacementEntry.titleData.first_air_date,
      explanation,
      explanation_code: replacementEntry.explanation_code || null,
      providers,
      in_watchlist: watchlistTmdbIds.has(replacementEntry.tmdb_id),
    };

    return replacement;
  } catch (error: unknown) {
    safeError('Error fetching replacement recommendation', error);
    return null;
  }
});
