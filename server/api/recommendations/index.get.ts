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
  USER_TITLE_STATUS_FIELDS,
} from '@/composables/database/constants';
import type { MultiLanguageText } from '@/composables/database/titles';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
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
 * TMDB Genre IDs
 */
const GENRE_IDS = {
  ACTION: 28,
  ADVENTURE: 12,
  ANIMATION: 16,
  COMEDY: 35,
  CRIME: 80,
  DOCUMENTARY: 99,
  DRAMA: 18,
  FAMILY: 10751,
  FANTASY: 14,
  HORROR: 27,
  MYSTERY: 9648,
  ROMANCE: 10749,
  SCI_FI: 878,
  THRILLER: 53,
} as const;

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
      type === 'movie' &&
      runtime &&
      runtime < DURATION_THRESHOLDS.SHORT_MOVIE_MINUTES
    ) {
      attentionFactor += ATTENTION_BOOSTS.LOW.SHORT_RUNTIME;
    } else if (
      type === 'tv' &&
      episodeCount &&
      episodeCount <= DURATION_THRESHOLDS.SINGLE_EPISODE
    ) {
      attentionFactor += ATTENTION_BOOSTS.LOW.SINGLE_EPISODE;
    }
    // Penalize complex genres (attenuated if baseScore is lower)
    if (
      genreIds.includes(GENRE_IDS.THRILLER) ||
      genreIds.includes(GENRE_IDS.MYSTERY) ||
      genreIds.includes(GENRE_IDS.SCI_FI)
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
      genreIds.includes(GENRE_IDS.DRAMA) ||
      genreIds.includes(GENRE_IDS.THRILLER) ||
      genreIds.includes(GENRE_IDS.SCI_FI)
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
      genreIds.includes(GENRE_IDS.MYSTERY) ||
      genreIds.includes(GENRE_IDS.THRILLER)
    ) {
      attentionFactor += ATTENTION_BOOSTS.HIGH.COMPLEX_NARRATIVES;
    }
    // Penalize trivial content (attenuated)
    if (
      genreIds.includes(GENRE_IDS.COMEDY) ||
      genreIds.includes(GENRE_IDS.ANIMATION)
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
      genreIds.includes(GENRE_IDS.FAMILY) ||
      genreIds.includes(GENRE_IDS.COMEDY)
    ) {
      attentionFactor += ATTENTION_BOOSTS.MEDIUM.FAMILY_GENRES;
    }
  }

  // Mood boost factors (applied after attention)
  if (mood === MoodEnum.RELAX) {
    // Comedy, animation, family boosts
    if (
      genreIds.includes(GENRE_IDS.COMEDY) ||
      genreIds.includes(GENRE_IDS.ANIMATION)
    ) {
      moodFactor += MOOD_BOOSTS.RELAX.COMEDY_ANIMATION;
    }
    if (genreIds.includes(GENRE_IDS.FAMILY)) {
      moodFactor += MOOD_BOOSTS.RELAX.FAMILY;
    }
    // Thriller/horror penalty (attenuated)
    if (
      genreIds.includes(GENRE_IDS.THRILLER) ||
      genreIds.includes(GENRE_IDS.HORROR)
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
      genreIds.includes(GENRE_IDS.DRAMA) &&
      voteAverage &&
      voteAverage < RATING_THRESHOLDS.DENSE_DRAMA
    ) {
      moodFactor += MOOD_BOOSTS.RELAX.DENSE_DRAMA_PENALTY * ATTENUATION.FACTOR;
    }
  } else if (mood === MoodEnum.LIGERO) {
    // Comedy boost
    if (genreIds.includes(GENRE_IDS.COMEDY)) {
      moodFactor += MOOD_BOOSTS.LIGERO.COMEDY;
    }
    // Adventure, family boost
    if (
      genreIds.includes(GENRE_IDS.ADVENTURE) ||
      genreIds.includes(GENRE_IDS.FAMILY)
    ) {
      moodFactor += MOOD_BOOSTS.LIGERO.ADVENTURE_FAMILY;
    }
    // Heavy drama penalty (attenuated)
    if (
      genreIds.includes(GENRE_IDS.DRAMA) &&
      voteAverage &&
      voteAverage < RATING_THRESHOLDS.HEAVY_DRAMA
    ) {
      moodFactor += MOOD_BOOSTS.LIGERO.HEAVY_DRAMA_PENALTY * ATTENUATION.FACTOR;
    }
  } else if (mood === MoodEnum.INTENSO) {
    // Thriller, action, crime boost
    if (
      genreIds.includes(GENRE_IDS.THRILLER) ||
      genreIds.includes(GENRE_IDS.ACTION) ||
      genreIds.includes(GENRE_IDS.CRIME)
    ) {
      moodFactor += MOOD_BOOSTS.INTENSO.THRILLER_ACTION_CRIME;
    }
    // High rating boost
    if (voteAverage && voteAverage >= RATING_THRESHOLDS.HIGH_RATING) {
      moodFactor += MOOD_BOOSTS.INTENSO.HIGH_RATING;
    }
    // Child animation penalty (attenuated)
    if (
      genreIds.includes(GENRE_IDS.ANIMATION) &&
      voteAverage &&
      voteAverage < RATING_THRESHOLDS.CHILD_ANIMATION
    ) {
      moodFactor +=
        MOOD_BOOSTS.INTENSO.CHILD_ANIMATION_PENALTY * ATTENUATION.FACTOR;
    }
  } else if (mood === MoodEnum.EMOCIONAL) {
    // Drama, romance boost
    if (
      genreIds.includes(GENRE_IDS.DRAMA) ||
      genreIds.includes(GENRE_IDS.ROMANCE)
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
    if (genreIds.includes(GENRE_IDS.DOCUMENTARY)) {
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
      // Build query to get pool entries with title_data
      const query = supabase
        .from(RECOMMENDATION_POOL_TABLES.RECOMMENDATION_POOL)
        .select(
          `
          ${RECOMMENDATION_POOL_FIELDS.TMDB_ID},
          ${RECOMMENDATION_POOL_FIELDS.TYPE},
          ${RECOMMENDATION_POOL_FIELDS.SOURCE},
          ${RECOMMENDATION_POOL_FIELDS.SCORE},
          ${RECOMMENDATION_POOL_FIELDS.EXPLANATION_CODE},
          ${RECOMMENDATION_POOL_FIELDS.TITLE_DATA},
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

      // Helper to fetch title_data from TMDB if missing and update pool entry
      const ensureTitleData = async (
        entry: (typeof filteredEntries)[0]
      ): Promise<TitleData | null> => {
        // If title_data exists, use it with fallback to TMDB if needed
        if (entry.title_data) {
          const titleData = entry.title_data as TitleData & {
            title?: string | MultiLanguageText;
            overview?: string | MultiLanguageText;
            poster_path?: string | MultiLanguageText | null;
          };

          // Use unified extraction function with TMDB fallback
          const { extractTitleDataFromPoolWithFallback } =
            await import('../../utils/title-extraction');

          const extracted = await extractTitleDataFromPoolWithFallback(
            {
              title: titleData.title,
              overview: titleData.overview,
              poster_path: titleData.poster_path,
            },
            {
              tmdbId: entry.tmdb_id,
              type: entry.type,
              language,
              region,
              supabase,
              config: {
                public: {
                  supabaseUrl: config.public.supabaseUrl,
                  supabaseAnonKey: config.public.supabaseAnonKey,
                },
              },
            }
          );

          return {
            ...titleData,
            title: extracted.title,
            overview: extracted.overview,
            poster_path: extracted.poster_path || titleData.poster_path || null,
          } as TitleData;
        }

        // Otherwise, fetch from TMDB and update the pool entry
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

          const titleData: TitleData = {
            title: tmdbResponse.title || tmdbResponse.name || '',
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
          };

          // Update the pool entry with title_data
          await supabase
            .from(RECOMMENDATION_POOL_TABLES.RECOMMENDATION_POOL)
            .update({
              [RECOMMENDATION_POOL_FIELDS.TITLE_DATA]: titleData,
            })
            .eq(RECOMMENDATION_POOL_FIELDS.USER_ID, userId)
            .eq(RECOMMENDATION_POOL_FIELDS.TMDB_ID, entry.tmdb_id);

          return titleData;
        } catch (error) {
          safeError(
            `[Recommendations] Error fetching title_data for ${entry.tmdb_id}`,
            error
          );
          return null;
        }
      };

      // Combine pool entries with title_data and calculate final scores
      const entriesWithTitles = await Promise.all(
        filteredEntries.map(async (entry) => {
          const titleData = await ensureTitleData(entry);
          if (!titleData) return null;

          const genreIds = titleData.genres.map((g) => g.id);
          const voteAverage = titleData.vote_average;

          // Calculate boost factors using multiplicative logic
          // Note: runtime and episodeCount not available in title_data,
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
