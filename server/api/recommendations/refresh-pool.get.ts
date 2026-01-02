import { createClient } from '@supabase/supabase-js';
import { devLog, devError, safeError } from '../../utils/logger';
import {
  getPoolCount,
  deleteLowestScoreEntries,
  insertPoolEntries,
  type RecommendationPoolSource,
  type TitleData,
} from '@/composables/database/recommendationPool';
import { getTMDBConfig } from '../../utils/config';
import { getUserTMDBParamsByUserId } from '../../utils/user-preferences';
import { TitleStatus } from '@/types/TitleStatus';
import {
  TABLES,
  PROFILES_FIELDS,
  USER_TITLE_STATUS_FIELDS,
} from '@/composables/database/constants';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';

/**
 * TMDB API response types
 */
type TMDBResult = {
  id: number;
  title?: string; // movies
  name?: string; // tv shows
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string; // movies
  first_air_date?: string; // tv shows
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
};

type TMDBResponse = {
  page: number;
  results: TMDBResult[];
  total_pages: number;
  total_results: number;
};

/**
 * Minimum quality criteria for pool refresh
 */
const MIN_VOTE_AVERAGE_POOL = 6.0;
const MIN_VOTE_COUNT_MOVIE = 500;
const MIN_VOTE_COUNT_TV = 800;
const MAX_POOL_SIZE = 200;
const MIN_POOL_SIZE = 50; // Threshold below which we refresh

