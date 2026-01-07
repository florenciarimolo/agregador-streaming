import { createClient } from '@supabase/supabase-js';
import { devLog, devError, safeError } from '@/server/utils/logger';
import { Recommendation, Provider } from '@/types/Recommendation';
import { TITLE_STATUS } from '@/constants/domain/titleStatus';
import { QUERY_PARAMS } from '@/constants/api/queryParams';
import { getUserIdFromEvent } from '@/server/utils/user-auth';
import {
  MOOD,
  type Mood,
} from '@/constants/domain/mood';
import {
  ATTENTION,
  type Attention,
} from '@/constants/domain/attention';
import { getTMDBConfig } from '@/server/utils/config';
import { getUserTMDBParams } from '@/server/utils/user-tmdb';
import { type TitleData } from '@/services/recommendationPool';
import { TABLES } from '@/constants/db/tables';
import { RECOMMENDATION_POOL_COLUMNS } from '@/constants/db/columns';
import {
  USER_PREFERENCES_COLUMNS,
  TITLES_COLUMNS,
  USER_TITLE_STATUS_COLUMNS,
} from '@/constants/db/columns';
import type { MultiLanguageText } from '@/services/titles';
import { getTitleInLanguage } from '@/services/titles';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { TmdbGenreId } from '@/types/enums/TmdbGenreId';
import { WatchProviderType } from '@/types/enums/WatchProviderType';
import {
  BOOST_WEIGHTS,
  PROTECTION_FACTOR,
  ATTENTION_BOOSTS,
  MOOD_BOOSTS,
  ATTENUATION,
  RATING_THRESHOLDS,
  DURATION_THRESHOLDS,
} from '@/constants/recommendations';

/**
 * Calculate mood and attention boost factors for a recommendation
 * Returns multiplicative factors (e.g., 0.1 = +10%, -0.15 = -15%)
 * Priority: Attention > Mood (weighted combination)
 * Uses constants from '@/constants/recommendations for all boost values
 *
 * @returns { attentionFactor: number, moodFactor: number }
 */
