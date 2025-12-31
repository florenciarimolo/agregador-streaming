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
import {
  RECOMMENDATION_POOL_FIELDS,
  RECOMMENDATION_POOL_TABLES,
} from '@/composables/database/recommendationPool';
import { TABLES, TITLES_FIELDS } from '@/composables/database/constants';
import { updateLastShownAt } from '@/composables/database/recommendationPool';

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
 * Calculate mood and attention boosts for a recommendation
 * Priority: Attention > Mood
 */
function calculateBoosts(
  genreIds: number[],
  voteAverage: number | null,
  runtime: number | null, // For movies
  episodeCount: number | null, // For TV shows
  type: 'movie' | 'tv',
  mood?: MoodEnumType,
  attention?: AttentionEnumType
): number {
  let boost = 0;

  // Attention boosts (priority)
  if (attention === AttentionEnum.LOW) {
    // +10 runtime corto, +10 episodios autoconclusivos, -15 tramas complejas
    if (type === 'movie' && runtime && runtime < 100) {
      boost += 10;
    } else if (type === 'tv' && episodeCount && episodeCount <= 1) {
      boost += 10;
    }
    // Penalize complex genres
    if (
      genreIds.includes(GENRE_IDS.THRILLER) ||
      genreIds.includes(GENRE_IDS.MYSTERY) ||
      genreIds.includes(GENRE_IDS.SCI_FI)
    ) {
      boost -= 15;
    }
  } else if (attention === AttentionEnum.HIGH) {
    // +15 narrativa compleja, +10 drama/thriller/sci-fi, -10 contenido trivial
    if (
      genreIds.includes(GENRE_IDS.DRAMA) ||
      genreIds.includes(GENRE_IDS.THRILLER) ||
      genreIds.includes(GENRE_IDS.SCI_FI)
    ) {
      boost += 10;
    }
    // Boost complex narratives
    if (
      genreIds.includes(GENRE_IDS.MYSTERY) ||
      genreIds.includes(GENRE_IDS.THRILLER)
    ) {
      boost += 15;
    }
    // Penalize trivial content
    if (
      genreIds.includes(GENRE_IDS.COMEDY) ||
      genreIds.includes(GENRE_IDS.ANIMATION)
    ) {
      boost -= 10;
    }
  } else if (attention === AttentionEnum.MEDIUM) {
    // +5 géneros familiares, sin penalizaciones fuertes
    if (
      genreIds.includes(GENRE_IDS.FAMILY) ||
      genreIds.includes(GENRE_IDS.COMEDY)
    ) {
      boost += 5;
    }
  }

  // Mood boosts (applied after attention)
  if (mood === MoodEnum.RELAX) {
    // +10 comedia, animación, +10 easy/ligero, -10 thriller/terror, -10 drama denso
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
      boost -= 10; // Dense drama
    }
  } else if (mood === MoodEnum.LIGERO) {
    // +10 comedia, +5 aventura/familia, -5 drama pesado
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
      boost -= 5; // Heavy drama
    }
  } else if (mood === MoodEnum.INTENSO) {
    // +10 thriller/acción/crimen, +5 voto alto, -10 animación infantil
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
      boost -= 10; // Child animation
    }
  } else if (mood === MoodEnum.EMOCIONAL) {
    // +10 drama/romance, +5 historias humanas, -10 acción vacía
    if (
      genreIds.includes(GENRE_IDS.DRAMA) ||
      genreIds.includes(GENRE_IDS.ROMANCE)
    ) {
      boost += 10;
    }
    if (genreIds.includes(GENRE_IDS.DRAMA)) {
      boost += 5; // Human stories
    }
    if (
      genreIds.includes(GENRE_IDS.ACTION) &&
      (!voteAverage || voteAverage < 6)
    ) {
      boost -= 10; // Empty action
    }
  } else if (mood === MoodEnum.REFLEXIVO) {
    // +10 sci-fi/misterio, +5 documentales, -10 comedia simple
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
      boost -= 10; // Simple comedy
    }
  }

  return boost;
}

