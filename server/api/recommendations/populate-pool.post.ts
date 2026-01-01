import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getTMDBConfig } from '../../utils/config';
import { getUserTMDBParams } from '../../utils/user-preferences';
import { devLog, devError, safeError } from '../../utils/logger';
import {
  getPoolCount,
  deleteLowestScoreEntries,
  insertPoolEntries,
  type RecommendationPoolSource,
  RECOMMENDATION_POOL_FIELDS,
  TABLES as POOL_TABLES,
} from '@/composables/database/recommendationPool';
import { TABLES, TITLES_FIELDS } from '@/composables/database/constants';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import { TitleStatus } from '@/types/TitleStatus';

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
  runtime?: number; // movies
  episode_run_time?: number[]; // tv shows
};

type TMDBResponse = {
  page: number;
  results: TMDBResult[];
  total_pages: number;
  total_results: number;
};

/**
 * Minimum quality criteria (less strict than recommendations endpoint)
 */
const MIN_VOTE_AVERAGE_POOL = 6.0; // Less strict for pool population
const MIN_VOTE_COUNT_MOVIE = 500;
const MIN_VOTE_COUNT_TV = 800;
const MAX_POOL_SIZE = 200;
const TARGET_POOL_SIZE = 150; // Target size before cleanup

/**
 * Populate recommendation pool for a user
 * Called after onboarding completion or when pool is low
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  let user = null;
  let userId: string | null = null;

  // Get user from cookies
  const userFromCookies = await serverSupabaseUser(event);

  if (userFromCookies) {
    userId =
      userFromCookies.id || (userFromCookies as { sub?: string }).sub || null;

    if (userId) {
      user = { id: userId, sub: userId };
      devLog('[PopulatePool] User from cookies');
    }
  }

  if (!user || !userId) {
    devError('[PopulatePool] Unauthorized - no user found');
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  // Create Supabase client with service role key
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
    // Get user preferences for language and region
    const { language, region } = await getUserTMDBParams(event);
    const tmdbConfig = getTMDBConfig(language, region);
    devLog('[PopulatePool] Using language:', language, 'region:', region);

    // Check current pool size
    const currentPoolCount = await getPoolCount(userId, supabase);
    devLog('[PopulatePool] Current pool count:', currentPoolCount);

    // If pool is at or near max, delete lowest scores first
    if (currentPoolCount >= TARGET_POOL_SIZE) {
      const toDelete = currentPoolCount - TARGET_POOL_SIZE + 50; // Delete enough to make room
      if (toDelete > 0) {
        devLog('[PopulatePool] Deleting lowest score entries:', toDelete);
        await deleteLowestScoreEntries(userId, toDelete, supabase);
      }
    }

    // Get excluded titles (seen + not_interested)
    const { data: excludedStatuses } = await supabase
      .from('user_title_status')
      .select('tmdb_id')
      .eq('user_id', userId)
      .in('status', [TitleStatus.SEEN, TitleStatus.NOT_INTERESTED]);

    const excludedTmdbIds = new Set<number>();
    if (excludedStatuses) {
      excludedStatuses.forEach((status) => {
        excludedTmdbIds.add(status.tmdb_id);
      });
    }

    // Get user's liked titles
    const { data: userLikedStatuses } = await supabase
      .from('user_title_status')
      .select('tmdb_id, type')
      .eq('user_id', userId)
      .eq('liked', true);

    const likedTmdbIds = new Set<number>();
    if (userLikedStatuses) {
      userLikedStatuses.forEach((status) => {
        likedTmdbIds.add(status.tmdb_id);
      });
    }

    const entriesToInsert: Array<{
      tmdb_id: number;
      type: 'movie' | 'tv';
      source: RecommendationPoolSource;
      score: number;
      explanation_code: string | null;
    }> = [];

    // Helper to ensure title exists in titles table
    const ensureTitleExists = async (
      result: TMDBResult,
      type: 'movie' | 'tv'
    ) => {
      const { data: existingTitle } = await supabase
        .from(TABLES.TITLES)
        .select('id')
        .eq(TITLES_FIELDS.TMDB_ID, result.id)
        .eq(TITLES_FIELDS.TYPE, type)
        .maybeSingle();

      if (!existingTitle) {
        // Insert title into titles table
        await supabase.from(TABLES.TITLES).insert({
          [TITLES_FIELDS.TMDB_ID]: result.id,
          [TITLES_FIELDS.TITLE]: result.title || result.name || '',
          [TITLES_FIELDS.TYPE]: type,
          [TITLES_FIELDS.POSTER_PATH]: result.poster_path,
          [TITLES_FIELDS.BACKDROP_PATH]: result.backdrop_path,
          [TITLES_FIELDS.OVERVIEW]: result.overview,
          [TITLES_FIELDS.RELEASE_DATE]: result.release_date || null,
          [TITLES_FIELDS.FIRST_AIR_DATE]: result.first_air_date || null,
          [TITLES_FIELDS.GENRES]: result.genre_ids,
          [TITLES_FIELDS.VOTE_AVERAGE]: result.vote_average,
        });
      }
    };

    // Helper to fetch and process TMDB results
    const fetchAndProcess = async (
      url: string,
      queryParams: Record<string, unknown>,
      source: RecommendationPoolSource,
      explanationCode: string,
      type: 'movie' | 'tv',
      maxPages: number = 5
    ) => {
      let page = 1;
      const processed = new Set<number>(); // Track processed tmdb_ids

      while (page <= maxPages && entriesToInsert.length < MAX_POOL_SIZE) {
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

          // Filter by minimum quality (less strict)
          const filtered = response.results.filter((result) => {
            if (processed.has(result.id)) return false;
            if (excludedTmdbIds.has(result.id)) return false;
            if (likedTmdbIds.has(result.id)) return false;

            const meetsQuality =
              result.vote_average >= MIN_VOTE_AVERAGE_POOL &&
              (type === 'movie'
                ? result.vote_count >= MIN_VOTE_COUNT_MOVIE
                : result.vote_count >= MIN_VOTE_COUNT_TV);

            return meetsQuality;
          });

          // Process filtered results
          for (const result of filtered) {
            if (entriesToInsert.length >= MAX_POOL_SIZE) break;
            if (processed.has(result.id)) continue;

            processed.add(result.id);

            // Ensure title exists in titles table
            await ensureTitleExists(result, type);

            entriesToInsert.push({
              tmdb_id: result.id,
              type,
              source,
              score: 0, // Initial score
              explanation_code: explanationCode,
            });
          }

          if (page >= response.total_pages) break;
          page++;
        } catch (error) {
          safeError(`[PopulatePool] Error fetching ${url} page ${page}`, error);
          break;
        }
      }
    };

    // 1. Fetch recommendations from liked titles (based_on_like)
    if (userLikedStatuses && userLikedStatuses.length > 0) {
      // Get top 2 liked titles by vote_average
      const { data: likedTitlesData } = await supabase
        .from('titles')
        .select('tmdb_id, type, vote_average')
        .in(
          'tmdb_id',
          userLikedStatuses.map((s) => s.tmdb_id)
        )
        .not('vote_average', 'is', null)
        .order('vote_average', { ascending: false })
        .limit(2);

      if (likedTitlesData) {
        for (const likedTitle of likedTitlesData) {
          const recommendationPath =
            likedTitle.type === 'movie'
              ? `/movie/${likedTitle.tmdb_id}/recommendations`
              : `/tv/${likedTitle.tmdb_id}/recommendations`;

          await fetchAndProcess(
            `${tmdbConfig.baseUrl}${recommendationPath}`,
            {},
            'based_on_like',
            'BASED_ON_LIKE',
            likedTitle.type as 'movie' | 'tv',
            3
          );
        }
      }
    }

    // 2. Fetch trending (trending)
    await fetchAndProcess(
      `${tmdbConfig.baseUrl}/trending/movie/week`,
      {},
      'trending',
      'TRENDING',
      'movie',
      3
    );

    await fetchAndProcess(
      `${tmdbConfig.baseUrl}/trending/tv/week`,
      {},
      'trending',
      'TRENDING',
      'tv',
      3
    );

    // 3. Fetch discover by top genres (discover)
    // Get user's top genres from liked titles
    const { data: likedTitlesForGenres } = await supabase
      .from('titles')
      .select('genres')
      .in('tmdb_id', userLikedStatuses?.map((s) => s.tmdb_id) || [])
      .not('genres', 'is', null);

    const genreFrequency = new Map<number, number>();
    if (likedTitlesForGenres) {
      likedTitlesForGenres.forEach((title) => {
        if (title.genres && Array.isArray(title.genres)) {
          title.genres.forEach((genre: number | { id?: number }) => {
            const genreId = typeof genre === 'number' ? genre : genre?.id;
            if (genreId) {
              genreFrequency.set(
                genreId,
                (genreFrequency.get(genreId) || 0) + 1
              );
            }
          });
        }
      });
    }

    const topGenres = Array.from(genreFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genreId]) => genreId);

    if (topGenres.length > 0) {
      // Discover movies
      await fetchAndProcess(
        `${tmdbConfig.baseUrl}/discover/movie`,
        {
          with_genres: topGenres.join(','),
          sort_by: 'popularity.desc',
        },
        'discover',
        'DISCOVER',
        'movie',
        3
      );

      // Discover TV
      await fetchAndProcess(
        `${tmdbConfig.baseUrl}/discover/tv`,
        {
          with_genres: topGenres.join(','),
          sort_by: 'popularity.desc',
        },
        'discover',
        'DISCOVER',
        'tv',
        3
      );
    }

    // 4. Fetch easy to watch (comedy/animation) (easy)
    await fetchAndProcess(
      `${tmdbConfig.baseUrl}/discover/movie`,
      {
        with_genres: '35,16', // Comedy, Animation
        sort_by: 'popularity.desc',
      },
      'easy',
      'EASY_TO_WATCH',
      'movie',
      2
    );

    await fetchAndProcess(
      `${tmdbConfig.baseUrl}/discover/tv`,
      {
        with_genres: '35,16', // Comedy, Animation
        sort_by: 'popularity.desc',
      },
      'easy',
      'EASY_TO_WATCH',
      'tv',
      2
    );

    // Insert entries into pool
    if (entriesToInsert.length > 0) {
      devLog('[PopulatePool] Inserting entries:', entriesToInsert.length);
      const inserted = await insertPoolEntries(
        userId,
        entriesToInsert,
        supabase
      );
      devLog('[PopulatePool] Successfully inserted:', inserted);
    }

    return {
      success: true,
      inserted: entriesToInsert.length,
      poolSize: await getPoolCount(userId, supabase),
    };
  } catch (error) {
    devError('[PopulatePool] Error:', error);
    throw createError({
      statusCode: 500,
      message: 'Error populating recommendation pool',
    });
  }
});
