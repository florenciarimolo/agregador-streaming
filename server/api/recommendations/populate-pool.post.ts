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
    // IMPORTANT: language is in ISO/TMDB format (e.g., 'ca-ES', 'es-ES') from getUserTMDBParams
    // This ensures all data is stored consistently in ISO format - no legacy format fallbacks
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
    }> = [];

    // Helper to fetch full title details from database first, then TMDB if needed
    // This follows the same pattern as extractTitleDataWithFallback
    const fetchTitleDetails = async (
      tmdbId: number,
      type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv
    ): Promise<TitleData | null> => {
      try {
        // First, try to get title from database
        const { data: titleFromDb, error: dbError } = await supabase
          .from(TABLES.TITLES)
          .select('*')
          .eq(TITLES_FIELDS.TMDB_ID, tmdbId)
          .eq(TITLES_FIELDS.TYPE, type)
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
          genresFromDb = titleFromDb.genres as Array<{ id: number; name: string }> | null;
        }

        // Extract text in user's language (using ISO format - no fallbacks)
        // IMPORTANT: language is already in ISO format (e.g., 'ca-ES') from getUserTMDBParams
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

        // Check if we need to fetch from TMDB (missing in language or no DB entry)
        // IMPORTANT: Only use DB data if we have the exact language (ISO format), no fallbacks
        const hasExactLanguage = 
          titleJsonb && 
          typeof titleJsonb === 'object' && 
          titleJsonb[language] !== undefined;
        const needsTitleFallback = !extractedTitle || extractedTitle.trim() === '' || !hasExactLanguage;
        const needsOverviewFallback = !extractedOverview || extractedOverview.trim() === '';
        const needsGenres = !genresFromDb || genresFromDb.length === 0;
        const needsFullFetch = !titleFromDb || needsTitleFallback || needsOverviewFallback || needsGenres;

        // If we have everything from DB in the exact language (ISO format), we're done
        if (!needsFullFetch && genresFromDb && hasExactLanguage) {
          return; // Data is already in titles table, no need to fetch from TMDB
        }

        // Fetch from TMDB if needed
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

        if (!fullResponse) return;

        // Extract full genre objects (not just IDs)
        const genres = fullResponse.genres || [];

        // Use TMDB data - guaranteed to be in the correct language (ISO format)
        const titleText = fullResponse.title || fullResponse.name || '';
        
        if (!titleText) {
          devError(
            `[PopulatePool] No title returned from TMDB for ${tmdbId} in language ${language}`
          );
          return;
        }

        // Merge with existing DB data
        const mergedTitleJsonb: MultiLanguageText = { ...(titleJsonb || {}) };
        const mergedOverviewJsonb: MultiLanguageText = { ...(overviewJsonb || {}) };
        const mergedPosterPathJsonb: MultiLanguageText = { ...(posterPathJsonb || {}) };

        // Add TMDB data to the appropriate language key (ISO format - standard)
        // IMPORTANT: Always use ISO format (e.g., 'ca-ES'), no legacy format
        if (titleText) mergedTitleJsonb[language] = titleText;
        if (fullResponse.overview) mergedOverviewJsonb[language] = fullResponse.overview;
        if (fullResponse.poster_path) mergedPosterPathJsonb[language] = fullResponse.poster_path;

        // Extract final values - always use TMDB data when we fetch (guaranteed ISO format)
        // Only use extracted from DB if it's in the exact ISO format (no fallbacks)
        const finalTitle = titleText; // Always use TMDB title when we fetch (ISO format)
        let finalOverview = fullResponse.overview || '';
        const finalPosterPath = fullResponse.poster_path || null;

        // Determine primary language for region
        const primaryLanguage = region
          ? getPrimaryLanguageForRegion(region)
          : DEFAULT_LANGUAGE_ISO;
        const primaryLanguageKey = `${primaryLanguage}-${region?.toUpperCase() || 'ES'}`;

        // Check if we need to fetch primary language (title empty or overview empty)
        const needsPrimaryLanguage =
          !finalTitle ||
          !finalOverview ||
          finalOverview.trim() === '';
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

        // Use primary language title if final title is empty (should not happen, but safety check)
        if (!finalTitle && primaryResponse) {
          const primaryTitle = primaryResponse.title || primaryResponse.name || '';
          if (primaryTitle) {
            // Store primary language in ISO format
            mergedTitleJsonb[primaryLanguageKey] = primaryTitle;
            // Use primary title as final (but this should not happen if TMDB returned data)
            // This is a safety fallback only
          }
        }

        // Handle overview: if empty, use primary language overview (safety fallback)
        if ((!finalOverview || finalOverview.trim() === '') && primaryResponse?.overview) {
          finalOverview = primaryResponse.overview;
          // Store primary language in ISO format
          mergedOverviewJsonb[primaryLanguageKey] = primaryResponse.overview;
          if (import.meta.dev) {
            devLog(
              `[PopulatePool] Using primary language (${primaryLanguageKey}) overview for ${tmdbId}`
            );
          }
        }

        // Update database with TMDB data (preserve all existing languages)
        // IMPORTANT: All language keys are in ISO/TMDB format (e.g., 'ca-ES', 'es-ES')
        // No legacy format (e.g., 'ca') is stored - this ensures consistency
        try {
          // First, get existing data to ensure we preserve all languages
          const { data: existingTitle } = await supabase
            .from(TABLES.TITLES)
            .select(
              `${TITLES_FIELDS.TITLE}, ${TITLES_FIELDS.OVERVIEW}, ${TITLES_FIELDS.POSTER_PATH}, ${TITLES_FIELDS.GENRES}, ${TITLES_FIELDS.BACKDROP_PATH}, ${TITLES_FIELDS.VOTE_AVERAGE}, ${TITLES_FIELDS.RELEASE_DATE}, ${TITLES_FIELDS.FIRST_AIR_DATE}`
            )
            .eq(TITLES_FIELDS.TMDB_ID, tmdbId)
            .eq(TITLES_FIELDS.TYPE, type)
            .maybeSingle();

          // Merge with existing data to preserve all language keys
          const finalTitleJsonb: MultiLanguageText = existingTitle?.title
            ? { ...(existingTitle.title as MultiLanguageText), ...mergedTitleJsonb }
            : mergedTitleJsonb;
          const finalOverviewJsonb: MultiLanguageText = existingTitle?.overview
            ? { ...(existingTitle.overview as MultiLanguageText), ...mergedOverviewJsonb }
            : mergedOverviewJsonb;
          const finalPosterPathJsonb: MultiLanguageText = existingTitle?.poster_path
            ? { ...(existingTitle.poster_path as MultiLanguageText), ...mergedPosterPathJsonb }
            : mergedPosterPathJsonb;

          await supabase
            .from(TABLES.TITLES)
            .upsert({
              [TITLES_FIELDS.TMDB_ID]: tmdbId,
              [TITLES_FIELDS.TYPE]: type,
              [TITLES_FIELDS.TITLE]: finalTitleJsonb,
              [TITLES_FIELDS.OVERVIEW]: Object.keys(finalOverviewJsonb).length > 0 ? finalOverviewJsonb : null,
              [TITLES_FIELDS.POSTER_PATH]: Object.keys(finalPosterPathJsonb).length > 0 ? finalPosterPathJsonb : null,
              [TITLES_FIELDS.GENRES]: genres.length > 0 ? genres : (existingTitle?.genres || null),
              [TITLES_FIELDS.BACKDROP_PATH]: fullResponse.backdrop_path || existingTitle?.backdrop_path || null,
              [TITLES_FIELDS.VOTE_AVERAGE]: fullResponse.vote_average ?? existingTitle?.vote_average ?? null,
              [TITLES_FIELDS.RELEASE_DATE]: fullResponse.release_date || existingTitle?.release_date || null,
              [TITLES_FIELDS.FIRST_AIR_DATE]: fullResponse.first_air_date || existingTitle?.first_air_date || null,
            }, {
              onConflict: TITLES_FIELDS.TMDB_ID,
            });
        } catch (error) {
          // Log but don't fail the request
          if (import.meta.dev) {
            console.error('[PopulatePool] Error updating titles cache:', error);
          }
        }
      } catch (error) {
        safeError(
          `[PopulatePool] Error fetching title details for ${tmdbId}`,
          error
        );
        // Continue - don't block pool population
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

            // Fetch full title details to ensure they're in titles table
            // (title_data removed from pool, data comes from titles table)
            await fetchTitleDetails(result.id, type);

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
