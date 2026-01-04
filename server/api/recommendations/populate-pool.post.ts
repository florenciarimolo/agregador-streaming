import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getTMDBConfig } from '../../utils/config';
import { getUserTMDBParams } from '../../utils/user-preferences';
import { devLog, devError, safeError } from '../../utils/logger';
import {
  getPoolCount,
  deleteLowestScoreEntries,
  deleteAllPoolEntries,
  insertPoolEntries,
  type RecommendationPoolSource,
  type TitleData,
} from '@/composables/database/recommendationPool';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import { TitleStatus } from '@/types/TitleStatus';
import { DEFAULT_LANGUAGE_ISO } from '@/constants/languages';
import type {
  TMDBResponse,
  TMDBTitleDetails,
  TMDBWatchProvidersResponse,
} from '@/types/tmdb/Responses';
import {
  TABLES,
  TITLES_FIELDS,
  USER_TITLE_STATUS_FIELDS,
  USER_PREFERENCES_FIELDS,
} from '@/composables/database/constants';
import {
  getTitleInLanguage,
  type MultiLanguageText,
} from '@/composables/database/titles';
import { getPrimaryLanguageForRegion } from '@/utils/language-detection';

/**
 * Minimum quality criteria (less strict than recommendations endpoint)
 */
const MIN_VOTE_AVERAGE_POOL = 6.5; // Less strict for pool population
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

    // Get user preferences for genres and providers
    const { data: userPreferences } = await supabase
      .from(TABLES.USER_PREFERENCES)
      .select(
        `${USER_PREFERENCES_FIELDS.FAVORITE_GENRES}, ${USER_PREFERENCES_FIELDS.INCLUDED_PROVIDERS}`
      )
      .eq(USER_PREFERENCES_FIELDS.USER_ID, userId)
      .maybeSingle();

    const favoriteGenres =
      (userPreferences?.[
        USER_PREFERENCES_FIELDS.FAVORITE_GENRES
      ] as number[]) || [];
    const includedProviders =
      (userPreferences?.[
        USER_PREFERENCES_FIELDS.INCLUDED_PROVIDERS
      ] as number[]) || [];

    devLog(
      '[PopulatePool] User preferences - genres:',
      favoriteGenres,
      'providers:',
      includedProviders
    );

    // Check if we should clear the entire pool (e.g., when preferences change)
    const query = getQuery(event);
    const clearPool = query.clearPool === 'true' || query.clearPool === true;

    if (clearPool) {
      devLog('[PopulatePool] Clearing entire pool before regeneration');
      await deleteAllPoolEntries(userId, supabase);
    } else {
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
    }

    // Get all user title statuses in a single query and filter in memory
    const { data: allUserStatuses } = await supabase
      .from(TABLES.USER_TITLE_STATUS)
      .select(
        `${USER_TITLE_STATUS_FIELDS.TMDB_ID}, ${USER_TITLE_STATUS_FIELDS.TYPE}, ${USER_TITLE_STATUS_FIELDS.STATUS}, ${USER_TITLE_STATUS_FIELDS.LIKED}`
      )
      .eq(USER_TITLE_STATUS_FIELDS.USER_ID, userId);

    const excludedTmdbIds = new Set<number>();
    const likedTmdbIds = new Set<number>();
    const userLikedStatuses: Array<{ tmdb_id: number; type: string }> = [];

    if (allUserStatuses) {
      allUserStatuses.forEach((status) => {
        // Build excluded set (seen + not_interested)
        if (
          status.status === TitleStatus.SEEN ||
          status.status === TitleStatus.NOT_INTERESTED
        ) {
          excludedTmdbIds.add(status.tmdb_id);
        }

        // Build liked set
        if (status.liked === true) {
          likedTmdbIds.add(status.tmdb_id);
          userLikedStatuses.push({
            tmdb_id: status.tmdb_id,
            type: status.type,
          });
        }
      });
    }

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
      type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv
    ): Promise<TitleData | null> => {
      try {
        const endpoint =
          type === MediaTypeEnum.movie ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
        const fullResponse = await $fetch<TMDBTitleDetails>(
          `${tmdbConfig.baseUrl}${endpoint}`,
          {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              region: tmdbConfig.region,
            },
          }
        );

        if (!fullResponse) return null;

        // Extract full genre objects (not just IDs)
        const genres = fullResponse.genres || [];

        // Convert title to multi-language format and use alphabet detector
        const titleText = fullResponse.title || fullResponse.name || '';
        const titleAsMultiLanguage: MultiLanguageText = {
          [language]: titleText,
        };

        // Use getTitleInLanguage with alphabet detection
        // If it returns empty, it means we need to fetch primary language from TMDB
        let extractedTitle = getTitleInLanguage(
          titleAsMultiLanguage,
          language,
          region,
          false // isImagePath = false
        );

        // Determine primary language for region
        const primaryLanguage = region
          ? getPrimaryLanguageForRegion(region)
          : DEFAULT_LANGUAGE_ISO;
        const primaryLanguageKey = `${primaryLanguage}-${region?.toUpperCase() || 'ES'}`;

        // Check if we need to fetch primary language (title empty or overview empty)
        const needsPrimaryLanguage =
          !extractedTitle ||
          !fullResponse.overview ||
          fullResponse.overview.trim() === '';
        let primaryResponse: TMDBTitleDetails | null = null;

        if (needsPrimaryLanguage) {
          try {
            primaryResponse = await $fetch<TMDBTitleDetails>(
              `${tmdbConfig.baseUrl}${endpoint}`,
              {
                query: {
                  api_key: tmdbConfig.apiKey,
                  language: primaryLanguageKey,
                  region: tmdbConfig.region,
                },
              }
            );

            if (primaryResponse) {
              devLog(
                `[PopulatePool] Fetched primary language (${primaryLanguageKey}) for ${tmdbId}`
              );
            }
          } catch (primaryError) {
            safeError(
              `[PopulatePool] Error fetching primary language for ${tmdbId}`,
              primaryError
            );
          }
        }

        // Use primary language title if extracted title is empty
        if (!extractedTitle && primaryResponse) {
          extractedTitle =
            primaryResponse.title || primaryResponse.name || titleText;
        } else if (!extractedTitle) {
          // Fallback to original title if primary language fetch failed
          extractedTitle = titleText;
        }

        // Handle overview: if empty, use primary language overview
        let overview = fullResponse.overview || '';
        if (
          (!overview || overview.trim() === '') &&
          primaryResponse?.overview
        ) {
          overview = primaryResponse.overview;
          devLog(
            `[PopulatePool] Using primary language (${primaryLanguageKey}) overview for ${tmdbId}`
          );
        }

        return {
          title: extractedTitle,
          overview: overview,
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
        safeError(
          `[PopulatePool] Error fetching title details for ${tmdbId}`,
          error
        );
        return null;
      }
    };

    // Helper to fetch watch providers for a title
    const fetchWatchProviders = async (
      tmdbId: number,
      type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv
    ): Promise<number[]> => {
      try {
        const endpoint =
          type === MediaTypeEnum.movie
            ? `/movie/${tmdbId}/watch/providers`
            : `/tv/${tmdbId}/watch/providers`;
        const response = await $fetch<TMDBWatchProvidersResponse>(
          `${tmdbConfig.baseUrl}${endpoint}`,
          {
            query: {
              api_key: tmdbConfig.apiKey,
            },
          }
        );

        if (!response) return [];

        // Get providers from the region (flatrate, buy, rent)
        // Try both uppercase and lowercase region codes
        const regionLower = tmdbConfig.region.toLowerCase();
        const regionUpper = tmdbConfig.region.toUpperCase();
        const regionData =
          response.results?.[regionLower] ||
          response.results?.[regionUpper] ||
          {};
        const providers: number[] = [];

        // Combine all provider types
        if (regionData.flatrate) {
          providers.push(
            ...regionData.flatrate.map(
              (p: { provider_id: number }) => p.provider_id
            )
          );
        }
        if (regionData.buy) {
          providers.push(
            ...regionData.buy.map((p: { provider_id: number }) => p.provider_id)
          );
        }
        if (regionData.rent) {
          providers.push(
            ...regionData.rent.map(
              (p: { provider_id: number }) => p.provider_id
            )
          );
        }

        return providers;
      } catch (error) {
        safeError(
          `[PopulatePool] Error fetching providers for ${tmdbId}`,
          error
        );
        return [];
      }
    };

    // Helper to fetch and process TMDB results
    const fetchAndProcess = async (
      url: string,
      queryParams: Record<string, unknown>,
      source: RecommendationPoolSource,
      explanationCode: string,
      type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv,
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
          let filtered = response.results.filter((result) => {
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

          // Filter by favorite genres if user has preferences
          if (favoriteGenres.length > 0) {
            filtered = filtered.filter((result) => {
              // Check if any of the result's genres match user's favorite genres
              return result.genre_ids.some((genreId: number) =>
                favoriteGenres.includes(genreId)
              );
            });
          }

          // Process filtered results
          for (const result of filtered) {
            if (entriesToInsert.length >= MAX_POOL_SIZE) break;
            if (processed.has(result.id)) continue;

            processed.add(result.id);

            // Filter by providers if user has preferences
            if (includedProviders.length > 0) {
              const titleProviders = await fetchWatchProviders(result.id, type);
              // Check if any of the title's providers match user's included providers
              const hasMatchingProvider = titleProviders.some((providerId) =>
                includedProviders.includes(providerId)
              );

              if (!hasMatchingProvider) {
                // Skip this title if it doesn't have any of the user's preferred providers
                devLog(
                  `[PopulatePool] Skipping ${result.id} (${type}) - no matching providers. Title has: [${titleProviders.join(', ')}], User wants: [${includedProviders.join(', ')}]`
                );
                continue;
              }
              devLog(
                `[PopulatePool] Including ${result.id} (${type}) - has matching provider`
              );
            }

            // Fetch full title details including complete genre objects
            const titleData = await fetchTitleDetails(result.id, type);

            entriesToInsert.push({
              tmdb_id: result.id,
              type,
              source,
              score: 0, // Initial score
              explanation_code: explanationCode,
              title_data: titleData,
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
        .from(TABLES.TITLES)
        .select(
          `${TITLES_FIELDS.TMDB_ID}, ${TITLES_FIELDS.TYPE}, ${TITLES_FIELDS.VOTE_AVERAGE}`
        )
        .in(
          TITLES_FIELDS.TMDB_ID,
          userLikedStatuses.map((s) => s.tmdb_id)
        )
        .not(TITLES_FIELDS.VOTE_AVERAGE, 'is', null)
        .order(TITLES_FIELDS.VOTE_AVERAGE, { ascending: false })
        .limit(2);

      if (likedTitlesData) {
        for (const likedTitle of likedTitlesData) {
          const recommendationPath =
            likedTitle.type === MediaTypeEnum.movie
              ? `/movie/${likedTitle.tmdb_id}/recommendations`
              : `/tv/${likedTitle.tmdb_id}/recommendations`;

          await fetchAndProcess(
            `${tmdbConfig.baseUrl}${recommendationPath}`,
            {},
            'based_on_like',
            'BASED_ON_LIKE',
            likedTitle.type as
              | typeof MediaTypeEnum.movie
              | typeof MediaTypeEnum.tv,
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
      MediaTypeEnum.movie,
      3
    );

    await fetchAndProcess(
      `${tmdbConfig.baseUrl}/trending/tv/week`,
      {},
      'trending',
      'TRENDING',
      MediaTypeEnum.tv,
      3
    );

    // 3. Fetch discover by genres (discover)
    // Use user's favorite genres if available, otherwise use top genres from liked titles
    let genresToUse: number[] = [];

    if (favoriteGenres.length > 0) {
      // Use user's favorite genres
      genresToUse = favoriteGenres.slice(0, 3);
      devLog('[PopulatePool] Using user favorite genres:', genresToUse);
    } else {
      // Fallback: Get user's top genres from liked titles
      const { data: likedTitlesForGenres } = await supabase
        .from(TABLES.TITLES)
        .select(TITLES_FIELDS.GENRES)
        .in(
          TITLES_FIELDS.TMDB_ID,
          userLikedStatuses?.map((s) => s.tmdb_id) || []
        )
        .not(TITLES_FIELDS.GENRES, 'is', null);

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

      genresToUse = Array.from(genreFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([genreId]) => genreId);

      devLog('[PopulatePool] Using top genres from liked titles:', genresToUse);
    }

    if (genresToUse.length > 0) {
      // Discover movies
      await fetchAndProcess(
        `${tmdbConfig.baseUrl}/discover/movie`,
        {
          with_genres: genresToUse.join(','),
          sort_by: 'popularity.desc',
        },
        'discover',
        'DISCOVER',
        MediaTypeEnum.movie,
        3
      );

      // Discover TV
      await fetchAndProcess(
        `${tmdbConfig.baseUrl}/discover/tv`,
        {
          with_genres: genresToUse.join(','),
          sort_by: 'popularity.desc',
        },
        'discover',
        'DISCOVER',
        MediaTypeEnum.tv,
        3
      );
    }

    // 4. Fetch easy to watch (comedy/animation) (easy)
    // Only if user doesn't have favorite genres, or if comedy/animation are in favorites
    const shouldFetchEasy =
      favoriteGenres.length === 0 ||
      favoriteGenres.some((g) => g === 35 || g === 16); // Comedy or Animation

    if (shouldFetchEasy) {
      await fetchAndProcess(
        `${tmdbConfig.baseUrl}/discover/movie`,
        {
          with_genres: '35,16', // Comedy, Animation
          sort_by: 'popularity.desc',
        },
        'easy',
        'EASY_TO_WATCH',
        MediaTypeEnum.movie,
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
        MediaTypeEnum.tv,
        2
      );
    }

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