/**
 * Get recommendations for the authenticated user from recommendation_pool
 *
 * Strategy:
 * - Read from recommendation_pool (not TMDB)
 * - Exclude titles with status 'seen' or 'not_interested'
 * - Order by score DESC, created_at DESC
 * - Support mood/attention reordering (no recalculation)
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  let user = null;
  let userId: string | null = null;

  // Get query params for mood and attention
  const query = getQuery(event);
  const mood = query.mood as MoodEnumType | undefined;
  const attention = query.attention as AttentionEnumType | undefined;

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
    // Get excluded titles (seen + not_interested)
    const { data: excludedStatuses, error: statusError } = await supabase
      .from('user_title_status')
      .select('tmdb_id')
      .eq('user_id', userId)
      .in('status', [TitleStatus.SEEN, TitleStatus.NOT_INTERESTED]);

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

    // Get watchlist titles to mark them in recommendations
    const { data: watchlistStatuses, error: watchlistError } = await supabase
      .from('user_title_status')
      .select('tmdb_id')
      .eq('user_id', userId)
      .eq('status', TitleStatus.WATCHLIST);

    if (watchlistError) {
      safeError('Error fetching watchlist statuses', watchlistError);
      // Don't throw - continue without watchlist info if there's an error
    }

    // Build set of watchlist tmdb_ids
    const watchlistTmdbIds = new Set<number>();
    if (watchlistStatuses) {
      watchlistStatuses.forEach((status) => {
        watchlistTmdbIds.add(status.tmdb_id);
      });
    }

    // Fetch all recommendations from pool (no source filtering)
    const fetchRecommendations = async (): Promise<Recommendation[]> => {
      // Build query to get pool entries (without title data - no FK relationship)
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
      const filteredEntries = poolEntries.filter(
        (entry) => !excludedTmdbIds.has(entry.tmdb_id)
      );

      // Get unique tmdb_ids from filtered entries
      const tmdbIds = Array.from(
        new Set(filteredEntries.map((entry) => entry.tmdb_id))
      );

      // Fetch title data separately (no FK relationship, so we join manually)
      const { data: titlesData, error: titlesError } = await supabase
        .from(TABLES.TITLES)
        .select(
          `
          ${TITLES_FIELDS.ID},
          ${TITLES_FIELDS.TITLE},
          ${TITLES_FIELDS.POSTER_PATH},
          ${TITLES_FIELDS.BACKDROP_PATH},
          ${TITLES_FIELDS.OVERVIEW},
          ${TITLES_FIELDS.RELEASE_DATE},
          ${TITLES_FIELDS.FIRST_AIR_DATE},
          ${TITLES_FIELDS.GENRES},
          ${TITLES_FIELDS.VOTE_AVERAGE},
          ${TITLES_FIELDS.TMDB_ID}
        `
        )
        .in(TITLES_FIELDS.TMDB_ID, tmdbIds);

      if (titlesError) {
        safeError('[Recommendations] Error fetching titles', titlesError);
        // Continue without title data - we'll skip entries without titles
      }

      // Create a map of tmdb_id -> title data for quick lookup
      const titlesMap = new Map<number, Record<string, unknown>>();
      if (titlesData) {
        titlesData.forEach((title) => {
          titlesMap.set(title.tmdb_id, title);
        });
      }

      // Combine pool entries with title data and calculate final scores
      const entriesWithTitles = filteredEntries
        .map((entry) => {
          const title = titlesMap.get(entry.tmdb_id);
          if (!title) return null;

          const genres = title[TITLES_FIELDS.GENRES] as
            | number[]
            | { id: number }[]
            | null;

          const genreIds = Array.isArray(genres)
            ? (genres
                .map((g) =>
                  typeof g === 'number' ? g : (g as { id: number })?.id
                )
                .filter(Boolean) as number[])
            : [];

          const voteAverage =
            (title[TITLES_FIELDS.VOTE_AVERAGE] as number | null) || null;

          // Calculate boosts using the complete logic
          // Note: runtime and episodeCount not available in titles table,
          // so we'll use genre-based heuristics for attention
          const boost = calculateBoosts(
            genreIds,
            voteAverage,
            null, // runtime not available
            null, // episodeCount not available
            entry.type as 'movie' | 'tv',
            mood,
            attention
          );

          // Calculate final score
          const baseScore = entry.score || 0;
          const finalScore = baseScore + boost;

          return {
            ...entry,
            titles: [title],
            finalScore,
            baseScore,
            genreIds,
            voteAverage,
          };
        })
        .filter((entry) => entry !== null) as Array<
        (typeof filteredEntries)[0] & {
          titles: Array<Record<string, unknown>>;
          finalScore: number;
          baseScore: number;
          genreIds: number[];
          voteAverage: number | null;
        }
      >;

      // Sort by final score (base + boosts), then by base score, then by created_at
      entriesWithTitles.sort((a, b) => {
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

      // Transform sorted pool entries to recommendations
      const recommendations: Recommendation[] = [];
      const tmdbConfig = getTMDBConfig();
      const tmdbIdsToTrack: number[] = [];

      for (const entry of entriesWithTitles.slice(0, MAX_RECOMMENDATIONS)) {
        const title = entry.titles[0];

        // Fetch providers from TMDB (still need this for display)
        let providers: Provider[] = [];
        try {
          const providerPath =
            entry.type === 'movie'
              ? `/movie/${entry.tmdb_id}/watch/providers`
              : `/tv/${entry.tmdb_id}/watch/providers`;
          const providerResponse = await $fetch<{
            results?: {
              ES?: {
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

          const esProviders = providerResponse.results?.ES;
          if (esProviders) {
            const streamingProviders = esProviders.flatrate || [];
            const buyProviders = esProviders.buy || [];
            const rentProviders = esProviders.rent || [];
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
          title: (title[TITLES_FIELDS.TITLE] as string) || '',
          type: entry.type as 'movie' | 'tv',
          poster_path:
            (title[TITLES_FIELDS.POSTER_PATH] as string | null) || null,
          overview: (title[TITLES_FIELDS.OVERVIEW] as string | null) || null,
          vote_average:
            (title[TITLES_FIELDS.VOTE_AVERAGE] as number | null) || null,
          genres: entry.genreIds.length > 0 ? entry.genreIds : null,
          release_date:
            (title[TITLES_FIELDS.RELEASE_DATE] as string | null) || null,
          first_air_date:
            (title[TITLES_FIELDS.FIRST_AIR_DATE] as string | null) || null,
          explanation,
          explanation_code: entry.explanation_code || null,
          providers,
          in_watchlist: watchlistTmdbIds.has(entry.tmdb_id),
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
