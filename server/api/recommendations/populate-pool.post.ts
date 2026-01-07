import { createClient } from '@supabase/supabase-js';
import { getTMDBConfig } from '@/server/utils/config';
import { getUserTMDBParams, getUserIdFromEvent } from '@/server/utils/user-preferences';
import { devLog, devError, safeError } from '@/server/utils/logger';
import {
  getPoolCount,
  deleteLowestScoreEntries,
  deleteAllPoolEntries,
  insertPoolEntries,
  type RecommendationPoolSource,
  type TitleData,
} from '@/services/recommendationPool';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { TITLE_STATUS } from '@/constants/domain/titleStatus';
import { DEFAULT_LANGUAGE_ISO } from '@/constants/languages';
import type {
  TMDBResponse,
  TMDBTitleDetails,
} from '@/types/tmdb/Responses';
import { TABLES } from '@/constants/db/tables';
import { TITLES_COLUMNS, USER_TITLE_STATUS_COLUMNS } from '@/constants/db/columns';
import {
  getTitleInLanguage,
  type MultiLanguageText,
} from '@/services/titles';
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
  // Use centralized function to get userId
  const userId = await getUserIdFromEvent(event);

  if (!userId) {
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

    /**
     * clearPool=true debe usarse SOLO cuando:
     * - El usuario cambia su región (define nuevo universo TMDB)
     * - Onboarding inicial cuando no existe pool
     * 
     * NO usar para:
     * - Cambio de idioma (solo cambia lectura de JSONB)
     * - Cambios de géneros o plataformas (solo filtran en runtime)
     * - Likes/dislikes (solo ajustan preference_score incrementalmente)
     * 
     * IMPORTANTE: populate-pool define el UNIVERSO de contenido disponible.
     * NUNCA filtra por preferencias de usuario (géneros/providers).
     * Los filtros se aplican SOLO en runtime en recommendations/index.get.ts
     */
    // Check if we should clear the entire pool (e.g., when region changes)
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
        `${USER_TITLE_STATUS_COLUMNS.TMDB_ID}, ${USER_TITLE_STATUS_COLUMNS.TYPE}, ${USER_TITLE_STATUS_COLUMNS.STATUS}, ${USER_TITLE_STATUS_COLUMNS.LIKED}`
      )
      .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId);

    const excludedTmdbIds = new Set<number>();
    const likedTmdbIds = new Set<number>();
    const userLikedStatuses: Array<{ tmdb_id: number; type: string }> = [];

    if (allUserStatuses) {
      allUserStatuses.forEach((status) => {
        // Build excluded set (seen + not_interested)
        if (
          status.status === TITLE_STATUS.SEEN ||
          status.status === TITLE_STATUS.NOT_INTERESTED
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
      type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
      source: RecommendationPoolSource;
      score: number;
      explanation_code: string | null;
    }> = [];

    // Helper to fetch full title details from database first, then TMDB if needed
    // This follows the same pattern as extractTitleDataWithFallback
    const fetchTitleDetails = async (
      tmdbId: number,
      type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV
    ): Promise<TitleData | null> => {
      try {
        // First, try to get title from database
        const { data: titleFromDb, error: dbError } = await supabase
          .from(TABLES.TITLES)
          .select('*')
          .eq(TITLES_COLUMNS.TMDB_ID, tmdbId)
          .eq(TITLES_COLUMNS.TYPE, type)
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
          type === MEDIA_TYPE.MOVIE ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
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
              `${TITLES_COLUMNS.TITLE}, ${TITLES_COLUMNS.OVERVIEW}, ${TITLES_COLUMNS.POSTER_PATH}, ${TITLES_COLUMNS.GENRES}, ${TITLES_COLUMNS.BACKDROP_PATH}, ${TITLES_COLUMNS.VOTE_AVERAGE}, ${TITLES_COLUMNS.RELEASE_DATE}, ${TITLES_COLUMNS.FIRST_AIR_DATE}`
            )
            .eq(TITLES_COLUMNS.TMDB_ID, tmdbId)
            .eq(TITLES_COLUMNS.TYPE, type)
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
              [TITLES_COLUMNS.TMDB_ID]: tmdbId,
              [TITLES_COLUMNS.TYPE]: type,
              [TITLES_COLUMNS.TITLE]: finalTitleJsonb,
              [TITLES_COLUMNS.OVERVIEW]: Object.keys(finalOverviewJsonb).length > 0 ? finalOverviewJsonb : null,
              [TITLES_COLUMNS.POSTER_PATH]: Object.keys(finalPosterPathJsonb).length > 0 ? finalPosterPathJsonb : null,
              [TITLES_COLUMNS.GENRES]: genres.length > 0 ? genres : (existingTitle?.genres || null),
              [TITLES_COLUMNS.BACKDROP_PATH]: fullResponse.backdrop_path || existingTitle?.backdrop_path || null,
              [TITLES_COLUMNS.VOTE_AVERAGE]: fullResponse.vote_average ?? existingTitle?.vote_average ?? null,
              [TITLES_COLUMNS.RELEASE_DATE]: fullResponse.release_date || existingTitle?.release_date || null,
              [TITLES_COLUMNS.FIRST_AIR_DATE]: fullResponse.first_air_date || existingTitle?.first_air_date || null,
              [TITLES_COLUMNS.STATUS]: fullResponse.status || existingTitle?.status || null,
            }, {
              onConflict: TITLES_COLUMNS.TMDB_ID,
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


    // Helper to fetch and process TMDB results
    const fetchAndProcess = async (
      url: string,
      queryParams: Record<string, unknown>,
      source: RecommendationPoolSource,
      explanationCode: string,
      type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV,
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
          // IMPORTANT: NO filtrar por géneros ni providers aquí
          // populate-pool define el UNIVERSO, los filtros se aplican en runtime
          const filtered = response.results.filter((result) => {
            if (processed.has(result.id)) return false;
            if (excludedTmdbIds.has(result.id)) return false;
            if (likedTmdbIds.has(result.id)) return false;

            const meetsQuality =
              result.vote_average >= MIN_VOTE_AVERAGE_POOL &&
              (type === MEDIA_TYPE.MOVIE
                ? result.vote_count >= MIN_VOTE_COUNT_MOVIE
                : result.vote_count >= MIN_VOTE_COUNT_TV);

            return meetsQuality;
          });

          // Process filtered results
          for (const result of filtered) {
            if (entriesToInsert.length >= MAX_POOL_SIZE) break;
            if (processed.has(result.id)) continue;

            processed.add(result.id);

            // Fetch full title details to ensure they're in titles table
            // (title_data removed from pool, data comes from titles table)
            await fetchTitleDetails(result.id, type);

            // Calculate base_score from popularity/rating
            // Normalize vote_average (0-10) to a score (0-50)
            const baseScore = result.vote_average
              ? (result.vote_average / 10) * 50
              : 25; // Default if no rating

            entriesToInsert.push({
              tmdb_id: result.id,
              type,
              source,
              base_score: baseScore,
              preference_score: 0,
              score: baseScore, // base_score + preference_score (0)
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
          `${TITLES_COLUMNS.TMDB_ID}, ${TITLES_COLUMNS.TYPE}, ${TITLES_COLUMNS.VOTE_AVERAGE}`
        )
        .in(
          TITLES_COLUMNS.TMDB_ID,
          userLikedStatuses.map((s) => s.tmdb_id)
        )
        .not(TITLES_COLUMNS.VOTE_AVERAGE, 'is', null)
        .order(TITLES_COLUMNS.VOTE_AVERAGE, { ascending: false })
        .limit(2);

      if (likedTitlesData) {
        for (const likedTitle of likedTitlesData) {
          const recommendationPath =
            likedTitle.type === MEDIA_TYPE.MOVIE
              ? `/movie/${likedTitle.tmdb_id}/recommendations`
              : `/tv/${likedTitle.tmdb_id}/recommendations`;

          await fetchAndProcess(
            `${tmdbConfig.baseUrl}${recommendationPath}`,
            {},
            'based_on_like',
            'BASED_ON_LIKE',
            likedTitle.type as
              | typeof MEDIA_TYPE.MOVIE
              | typeof MEDIA_TYPE.TV,
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
      MEDIA_TYPE.MOVIE,
      3
    );

    await fetchAndProcess(
      `${tmdbConfig.baseUrl}/trending/tv/week`,
      {},
      'trending',
      'TRENDING',
      MEDIA_TYPE.TV,
      3
    );

    // 3. Fetch discover by popular genres (discover)
    // IMPORTANT: NO usar géneros del usuario aquí
    // Usar géneros populares para diversidad, o géneros de títulos liked si existen
    let genresToUse: number[] = [];

    // Get user's top genres from liked titles for diversity
    if (userLikedStatuses && userLikedStatuses.length > 0) {
      const { data: likedTitlesForGenres } = await supabase
        .from(TABLES.TITLES)
        .select(TITLES_COLUMNS.GENRES)
        .in(
          TITLES_COLUMNS.TMDB_ID,
          userLikedStatuses.map((s) => s.tmdb_id)
        )
        .not(TITLES_COLUMNS.GENRES, 'is', null);

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

      devLog('[PopulatePool] Using top genres from liked titles for diversity:', genresToUse);
    }

    // If no liked titles, use popular genres for diversity
    if (genresToUse.length === 0) {
      // Popular genres: Action, Drama, Comedy
      genresToUse = [28, 18, 35];
      devLog('[PopulatePool] Using default popular genres for diversity:', genresToUse);
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
        MEDIA_TYPE.MOVIE,
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
        MEDIA_TYPE.TV,
        3
      );
    }

    // 4. Fetch easy to watch (comedy/animation) (easy)
    // Always fetch for diversity, regardless of user preferences
    {
      await fetchAndProcess(
        `${tmdbConfig.baseUrl}/discover/movie`,
        {
          with_genres: '35,16', // Comedy, Animation
          sort_by: 'popularity.desc',
        },
        'easy',
        'EASY_TO_WATCH',
        MEDIA_TYPE.MOVIE,
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
        MEDIA_TYPE.TV,
        2
      );
    }

    // Insert entries into pool
    // IMPORTANT: base_score and preference_score are set above
    // score = base_score + preference_score (where preference_score = 0 initially)
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