/**
 * Refresh recommendation pools for users with low pool counts
 * Called by Vercel cron job daily at 2 AM
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Verify this is a cron job request (optional security check)
  const authHeader = event.node.req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  // Create Supabase client with service role key
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    devError('[RefreshPool] SUPABASE_SERVICE_ROLE_KEY not found');
    throw createError({
      statusCode: 500,
      message: 'Server configuration error',
    });
  }

  const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    // Get all users with pool count < MIN_POOL_SIZE
    const { data: usersWithLowPool, error: usersError } = await supabase
      .from(TABLES.PROFILES)
      .select(PROFILES_FIELDS.ID)
      .limit(100); // Limit to 100 users per run to avoid timeout

    if (usersError) {
      devError('[RefreshPool] Error fetching users:', usersError);
      throw usersError;
    }

    if (!usersWithLowPool || usersWithLowPool.length === 0) {
      devLog('[RefreshPool] No users found');
      return { success: true, refreshed: 0 };
    }

    let refreshedCount = 0;

    // Process each user
    for (const user of usersWithLowPool) {
      const userId = user.id;

      try {
        // Check current pool size
        const currentPoolCount = await getPoolCount(userId, supabase);

        // Only refresh if pool is below threshold
        if (currentPoolCount >= MIN_POOL_SIZE) {
          continue;
        }

        devLog(
          `[RefreshPool] Refreshing pool for user ${userId}, current count: ${currentPoolCount}`
        );

        // If pool is at or near max, delete lowest scores first
        if (currentPoolCount >= MAX_POOL_SIZE - 50) {
          const toDelete = currentPoolCount - (MAX_POOL_SIZE - 50);
          if (toDelete > 0) {
            await deleteLowestScoreEntries(userId, toDelete, supabase);
          }
        }

        // Get excluded titles (seen + not_interested)
        const { data: excludedStatuses } = await supabase
          .from(TABLES.USER_TITLE_STATUS)
          .select(USER_TITLE_STATUS_FIELDS.TMDB_ID)
          .eq(USER_TITLE_STATUS_FIELDS.USER_ID, userId)
          .in(USER_TITLE_STATUS_FIELDS.STATUS, [
            TitleStatus.SEEN,
            TitleStatus.NOT_INTERESTED,
          ]);

        const excludedTmdbIds = new Set<number>();
        if (excludedStatuses) {
          excludedStatuses.forEach((status) => {
            excludedTmdbIds.add(status.tmdb_id);
          });
        }

        // Get user's liked titles
        const { data: userLikedStatuses } = await supabase
          .from(TABLES.USER_TITLE_STATUS)
          .select(
            `${USER_TITLE_STATUS_FIELDS.TMDB_ID}, ${USER_TITLE_STATUS_FIELDS.TYPE}`
          )
          .eq(USER_TITLE_STATUS_FIELDS.USER_ID, userId)
          .eq(USER_TITLE_STATUS_FIELDS.LIKED, true);

        const likedTmdbIds = new Set<number>();
        if (userLikedStatuses) {
          userLikedStatuses.forEach((status) => {
            likedTmdbIds.add(status.tmdb_id);
          });
        }

        // Get user preferences for language and region
        const { language, region } = await getUserTMDBParamsByUserId(userId);
        const tmdbConfig = getTMDBConfig(language, region);
        devLog(
          `[RefreshPool] Using language: ${language}, region: ${region} for user ${userId}`
        );

        const entriesToInsert: Array<{
          tmdb_id: number;
          type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
          source: RecommendationPoolSource;
          score: number;
          explanation_code: string | null;
          title_data: TitleData | null;
        }> = [];

        // Helper to fetch full title details from TMDB (including full genre objects)
        const fetchTitleDetails = async (
          tmdbId: number,
          type: 'movie' | 'tv'
        ): Promise<TitleData | null> => {
          try {
            const endpoint =
              type === MediaTypeEnum.movie
                ? `/movie/${tmdbId}`
                : `/tv/${tmdbId}`;
            const fullResponse = await $fetch(`${tmdbConfig.baseUrl}${endpoint}`, {
              query: {
                api_key: tmdbConfig.apiKey,
                language: tmdbConfig.language,
                region: tmdbConfig.region,
              },
            });

            if (!fullResponse) return null;

            // Extract full genre objects (not just IDs)
            const genres = fullResponse.genres || [];

            return {
              title: fullResponse.title || fullResponse.name || '',
              overview: fullResponse.overview || '',
              poster_path: fullResponse.poster_path || null,
              backdrop_path: fullResponse.backdrop_path || null,
              vote_average: fullResponse.vote_average || null,
              genres: genres.map((g: { id: number; name: string }) => ({
                id: g.id,
                name: g.name,
              })),
              release_date: fullResponse.release_date || null,
              first_air_date: fullResponse.first_air_date || null,
            };
          } catch (error) {
            safeError(`[RefreshPool] Error fetching title details for ${tmdbId}`, error);
            return null;
          }
        };

        // Helper to fetch and process TMDB results
        const fetchAndProcess = async (
          url: string,
          queryParams: Record<string, unknown>,
          source: RecommendationPoolSource,
          explanationCode: string,
          type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv,
          maxPages: number = 2
        ) => {
          let page = 1;
          const processed = new Set<number>();

          while (page <= maxPages && entriesToInsert.length < 50) {
            try {
              const response = await $fetch<TMDBResponse>(url, {
                query: {
                  ...queryParams,
                  api_key: tmdbConfig.apiKey,
                  language: tmdbConfig.language,
                  region: tmdbConfig.region,
                  page,
                },
              });

              if (!response.results || response.results.length === 0) break;

              // Filter by minimum quality
              const filtered = response.results.filter((result) => {
                if (processed.has(result.id)) return false;
                if (excludedTmdbIds.has(result.id)) return false;
                if (likedTmdbIds.has(result.id)) return false;

                const meetsQuality =
                  result.vote_average >= MIN_VOTE_AVERAGE_POOL &&
                  (type === MediaTypeEnum.movie
                    ? result.vote_count >= MIN_VOTE_COUNT_MOVIE
                    : result.vote_count >= MIN_VOTE_COUNT_TV);

                return meetsQuality;
              });

              // Process filtered results
              for (const result of filtered) {
                if (entriesToInsert.length >= 50) break;
                if (processed.has(result.id)) continue;

                processed.add(result.id);

                // Fetch full title details including complete genre objects
                const titleData = await fetchTitleDetails(result.id, type);

                entriesToInsert.push({
                  tmdb_id: result.id,
                  type,
                  source,
                  score: 0,
                  explanation_code: explanationCode,
                  title_data: titleData,
                });
              }

              if (page >= response.total_pages) break;
              page++;
            } catch (error) {
              safeError(
                `[RefreshPool] Error fetching ${url} page ${page}`,
                error
              );
              break;
            }
          }
        };

        // Fetch trending (main source for refresh)
        await fetchAndProcess(
          `${tmdbConfig.baseUrl}/trending/movie/week`,
          {},
          'trending',
          'TRENDING',
          MediaTypeEnum.movie,
          2
        );

        await fetchAndProcess(
          `${tmdbConfig.baseUrl}/trending/tv/week`,
          {},
          'trending',
          'TRENDING',
          MediaTypeEnum.tv,
          2
        );

        // Insert entries into pool
        if (entriesToInsert.length > 0) {
          await insertPoolEntries(userId, entriesToInsert, supabase);
          refreshedCount++;
          devLog(
            `[RefreshPool] Inserted ${entriesToInsert.length} entries for user ${userId}`
          );
        }
      } catch (userError) {
        safeError(`[RefreshPool] Error processing user ${userId}`, userError);
        // Continue with next user
      }
    }

    return {
      success: true,
      refreshed: refreshedCount,
      totalUsers: usersWithLowPool.length,
    };
  } catch (error) {
    devError('[RefreshPool] Error:', error);
    throw createError({
      statusCode: 500,
      message: 'Error refreshing recommendation pools',
    });
  }
});
