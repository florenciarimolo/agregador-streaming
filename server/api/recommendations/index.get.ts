import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { devLog, devError, devWarn, safeError } from '../../utils/logger';
import { Recommendation, Provider } from '@/types/Recommendation';
import { TitleStatus } from '@/types/TitleStatus';
import {
  MoodEnum,
  type MoodEnum as MoodEnumType,
} from '@/types/enums/MoodEnum';
import {
  AttentionEnum,
  type AttentionEnum as AttentionEnumType,
} from '@/types/enums/AttentionEnum';
import { getTMDBConfig } from '../../utils/config';
import { getUserTMDBParams } from '../../utils/user-preferences';
import {
  RECOMMENDATION_POOL_FIELDS,
  RECOMMENDATION_POOL_TABLES,
  type TitleData,
} from '@/composables/database/recommendationPool';
import { updateLastShownAt } from '@/composables/database/recommendationPool';
import {
  TABLES,
  TITLES_FIELDS,
  USER_TITLE_STATUS_FIELDS,
  USER_PREFERENCES_FIELDS,
} from '@/composables/database/constants';
import type { MultiLanguageText } from '@/composables/database/titles';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import { TmdbGenreId } from '@/types/enums/TmdbGenreId';
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
 * Maximum number of recommendations to return
 */
const MAX_RECOMMENDATIONS = 20;

/**
 * Calculate mood and attention boost factors for a recommendation
 * Returns multiplicative factors (e.g., 0.1 = +10%, -0.15 = -15%)
 * Priority: Attention > Mood (weighted combination)
 * Uses constants from @/constants/recommendations for all boost values
 *
 * @returns { attentionFactor: number, moodFactor: number }
 */