function calculateBoostFactors(
  genreIds: number[],
  voteAverage: number | null,
  runtime: number | null,
  episodeCount: number | null,
  type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV,
  mood?: Mood,
  attention?: Attention
): { attentionFactor: number; moodFactor: number } {
  let attentionFactor = 0;
  let moodFactor = 0;

  // Attention boost factors (priority)
  if (attention === ATTENTION.LOW) {
    // Short runtime/single episode boosts
    if (
      type === MEDIA_TYPE.MOVIE &&
      runtime &&
      runtime < DURATION_THRESHOLDS.SHORT_MOVIE_MINUTES
    ) {
      attentionFactor += ATTENTION_BOOSTS.LOW.SHORT_RUNTIME;
    } else if (
      type === MEDIA_TYPE.TV &&
      episodeCount &&
      episodeCount <= DURATION_THRESHOLDS.SINGLE_EPISODE
    ) {
      attentionFactor += ATTENTION_BOOSTS.LOW.SINGLE_EPISODE;
    }
    // Penalize complex genres (attenuated if baseScore is lower)
    if (
      genreIds.includes(TmdbGenreId.THRILLER) ||
      genreIds.includes(TmdbGenreId.MYSTERY) ||
      genreIds.includes(TmdbGenreId.SCI_FI)
    ) {
      // Attenuate penalty for lower-rated titles (they're already filtered by 6.5 minimum)
      const attenuationFactor =
        voteAverage && voteAverage < ATTENUATION.THRESHOLD
          ? ATTENUATION.FACTOR
          : 1.0;
      attentionFactor +=
        ATTENTION_BOOSTS.LOW.COMPLEX_GENRES_PENALTY * attenuationFactor;
    }
  } else if (attention === ATTENTION.HIGH) {
    // Complex genres boost
    if (
      genreIds.includes(TmdbGenreId.DRAMA) ||
      genreIds.includes(TmdbGenreId.THRILLER) ||
      genreIds.includes(TmdbGenreId.SCI_FI)
    ) {
      // Attenuate boost for lower-rated titles
      const attenuationFactor =
        voteAverage && voteAverage < ATTENUATION.THRESHOLD
          ? ATTENUATION.FACTOR
          : 1.0;
      attentionFactor +=
        ATTENTION_BOOSTS.HIGH.COMPLEX_GENRES * attenuationFactor;
    }
    // Boost complex narratives
    if (
      genreIds.includes(TmdbGenreId.MYSTERY) ||
      genreIds.includes(TmdbGenreId.THRILLER)
    ) {
      attentionFactor += ATTENTION_BOOSTS.HIGH.COMPLEX_NARRATIVES;
    }
    // Penalize trivial content (attenuated)
    if (
      genreIds.includes(TmdbGenreId.COMEDY) ||
      genreIds.includes(TmdbGenreId.ANIMATION)
    ) {
      const attenuationFactor =
        voteAverage && voteAverage < ATTENUATION.THRESHOLD
          ? ATTENUATION.FACTOR
          : 1.0;
      attentionFactor +=
        ATTENTION_BOOSTS.HIGH.TRIVIAL_CONTENT_PENALTY * attenuationFactor;
    }
  } else if (attention === ATTENTION.MEDIUM) {
    // Family genres boost
    if (
      genreIds.includes(TmdbGenreId.FAMILY) ||
      genreIds.includes(TmdbGenreId.COMEDY)
    ) {
      attentionFactor += ATTENTION_BOOSTS.MEDIUM.FAMILY_GENRES;
    }
  }

  // Mood boost factors (applied after attention)
  if (mood === MOOD.RELAX) {
    // Comedy, animation, family boosts
    if (
      genreIds.includes(TmdbGenreId.COMEDY) ||
      genreIds.includes(TmdbGenreId.ANIMATION)
    ) {
      moodFactor += MOOD_BOOSTS.RELAX.COMEDY_ANIMATION;
    }
    if (genreIds.includes(TmdbGenreId.FAMILY)) {
      moodFactor += MOOD_BOOSTS.RELAX.FAMILY;
    }
    // Thriller/horror penalty (attenuated)
    if (
      genreIds.includes(TmdbGenreId.THRILLER) ||
      genreIds.includes(TmdbGenreId.HORROR)
    ) {
      const attenuationFactor =
        voteAverage && voteAverage < ATTENUATION.THRESHOLD
          ? ATTENUATION.FACTOR
          : 1.0;
      moodFactor +=
        MOOD_BOOSTS.RELAX.THRILLER_HORROR_PENALTY * attenuationFactor;
    }
    // Dense drama penalty (attenuated)
    if (
      genreIds.includes(TmdbGenreId.DRAMA) &&
      voteAverage &&
      voteAverage < RATING_THRESHOLDS.DENSE_DRAMA
    ) {
      moodFactor += MOOD_BOOSTS.RELAX.DENSE_DRAMA_PENALTY * ATTENUATION.FACTOR;
    }
  } else if (mood === MOOD.LIGERO) {
    // Comedy boost
    if (genreIds.includes(TmdbGenreId.COMEDY)) {
      moodFactor += MOOD_BOOSTS.LIGERO.COMEDY;
    }
    // Adventure, family boost
    if (
      genreIds.includes(TmdbGenreId.ADVENTURE) ||
      genreIds.includes(TmdbGenreId.FAMILY)
    ) {
      moodFactor += MOOD_BOOSTS.LIGERO.ADVENTURE_FAMILY;
    }
    // Heavy drama penalty (attenuated)
    if (
      genreIds.includes(TmdbGenreId.DRAMA) &&
      voteAverage &&
      voteAverage < RATING_THRESHOLDS.HEAVY_DRAMA
    ) {
      moodFactor += MOOD_BOOSTS.LIGERO.HEAVY_DRAMA_PENALTY * ATTENUATION.FACTOR;
    }
  } else if (mood === MOOD.INTENSO) {
    // Thriller, action, crime boost
    if (
      genreIds.includes(TmdbGenreId.THRILLER) ||
      genreIds.includes(TmdbGenreId.ACTION) ||
      genreIds.includes(TmdbGenreId.CRIME)
    ) {
      moodFactor += MOOD_BOOSTS.INTENSO.THRILLER_ACTION_CRIME;
    }
    // High rating boost
    if (voteAverage && voteAverage >= RATING_THRESHOLDS.HIGH_RATING) {
      moodFactor += MOOD_BOOSTS.INTENSO.HIGH_RATING;
    }
    // Child animation penalty (attenuated)
    if (
      genreIds.includes(TmdbGenreId.ANIMATION) &&
      voteAverage &&
      voteAverage < RATING_THRESHOLDS.CHILD_ANIMATION
    ) {
      moodFactor +=
        MOOD_BOOSTS.INTENSO.CHILD_ANIMATION_PENALTY * ATTENUATION.FACTOR;
    }
  } else if (mood === MOOD.EMOCIONAL) {
    // Drama, romance boost
    if (
      genreIds.includes(TmdbGenreId.DRAMA) ||
      genreIds.includes(TmdbGenreId.ROMANCE)
    ) {
      moodFactor += MOOD_BOOSTS.EMOCIONAL.DRAMA_ROMANCE;
    }
    // Human stories boost
    if (genreIds.includes(TmdbGenreId.DRAMA)) {
      moodFactor += MOOD_BOOSTS.EMOCIONAL.HUMAN_STORIES;
    }
    // Empty action penalty (attenuated)
    if (
      genreIds.includes(TmdbGenreId.ACTION) &&
      (!voteAverage || voteAverage < RATING_THRESHOLDS.EMPTY_ACTION)
    ) {
      moodFactor +=
        MOOD_BOOSTS.EMOCIONAL.EMPTY_ACTION_PENALTY * ATTENUATION.FACTOR;
    }
  } else if (mood === MOOD.REFLEXIVO) {
    // Sci-Fi, mystery boost
    if (
      genreIds.includes(TmdbGenreId.SCI_FI) ||
      genreIds.includes(TmdbGenreId.MYSTERY)
    ) {
      moodFactor += MOOD_BOOSTS.REFLEXIVO.SCI_FI_MYSTERY;
    }
    // Documentary boost
    if (genreIds.includes(TmdbGenreId.DOCUMENTARY)) {
      moodFactor += MOOD_BOOSTS.REFLEXIVO.DOCUMENTARY;
    }
    // Simple comedy penalty (attenuated)
    if (
      genreIds.includes(TmdbGenreId.COMEDY) &&
      (!voteAverage || voteAverage < RATING_THRESHOLDS.SIMPLE_COMEDY)
    ) {
      moodFactor +=
        MOOD_BOOSTS.REFLEXIVO.SIMPLE_COMEDY_PENALTY * ATTENUATION.FACTOR;
    }
  }

  return { attentionFactor, moodFactor };
}

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
  const attention = query[QUERY_PARAMS.ATTENTION] as
    | Attention
    | undefined;

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

    // Helper to fetch watch providers for a title
    const fetchWatchProviders = async (
      tmdbId: number,
      type: 'movie' | 'tv'
    ): Promise<number[]> => {
      try {
        const endpoint =
          type === MEDIA_TYPE.MOVIE
            ? `/movie/${tmdbId}/watch/providers`
            : `/tv/${tmdbId}/watch/providers`;
        const response = await $fetch<{
          results?: {
            [key: string]: {
              flatrate?: Array<{ provider_id: number }>;
              buy?: Array<{ provider_id: number }>;
              rent?: Array<{ provider_id: number }>;
            };
          };
        }>(`${tmdbConfig.baseUrl}${endpoint}`, {
          query: {
            api_key: tmdbConfig.apiKey,
          },
        });

        if (!response?.results) return [];

        // Get providers from the region (flatrate, buy, rent)
        const regionLower = region.toLowerCase();
        const regionUpper = region.toUpperCase();
        const regionData =
          response.results[regionLower] || response.results[regionUpper] || {};
        const providers: number[] = [];

        // Combine all provider types
        if (regionData[WatchProviderType.FLATRATE]) {
          providers.push(
            ...regionData[WatchProviderType.FLATRATE]!.map((p) => p.provider_id)
          );
        }
        if (regionData[WatchProviderType.BUY]) {
          providers.push(
            ...regionData[WatchProviderType.BUY]!.map((p) => p.provider_id)
          );
        }
        if (regionData[WatchProviderType.RENT]) {
          providers.push(
            ...regionData[WatchProviderType.RENT]!.map((p) => p.provider_id)
          );
        }

        return providers;
      } catch (error) {
        safeError(
          `[Replacement] Error fetching providers for ${tmdbId}`,
          error
        );
        return [];
      }
    };

    // Filter by providers if user has preferences (best-effort)
    // If a title doesn't have provider data, include it anyway (best-effort)
    if (includedProviders.length > 0) {
      const entriesWithProviders = await Promise.all(
        filteredEntries.map(async (entry) => {
          const titleProviders = await fetchWatchProviders(
            entry.tmdb_id,
            entry.type as 'movie' | 'tv'
          );

          // Best-effort: if no provider data, include the title anyway
          if (titleProviders.length === 0) {
            return entry; // Include if no data (best-effort)
          }

          // Check if any of the title's providers match user's included providers
          const hasMatchingProvider = titleProviders.some((providerId) =>
            includedProviders.includes(providerId)
          );

          // Only exclude if we have provider data AND none match
          if (!hasMatchingProvider) {
            return null;
          }

          return entry;
        })
      );

      // Filter out null entries (excluded titles)
      filteredEntries = entriesWithProviders.filter(
        (entry): entry is NonNullable<typeof entry> => entry !== null
      );
    }

    // Helper to fetch title data from titles table (or TMDB if missing)
    // IMPORTANT: title_data has been removed from recommendation_pool, all data comes from titles table
    const getTitleData = async (
      entry: (typeof filteredEntries)[0]
    ): Promise<TitleData | null> => {
      // First try to get from titles table
      const { data: titleFromDb, error: dbError } = await supabase
        .from(TABLES.TITLES)
        .select('*')
        .eq(TITLES_COLUMNS.TMDB_ID, entry.tmdb_id)
        .eq(TITLES_COLUMNS.TYPE, entry.type)
        .maybeSingle();

      let titleJsonb: MultiLanguageText | null = null;
      let overviewJsonb: MultiLanguageText | null = null;
      let posterPathJsonb: MultiLanguageText | null = null;
      let genresFromDb: Array<{ id: number; name: string }> | null = null;

      // If found in DB, extract from JSONB
      if (titleFromDb && !dbError) {
        titleJsonb = titleFromDb.title as MultiLanguageText;
        overviewJsonb = titleFromDb.overview as MultiLanguageText | null;
        posterPathJsonb = titleFromDb.poster_path as MultiLanguageText | null;
        genresFromDb = titleFromDb.genres as Array<{
          id: number;
          name: string;
        }> | null;
      }

      // Check if the requested language exists in the JSONB (explicit check, no fallbacks)
      // IMPORTANT: We need to check if the exact language exists, not rely on getTitleInLanguage
      // which may return fallbacks. This ensures we fetch from TMDB when the language is missing.
      const hasExactLanguage =
        titleJsonb &&
        typeof titleJsonb === 'object' &&
        titleJsonb[language] !== undefined;
      const hasExactOverviewLanguage =
        overviewJsonb &&
        typeof overviewJsonb === 'object' &&
        overviewJsonb[language] !== undefined;

      // Extract text in user's language from titles table (may return fallback if language missing)
      const extractedTitle = getTitleInLanguage(
        titleJsonb,
        language,
        region,
        false
      );
      const extractedOverview = getTitleInLanguage(
        overviewJsonb,
        language,
        region,
        false
      );
      const extractedPosterPath = getTitleInLanguage(
        posterPathJsonb,
        language,
        region,
        true
      );

      if (import.meta.dev) {
        const availableLanguages = titleJsonb ? Object.keys(titleJsonb) : [];
        devLog(
          `[Replacement] For ${entry.tmdb_id}: requested language=${language}, available=${availableLanguages.join(', ')}, hasExactLanguage=${hasExactLanguage}`
        );
      }

      // Check if we need to fetch from TMDB
      // IMPORTANT: Check if exact language exists, not just if getTitleInLanguage returns something
      // (getTitleInLanguage may return fallbacks, which we don't want)
      const needsTitleFallback =
        !hasExactLanguage || !extractedTitle || extractedTitle.trim() === '';
      const needsOverviewFallback =
        !hasExactOverviewLanguage ||
        !extractedOverview ||
        extractedOverview.trim() === '';
      const needsFullFetch =
        !titleFromDb || needsTitleFallback || needsOverviewFallback;

      // If we have everything from titles table in the exact language, use it
      // IMPORTANT: Only use if we have the exact language (no fallbacks)
      if (
        !needsFullFetch &&
        hasExactLanguage &&
        hasExactOverviewLanguage &&
        extractedTitle &&
        extractedOverview
      ) {
        return {
          title: extractedTitle,
          overview: extractedOverview,
          poster_path: extractedPosterPath || null,
          backdrop_path: titleFromDb.backdrop_path || null,
          vote_average: titleFromDb.vote_average || null,
          genres: genresFromDb || [],
          release_date: titleFromDb.release_date || null,
          first_air_date: titleFromDb.first_air_date || null,
          language: language,
        };
      }

      // Fetch from TMDB if needed (missing in titles table or missing in language)
      try {
        const endpoint =
          entry.type === MEDIA_TYPE.MOVIE
            ? `/movie/${entry.tmdb_id}`
            : `/tv/${entry.tmdb_id}`;
        const tmdbResponse = await $fetch<{
          title?: string;
          name?: string;
          overview?: string;
          poster_path?: string | null;
          backdrop_path?: string | null;
          vote_average?: number | null;
          status?: string;
          genres?: Array<{ id: number; name: string }>;
          release_date?: string | null;
          first_air_date?: string | null;
        }>(`${tmdbConfig.baseUrl}${endpoint}`, {
          query: {
            api_key: tmdbConfig.apiKey,
            language: tmdbConfig.language,
            region: tmdbConfig.region,
          },
        });

        if (!tmdbResponse) return null;

        // Merge with existing DB data for titles table update
        // IMPORTANT: Preserve all existing language keys, only add/update the current language
        const mergedTitleJsonb: MultiLanguageText = { ...(titleJsonb || {}) };
        const mergedOverviewJsonb: MultiLanguageText = {
          ...(overviewJsonb || {}),
        };
        const mergedPosterPathJsonb: MultiLanguageText = {
          ...(posterPathJsonb || {}),
        };

        // Add TMDB data in ISO format (merge, don't overwrite existing languages)
        const titleText = tmdbResponse.title || tmdbResponse.name || '';
        if (titleText) {
          mergedTitleJsonb[language] = titleText;
        }
        if (tmdbResponse.overview) {
          mergedOverviewJsonb[language] = tmdbResponse.overview;
        }
        if (tmdbResponse.poster_path) {
          mergedPosterPathJsonb[language] = tmdbResponse.poster_path;
        }

        // Update titles table with TMDB data
        // IMPORTANT: Use upsert to merge, preserving all existing language keys in JSONB
        // We do this synchronously to ensure data is saved before returning
        try {
          // First, get existing data to ensure we preserve all languages
          const { data: existingTitle } = await supabase
            .from(TABLES.TITLES)
            .select(
              `${TITLES_COLUMNS.TITLE}, ${TITLES_COLUMNS.OVERVIEW}, ${TITLES_COLUMNS.POSTER_PATH}, ${TITLES_COLUMNS.GENRES}, ${TITLES_COLUMNS.BACKDROP_PATH}, ${TITLES_COLUMNS.VOTE_AVERAGE}, ${TITLES_COLUMNS.RELEASE_DATE}, ${TITLES_COLUMNS.FIRST_AIR_DATE}`
            )
            .eq(TITLES_COLUMNS.TMDB_ID, entry.tmdb_id)
            .eq(TITLES_COLUMNS.TYPE, entry.type)
            .maybeSingle();

          // Merge with existing data to preserve all language keys
          const finalTitleJsonb: MultiLanguageText = existingTitle?.title
            ? {
                ...(existingTitle.title as MultiLanguageText),
                ...mergedTitleJsonb,
              }
            : mergedTitleJsonb;
          const finalOverviewJsonb: MultiLanguageText = existingTitle?.overview
            ? {
                ...(existingTitle.overview as MultiLanguageText),
                ...mergedOverviewJsonb,
              }
            : mergedOverviewJsonb;
          const finalPosterPathJsonb: MultiLanguageText =
            existingTitle?.poster_path
              ? {
                  ...(existingTitle.poster_path as MultiLanguageText),
                  ...mergedPosterPathJsonb,
                }
              : mergedPosterPathJsonb;

          if (import.meta.dev) {
            devLog(
              `[Replacement] Updating titles for ${entry.tmdb_id}: adding language ${language}, final languages=${Object.keys(finalTitleJsonb).join(', ')}`
            );
          }

          const { error: upsertError } = await supabase
            .from(TABLES.TITLES)
            .upsert(
              {
                [TITLES_COLUMNS.TMDB_ID]: entry.tmdb_id,
                [TITLES_COLUMNS.TYPE]: entry.type,
                [TITLES_COLUMNS.TITLE]: finalTitleJsonb,
                [TITLES_COLUMNS.OVERVIEW]:
                  Object.keys(finalOverviewJsonb).length > 0
                    ? finalOverviewJsonb
                    : null,
                [TITLES_COLUMNS.POSTER_PATH]:
                  Object.keys(finalPosterPathJsonb).length > 0
                    ? finalPosterPathJsonb
                    : null,
                [TITLES_COLUMNS.GENRES]:
                  (tmdbResponse.genres || []).length > 0
                    ? tmdbResponse.genres
                    : existingTitle?.genres || null,
                [TITLES_COLUMNS.BACKDROP_PATH]:
                  tmdbResponse.backdrop_path ||
                  existingTitle?.backdrop_path ||
                  null,
                [TITLES_COLUMNS.VOTE_AVERAGE]:
                  tmdbResponse.vote_average ??
                  existingTitle?.vote_average ??
                  null,
                [TITLES_COLUMNS.RELEASE_DATE]:
                  tmdbResponse.release_date ||
                  existingTitle?.release_date ||
                  null,
                [TITLES_COLUMNS.FIRST_AIR_DATE]:
                  tmdbResponse.first_air_date ||
                  existingTitle?.first_air_date ||
                  null,
                [TITLES_COLUMNS.STATUS]:
                  tmdbResponse.status ||
                  existingTitle?.status ||
                  null,
              },
              {
                onConflict: TITLES_COLUMNS.TMDB_ID,
              }
            );

          if (upsertError) {
            if (import.meta.dev) {
              console.error(
                '[Replacement] Error updating titles cache:',
                upsertError
              );
            }
          } else if (import.meta.dev) {
            devLog(
              `[Replacement] Successfully updated titles for ${entry.tmdb_id} with language ${language}`
            );
          }
        } catch (error: unknown) {
          if (import.meta.dev) {
            console.error('[Replacement] Error updating titles cache:', error);
          }
        }

        // Return title data for this request
        return {
          title: titleText,
          overview: tmdbResponse.overview || '',
          poster_path: tmdbResponse.poster_path || null,
          backdrop_path: tmdbResponse.backdrop_path || null,
          vote_average: tmdbResponse.vote_average || null,
          genres: (tmdbResponse.genres || []).map((g) => ({
            id: g.id,
            name: g.name,
          })),
          release_date: tmdbResponse.release_date || null,
          first_air_date: tmdbResponse.first_air_date || null,
          language: language,
        };
      } catch (error) {
        safeError(
          `[Replacement] Error fetching title data for ${entry.tmdb_id}`,
          error
        );
        return null;
      }
    };

    // Process entries with title data from titles table and calculate final_score
    // IMPORTANT: Use ranking existing (score = base_score + preference_score) as base
    // Calculate final_score with recency_weight (NO animation_bias in replacement)
    const entriesWithTitles = await Promise.all(
      filteredEntries.map(async (entry) => {
        const titleData = await getTitleData(entry);
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

    const explanationMap: Record<string, string> = {
      BASED_ON_LIKE: 'Porque te gustó',
      TRENDING: 'Tendencia esta semana',
      DISCOVER: 'Descubierto para ti',
      EASY_TO_WATCH: 'Fácil de ver, perfecto para relajarse',
      MOOD_MATCH: 'Perfecto para tu estado de ánimo',
    };

    const explanation =
      explanationMap[replacementEntry.explanation_code || ''] ||
      'Recomendado para ti';

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
