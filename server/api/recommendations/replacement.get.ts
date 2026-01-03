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
import {
  TABLES,
  USER_TITLE_STATUS_FIELDS,
} from '@/composables/database/constants';
import type { MultiLanguageText } from '@/composables/database/titles';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';

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
 * Calculate mood and attention boosts for a recommendation
 * Priority: Attention > Mood
 */
function calculateBoosts(
  genreIds: number[],
  voteAverage: number | null,
  runtime: number | null,
  episodeCount: number | null,
  type: 'movie' | 'tv',
  mood?: MoodEnumType,
  attention?: AttentionEnumType
): number {
  let boost = 0;

  // Attention boosts (priority)
  if (attention === AttentionEnum.LOW) {
    if (type === 'movie' && runtime && runtime < 100) {
      boost += 10;
    } else if (type === 'tv' && episodeCount && episodeCount <= 1) {
      boost += 10;
    }
    if (
      genreIds.includes(GENRE_IDS.THRILLER) ||
      genreIds.includes(GENRE_IDS.MYSTERY) ||
      genreIds.includes(GENRE_IDS.SCI_FI)
    ) {
      boost -= 15;
    }
  } else if (attention === AttentionEnum.HIGH) {
    if (
      genreIds.includes(GENRE_IDS.DRAMA) ||
      genreIds.includes(GENRE_IDS.THRILLER) ||
      genreIds.includes(GENRE_IDS.SCI_FI)
    ) {
      boost += 10;
    }
    if (
      genreIds.includes(GENRE_IDS.MYSTERY) ||
      genreIds.includes(GENRE_IDS.THRILLER)
    ) {
      boost += 15;
    }
    if (
      genreIds.includes(GENRE_IDS.COMEDY) ||
      genreIds.includes(GENRE_IDS.ANIMATION)
    ) {
      boost -= 10;
    }
  } else if (attention === AttentionEnum.MEDIUM) {
    if (
      genreIds.includes(GENRE_IDS.FAMILY) ||
      genreIds.includes(GENRE_IDS.COMEDY)
    ) {
      boost += 5;
    }
  }

  // Mood boosts (applied after attention)
  if (mood === MoodEnum.RELAX) {
    if (
      genreIds.includes(GENRE_IDS.COMEDY) ||
      genreIds.includes(GENRE_IDS.ANIMATION)
    ) {
      boost += 10;
    }
    if (genreIds.includes(GENRE_IDS.FAMILY)) {
      boost += 10;
    }
    if (
      genreIds.includes(GENRE_IDS.THRILLER) ||
      genreIds.includes(GENRE_IDS.HORROR)
    ) {
      boost -= 10;
    }
    if (genreIds.includes(GENRE_IDS.DRAMA) && voteAverage && voteAverage < 7) {
      boost -= 10;
    }
  } else if (mood === MoodEnum.LIGERO) {
    if (genreIds.includes(GENRE_IDS.COMEDY)) {
      boost += 10;
    }
    if (
      genreIds.includes(GENRE_IDS.ADVENTURE) ||
      genreIds.includes(GENRE_IDS.FAMILY)
    ) {
      boost += 5;
    }
    if (
      genreIds.includes(GENRE_IDS.DRAMA) &&
      voteAverage &&
      voteAverage < 6.5
    ) {
      boost -= 5;
    }
  } else if (mood === MoodEnum.INTENSO) {
    if (
      genreIds.includes(GENRE_IDS.THRILLER) ||
      genreIds.includes(GENRE_IDS.ACTION) ||
      genreIds.includes(GENRE_IDS.CRIME)
    ) {
      boost += 10;
    }
    if (voteAverage && voteAverage >= 7.5) {
      boost += 5;
    }
    if (
      genreIds.includes(GENRE_IDS.ANIMATION) &&
      voteAverage &&
      voteAverage < 7
    ) {
      boost -= 10;
    }
  } else if (mood === MoodEnum.EMOCIONAL) {
    if (
      genreIds.includes(GENRE_IDS.DRAMA) ||
      genreIds.includes(GENRE_IDS.ROMANCE)
    ) {
      boost += 10;
    }
    if (genreIds.includes(GENRE_IDS.DRAMA)) {
      boost += 5;
    }
    if (
      genreIds.includes(GENRE_IDS.ACTION) &&
      (!voteAverage || voteAverage < 6)
    ) {
      boost -= 10;
    }
  } else if (mood === MoodEnum.REFLEXIVO) {
    if (
      genreIds.includes(GENRE_IDS.SCI_FI) ||
      genreIds.includes(GENRE_IDS.MYSTERY)
    ) {
      boost += 10;
    }
    if (genreIds.includes(GENRE_IDS.DOCUMENTARY)) {
      boost += 5;
    }
    if (
      genreIds.includes(GENRE_IDS.COMEDY) &&
      (!voteAverage || voteAverage < 6.5)
    ) {
      boost -= 10;
    }
  }

  return boost;
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
  const config = useRuntimeConfig();
  let user = null;
  let userId: string | null = null;

  // Get query params
  const query = getQuery(event);
  const excludedTmdbId = query.excluded_tmdb_id
    ? Number(query.excluded_tmdb_id)
    : null;
  const excludedType = query.excluded_type as 'movie' | 'tv' | undefined;
  const mood = query.mood as MoodEnumType | undefined;
  const attention = query.attention as AttentionEnumType | undefined;

  if (!excludedTmdbId || !excludedType) {
    throw createError({
      statusCode: 400,
      message: 'excluded_tmdb_id and excluded_type are required',
    });
  }

  // Try to get user from cookies first
  const userFromCookies = await serverSupabaseUser(event);

  if (userFromCookies) {
    userId =
      userFromCookies.id || (userFromCookies as { sub?: string }).sub || null;

    if (userId) {
      user = { id: userId, sub: userId };
      devLog('[Replacement] User from cookies');
    }
  } else {
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
            devLog('[Replacement] User from Authorization header');
          }
        }
      } catch (err) {
        safeError('[Replacement] Error decoding token', err);
      }
    }
  }

  if (!user || !userId) {
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
    // Get excluded titles (seen + not_interested + watchlist + the one being replaced)
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
      .select(USER_TITLE_STATUS_FIELDS.TMDB_ID)
      .eq(USER_TITLE_STATUS_FIELDS.USER_ID, userId)
      .eq(USER_TITLE_STATUS_FIELDS.STATUS, TitleStatus.WATCHLIST);

    const watchlistTmdbIds = new Set<number>();
    if (watchlistStatuses) {
      watchlistStatuses.forEach((status) => {
        watchlistTmdbIds.add(status.tmdb_id);
      });
    }

    // Fetch recommendations from pool
    const { data: poolEntries, error: poolError } = await supabase
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
      .eq(RECOMMENDATION_POOL_FIELDS.USER_ID, userId)
      .order(RECOMMENDATION_POOL_FIELDS.SCORE, { ascending: false })
      .order(RECOMMENDATION_POOL_FIELDS.CREATED_AT, { ascending: false })
      .limit(100); // Get more to filter

    if (poolError) {
      safeError('[Replacement] Error fetching from pool', poolError);
      return null;
    }

    if (!poolEntries || poolEntries.length === 0) {
      return null;
    }

    // Filter out excluded titles
    const filteredEntries = poolEntries.filter(
      (entry) => !excludedTmdbIds.has(entry.tmdb_id)
    );

    // Get user preferences for language and region
    const { language, region } = await getUserTMDBParams(event);
    const tmdbConfig = getTMDBConfig(language, region);

    // Helper to fetch title_data from TMDB if missing
    const ensureTitleData = async (
      entry: (typeof filteredEntries)[0]
    ): Promise<TitleData | null> => {
      if (entry.title_data) {
        const titleData = entry.title_data as TitleData & {
          title?: string | MultiLanguageText;
          overview?: string | MultiLanguageText;
        };

        const { getTitleInLanguage } =
          await import('@/composables/database/titles');

        let extractedTitle = '';
        if (typeof titleData.title === 'string') {
          const titleAsMultiLanguage: MultiLanguageText = {
            [language]: titleData.title,
          };
          extractedTitle = getTitleInLanguage(
            titleAsMultiLanguage,
            language,
            region,
            false
          );
          if (!extractedTitle) {
            extractedTitle = titleData.title;
          }
        } else if (titleData.title && typeof titleData.title === 'object') {
          extractedTitle = getTitleInLanguage(
            titleData.title,
            language,
            region,
            false
          );
        }

        let extractedOverview = '';
        if (typeof titleData.overview === 'string') {
          const overviewAsMultiLanguage: MultiLanguageText = {
            [language]: titleData.overview,
          };
          extractedOverview = getTitleInLanguage(
            overviewAsMultiLanguage,
            language,
            region,
            false
          );
          if (!extractedOverview) {
            extractedOverview = titleData.overview;
          }
        } else if (
          titleData.overview &&
          typeof titleData.overview === 'object'
        ) {
          extractedOverview = getTitleInLanguage(
            titleData.overview,
            language,
            region,
            false
          );
        }

        return {
          ...titleData,
          title: extractedTitle || '',
          overview: extractedOverview || '',
        } as TitleData;
      }

      // Fetch from TMDB
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
          `[Replacement] Error fetching title_data for ${entry.tmdb_id}`,
          error
        );
        return null;
      }
    };

    // Process entries with title_data and calculate scores
    const entriesWithTitles = await Promise.all(
      filteredEntries.map(async (entry) => {
        const titleData = await ensureTitleData(entry);
        if (!titleData) return null;

        const genreIds = titleData.genres.map((g) => g.id);
        const voteAverage = titleData.vote_average;

        const boost = calculateBoosts(
          genreIds,
          voteAverage,
          null,
          null,
          entry.type as 'movie' | 'tv',
          mood,
          attention
        );

        const baseScore = entry.score || 0;
        const finalScore = baseScore + boost;

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

    // Sort by final score
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
        replacementEntry.type === MediaTypeEnum.movie
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
        | typeof MediaTypeEnum.movie
        | typeof MediaTypeEnum.tv,
      poster_path: replacementEntry.titleData.poster_path,
      overview: replacementEntry.titleData.overview || null,
      vote_average: replacementEntry.titleData.vote_average,
      genres: replacementEntry.genreIds.length > 0
        ? replacementEntry.genreIds
        : null,
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