function calculateBoostFactors(
  genreIds: number[],
  voteAverage: number | null,
  runtime: number | null, // For movies
  episodeCount: number | null, // For TV shows
  type: 'movie' | 'tv',
  mood?: MoodEnumType,
  attention?: AttentionEnumType
): { attentionFactor: number; moodFactor: number } {
  let attentionFactor = 0;
  let moodFactor = 0;

  // Attention boost factors (priority)
  if (attention === AttentionEnum.LOW) {
    // Short runtime/single episode boosts
    if (
      type === MediaTypeEnum.movie &&
      runtime &&
      runtime < DURATION_THRESHOLDS.SHORT_MOVIE_MINUTES
    ) {
      attentionFactor += ATTENTION_BOOSTS.LOW.SHORT_RUNTIME;
    } else if (
      type === MediaTypeEnum.tv &&
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
  } else if (attention === AttentionEnum.HIGH) {
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
  } else if (attention === AttentionEnum.MEDIUM) {
    // Family genres boost
    if (
      genreIds.includes(TmdbGenreId.FAMILY) ||
      genreIds.includes(TmdbGenreId.COMEDY)
    ) {
      attentionFactor += ATTENTION_BOOSTS.MEDIUM.FAMILY_GENRES;
    }
  }

  // Mood boost factors (applied after attention)
  if (mood === MoodEnum.RELAX) {
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
  } else if (mood === MoodEnum.LIGERO) {
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
  } else if (mood === MoodEnum.INTENSO) {
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
  } else if (mood === MoodEnum.EMOCIONAL) {
    // Drama, romance boost
    if (
      genreIds.includes(TmdbGenreId.DRAMA) ||
      genreIds.includes(TmdbGenreId.ROMANCE)
    ) {
      moodFactor += MOOD_BOOSTS.EMOCIONAL.DRAMA_ROMANCE;
    }
    // Human stories boost
    if (genreIds.includes(GENRE_IDS.DRAMA)) {
      moodFactor += MOOD_BOOSTS.EMOCIONAL.HUMAN_STORIES;
    }
    // Empty action penalty (attenuated)
    if (
      genreIds.includes(GENRE_IDS.ACTION) &&
      (!voteAverage || voteAverage < RATING_THRESHOLDS.EMPTY_ACTION)
    ) {
      moodFactor +=
        MOOD_BOOSTS.EMOCIONAL.EMPTY_ACTION_PENALTY * ATTENUATION.FACTOR;
    }
  } else if (mood === MoodEnum.REFLEXIVO) {
    // Sci-Fi, mystery boost
    if (
      genreIds.includes(GENRE_IDS.SCI_FI) ||
      genreIds.includes(GENRE_IDS.MYSTERY)
    ) {
      moodFactor += MOOD_BOOSTS.REFLEXIVO.SCI_FI_MYSTERY;
    }
    // Documentary boost
    if (genreIds.includes(TmdbGenreId.DOCUMENTARY)) {
      moodFactor += MOOD_BOOSTS.REFLEXIVO.DOCUMENTARY;
    }
    // Simple comedy penalty (attenuated)
    if (
      genreIds.includes(GENRE_IDS.COMEDY) &&
      (!voteAverage || voteAverage < RATING_THRESHOLDS.SIMPLE_COMEDY)
    ) {
      moodFactor +=
        MOOD_BOOSTS.REFLEXIVO.SIMPLE_COMEDY_PENALTY * ATTENUATION.FACTOR;
    }
  }

  return { attentionFactor, moodFactor };
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
  let user = null;
  let userId: string | null = null;

  // Get query params for mood, attention, and content type
  const query = getQuery(event);
  const mood = query.mood as MoodEnumType | undefined;
  const attention = query.attention as AttentionEnumType | undefined;
  const contentType = query.type as 'movie' | 'tv' | undefined; // Filter by content type on server

  // Try to get user from cookies first (default Supabase behavior)
  const userFromCookies = await serverSupabaseUser(event);

  if (userFromCookies) {
    userId =
      userFromCookies.id || (userFromCookies as { sub?: string }).sub || null;

    if (userId) {
      user = { id: userId, sub: userId };
      devLog('[Recommendations] User from cookies');
    }
  } else {
    // If no user from cookies, try to get from Authorization header
    const authHeader = event.node.req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(
              parts[1].replace(/-/g, '+').replace(/_/g, '/'),
              'base64'
            ).toString()
          );

          userId = payload.sub;

          if (userId) {
            user = { id: userId, sub: userId };
            devLog('[Recommendations] User from Authorization header');
          }
        }
      } catch (err) {
        safeError('[Recommendations] Error decoding token', err);
      }
    } else {
      devWarn(
        '[Recommendations] No user from cookies and no Authorization header'
      );
    }
  }

  if (!user || !userId) {
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
    // Get user preferences for providers
    const { data: userPreferences } = await supabase
      .from(TABLES.USER_PREFERENCES)
      .select(USER_PREFERENCES_FIELDS.INCLUDED_PROVIDERS)
      .eq(USER_PREFERENCES_FIELDS.USER_ID, userId)
      .maybeSingle();

    const includedProviders =
      (userPreferences?.[USER_PREFERENCES_FIELDS.INCLUDED_PROVIDERS] as
        | number[]
        | null) || [];

    // Get excluded titles (seen + not_interested + watchlist)
    // Watchlist titles should NOT appear in recommendations
    const { data: excludedStatuses, error: statusError } = await supabase
      .from(TABLES.USER_TITLE_STATUS)
      .select(USER_TITLE_STATUS_FIELDS.TMDB_ID)
      .eq(USER_TITLE_STATUS_FIELDS.USER_ID, userId)
      .in(USER_TITLE_STATUS_FIELDS.STATUS, [
        TitleStatus.SEEN,
        TitleStatus.NOT_INTERESTED,
        TitleStatus.WATCHLIST,
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

    // Fetch all recommendations from pool (no source filtering)
    const fetchRecommendations = async (): Promise<Recommendation[]> => {
      // Build query to get pool entries (title_data removed, will fetch from titles table)
      const query = supabase
        .from(RECOMMENDATION_POOL_TABLES.RECOMMENDATION_POOL)
        .select(
          `
          ${RECOMMENDATION_POOL_FIELDS.TMDB_ID},
          ${RECOMMENDATION_POOL_FIELDS.TYPE},
          ${RECOMMENDATION_POOL_FIELDS.SOURCE},
          ${RECOMMENDATION_POOL_FIELDS.SCORE},
          ${RECOMMENDATION_POOL_FIELDS.EXPLANATION_CODE},
          ${RECOMMENDATION_POOL_FIELDS.CREATED_AT}
        `
        )
        .eq(RECOMMENDATION_POOL_FIELDS.USER_ID, userId);

      // Order by score (with mood/attention boost applied in application layer)
      // Get more results to filter and apply boosts
      const { data: poolEntries, error: poolError } = await query
        .order(RECOMMENDATION_POOL_FIELDS.SCORE, { ascending: false })
        .order(RECOMMENDATION_POOL_FIELDS.CREATED_AT, { ascending: false })
        .limit(MAX_RECOMMENDATIONS * 3); // Get more to filter excluded titles and apply boosts

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

      // Helper to fetch watch providers for a title
      const fetchWatchProviders = async (
        tmdbId: number,
        type: 'movie' | 'tv'
      ): Promise<number[]> => {
        try {
          const endpoint =
            type === MediaTypeEnum.movie
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
            response.results[regionLower] ||
            response.results[regionUpper] ||
            {};
          const providers: number[] = [];

          // Combine all provider types
          if (regionData.flatrate) {
            providers.push(...regionData.flatrate.map((p) => p.provider_id));
          }
          if (regionData.buy) {
            providers.push(...regionData.buy.map((p) => p.provider_id));
          }
          if (regionData.rent) {
            providers.push(...regionData.rent.map((p) => p.provider_id));
          }

          return providers;
        } catch (error) {
          safeError(
            `[Recommendations] Error fetching providers for ${tmdbId}`,
            error
          );
          return [];
        }
      };

      // Filter by providers if user has preferences
      if (includedProviders.length > 0) {
        const entriesWithProviders = await Promise.all(
          filteredEntries.map(async (entry) => {
            const titleProviders = await fetchWatchProviders(
              entry.tmdb_id,
              entry.type as 'movie' | 'tv'
            );

            // Exclude titles that don't have any providers
            if (titleProviders.length === 0) {
              return null;
            }

            // Check if any of the title's providers match user's included providers
            const hasMatchingProvider = titleProviders.some((providerId) =>
              includedProviders.includes(providerId)
            );

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
          .eq(TITLES_FIELDS.TMDB_ID, entry.tmdb_id)
          .eq(TITLES_FIELDS.TYPE, entry.type)
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

        if (import.meta.dev) {
          const availableLanguages = titleJsonb ? Object.keys(titleJsonb) : [];
          devLog(
            `[Recommendations] For ${entry.tmdb_id}: requested language=${language}, available=${availableLanguages.join(', ')}, hasExactLanguage=${hasExactLanguage}`
          );
        }

        // Extract text in user's language from titles table (may return fallback if language missing)
        const { getTitleInLanguage } =
          await import('@/composables/database/titles');
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
            entry.type === MediaTypeEnum.movie
              ? `/movie/${entry.tmdb_id}`
              : `/tv/${entry.tmdb_id}`;
          const tmdbResponse = await $fetch<{
            title?: string;
            name?: string;
            overview?: string;
            poster_path?: string | null;
            backdrop_path?: string | null;
            vote_average?: number | null;
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
                `${TITLES_FIELDS.TITLE}, ${TITLES_FIELDS.OVERVIEW}, ${TITLES_FIELDS.POSTER_PATH}, ${TITLES_FIELDS.GENRES}, ${TITLES_FIELDS.BACKDROP_PATH}, ${TITLES_FIELDS.VOTE_AVERAGE}, ${TITLES_FIELDS.RELEASE_DATE}, ${TITLES_FIELDS.FIRST_AIR_DATE}`
              )
              .eq(TITLES_FIELDS.TMDB_ID, entry.tmdb_id)
              .eq(TITLES_FIELDS.TYPE, entry.type)
              .maybeSingle();

            // Merge with existing data to preserve all language keys
            const finalTitleJsonb: MultiLanguageText = existingTitle?.title
              ? {
                  ...(existingTitle.title as MultiLanguageText),
                  ...mergedTitleJsonb,
                }
              : mergedTitleJsonb;
            const finalOverviewJsonb: MultiLanguageText =
              existingTitle?.overview
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
                `[Recommendations] Updating titles for ${entry.tmdb_id}: adding language ${language}, final languages=${Object.keys(finalTitleJsonb).join(', ')}`
              );
            }

            const { error: upsertError } = await supabase
              .from(TABLES.TITLES)
              .upsert(
                {
                  [TITLES_FIELDS.TMDB_ID]: entry.tmdb_id,
                  [TITLES_FIELDS.TYPE]: entry.type,
                  [TITLES_FIELDS.TITLE]: finalTitleJsonb,
                  [TITLES_FIELDS.OVERVIEW]:
                    Object.keys(finalOverviewJsonb).length > 0
                      ? finalOverviewJsonb
                      : null,
                  [TITLES_FIELDS.POSTER_PATH]:
                    Object.keys(finalPosterPathJsonb).length > 0
                      ? finalPosterPathJsonb
                      : null,
                  [TITLES_FIELDS.GENRES]:
                    (tmdbResponse.genres || []).length > 0
                      ? tmdbResponse.genres
                      : existingTitle?.genres || null,
                  [TITLES_FIELDS.BACKDROP_PATH]:
                    tmdbResponse.backdrop_path ||
                    existingTitle?.backdrop_path ||
                    null,
                  [TITLES_FIELDS.VOTE_AVERAGE]:
                    tmdbResponse.vote_average ??
                    existingTitle?.vote_average ??
                    null,
                  [TITLES_FIELDS.RELEASE_DATE]:
                    tmdbResponse.release_date ||
                    existingTitle?.release_date ||
                    null,
                  [TITLES_FIELDS.FIRST_AIR_DATE]:
                    tmdbResponse.first_air_date ||
                    existingTitle?.first_air_date ||
                    null,
                },
                {
                  onConflict: TITLES_FIELDS.TMDB_ID,
                }
              );

            if (upsertError) {
              if (import.meta.dev) {
                console.error(
                  '[Recommendations] Error updating titles cache:',
                  upsertError
                );
              }
            } else if (import.meta.dev) {
              devLog(
                `[Recommendations] Successfully updated titles for ${entry.tmdb_id} with language ${language}`
              );
            }
          } catch (error: unknown) {
            if (import.meta.dev) {
              console.error(
                '[Recommendations] Error updating titles cache:',
                error
              );
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
            `[Recommendations] Error fetching title data for ${entry.tmdb_id}`,
            error
          );
          return null;
        }
      };

      // Combine pool entries with title data from titles table and calculate final scores
      const entriesWithTitles = await Promise.all(
        filteredEntries.map(async (entry) => {
          const titleData = await getTitleData(entry);
          if (!titleData) return null;

          const genreIds = titleData.genres.map((g) => g.id);
          const voteAverage = titleData.vote_average;

          // Calculate boost factors using multiplicative logic
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

          // Combine factors with explicit weights
          const combinedFactor =
            attentionFactor * BOOST_WEIGHTS.ATTENTION +
            moodFactor * BOOST_WEIGHTS.MOOD;

          // Calculate final score using multiplicative formula
          // Apply protection: never reduce below PROTECTION_FACTOR of base score
          const baseScore = entry.score || 0;
          const finalScore =
            baseScore * Math.max(1 + combinedFactor, PROTECTION_FACTOR);

          return {
            ...entry,
            titleData,
            finalScore,
            baseScore,
            genreIds,
            voteAverage,
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
          genreIds: number[];
          voteAverage: number | null;
        }
      >;

      // Sort by final score (base + boosts), then by base score, then by created_at
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
          (entry) => entry.type === MediaTypeEnum.movie
        );
        const tvShows = validEntries.filter(
          (entry) => entry.type === MediaTypeEnum.tv
        );

        // Take exactly 10 of each type (or available amount if less)
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

        balancedEntries = balanced;
      }

      // Transform sorted pool entries to recommendations
      const recommendations: Recommendation[] = [];
      const tmdbIdsToTrack: number[] = [];

      for (const entry of balancedEntries.slice(0, MAX_RECOMMENDATIONS)) {
        const titleData = entry.titleData;

        // Fetch providers from TMDB (still need this for display)
        let providers: Provider[] = [];
        try {
          const providerPath =
            entry.type === MediaTypeEnum.movie
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
          const regionProviders =
            providerResponse.results?.[region] || providerResponse.results?.ES;
          if (regionProviders) {
            const streamingProviders = regionProviders.flatrate || [];
            const buyProviders = regionProviders.buy || [];
            const rentProviders = regionProviders.rent || [];
            providers = [
              ...streamingProviders,
              ...buyProviders,
              ...rentProviders,
            ].slice(0, 5);
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

        // Map explanation_code to explanation text
        const explanationMap: Record<string, string> = {
          BASED_ON_LIKE: 'Porque te gustó',
          TRENDING: 'Tendencia esta semana',
          DISCOVER: 'Descubierto para ti',
          EASY_TO_WATCH: 'Fácil de ver, perfecto para relajarse',
          MOOD_MATCH: 'Perfecto para tu estado de ánimo',
        };

        const explanation =
          explanationMap[entry.explanation_code || ''] || 'Recomendado para ti';

        recommendations.push({
          id: `pool-${entry.tmdb_id}`,
          tmdb_id: entry.tmdb_id,
          title: titleData.title || '',
          type: entry.type as
            | typeof MediaTypeEnum.movie
            | typeof MediaTypeEnum.tv,
          poster_path: titleData.poster_path,
          overview: titleData.overview || null,
          vote_average: titleData.vote_average,
          genres: entry.genreIds.length > 0 ? entry.genreIds : null,
          release_date: titleData.release_date,
          first_air_date: titleData.first_air_date,
          explanation,
          explanation_code: entry.explanation_code || null,
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
