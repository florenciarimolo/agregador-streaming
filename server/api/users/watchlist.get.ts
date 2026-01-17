import { createClient } from '@supabase/supabase-js';
import { getUserTMDBParams } from '@/server/utils/user-tmdb';
import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { devLog, devError, devWarn, safeError } from '@/server/utils/logger';
import { TITLE_STATUS } from '@/constants/domain/titleStatus';
import { TABLES } from '@/constants/db/tables';
import {
  USER_TITLE_STATUS_COLUMNS,
  TITLES_COLUMNS,
} from '@/constants/db/columns';
import { getTitleInLanguage, type MultiLanguageText } from '@/services/titles';
import {
  getTaglineInLanguage,
  getTitleOrOverviewInLanguage,
} from '@/composables/database/titles';
import { getTMDBConfig } from '@/server/utils/config';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { DEFAULT_REGION } from '@/constants/regions';

/**
 * Get user watchlist (watchlist status)
 * Returns titles with full TMDB details
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Use centralized function to get userId
  const userId = await getUserIdFromEvent(event);

  if (!userId) {
    devError('[User Watchlist] Unauthorized - no user found');
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
      '[User Watchlist] WARNING: Using anon key instead of service role key. RLS policies may block queries.'
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
    // Fetch user title statuses with watchlist status (include type)
    const { data: statuses, error: statusError } = await supabase
      .from(TABLES.USER_TITLE_STATUS)
      .select(
        `${USER_TITLE_STATUS_COLUMNS.TMDB_ID}, ${USER_TITLE_STATUS_COLUMNS.TYPE}, ${USER_TITLE_STATUS_COLUMNS.CREATED_AT}`
      )
      .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
      .eq(USER_TITLE_STATUS_COLUMNS.STATUS, TITLE_STATUS.WATCHLIST)
      .order(USER_TITLE_STATUS_COLUMNS.CREATED_AT, { ascending: false });

    if (statusError) {
      safeError(
        '[User Watchlist] Error fetching user title statuses',
        statusError,
        {
          userId,
          supabaseUrl: config.public.supabaseUrl,
        }
      );
      throw createError({
        statusCode: 500,
        message: 'Error al obtener la lista para ver',
      });
    }

    devLog('[User Watchlist] Statuses count:', statuses?.length || 0);

    if (!statuses || statuses.length === 0) {
      devLog('[User Watchlist] No watchlist statuses found for user');
      return {
        watchlist: [],
      };
    }

    // Get user preferences for language and region
    const { language, region } = await getUserTMDBParams(event);

    if (import.meta.dev) {
      devLog('[User Watchlist] Using TMDB params:', { language, region });
    }

    // Extract tmdb_ids and create a map of tmdb_id to type and created_at
    const tmdbIds: number[] = statuses.map((s) => s.tmdb_id);
    const titleTypesMap = new Map<
      number,
      typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV
    >(
      statuses.map((s) => [
        s.tmdb_id,
        s.type as typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV,
      ])
    );
    const createdAtMap = new Map<number, string>(
      statuses.map((s) => [s.tmdb_id, s.created_at])
    );

    // Fetch titles from database
    const { data: titlesData, error: titlesError } = await supabase
      .from(TABLES.TITLES)
      .select(
        `${TITLES_COLUMNS.ID}, ${TITLES_COLUMNS.TITLE}, ${TITLES_COLUMNS.TYPE}, ${TITLES_COLUMNS.POSTER_PATH}, ${TITLES_COLUMNS.TMDB_ID}, ${TITLES_COLUMNS.OVERVIEW}, ${TITLES_COLUMNS.GENRES}`
      )
      .in(TITLES_COLUMNS.TMDB_ID, tmdbIds);

    if (titlesError) {
      safeError(
        '[User Watchlist] Error fetching titles from database',
        titlesError,
        {
          userId,
          tmdbIds,
        }
      );
      throw createError({
        statusCode: 500,
        message: 'Error al obtener los títulos',
      });
    }

    if (!titlesData || titlesData.length === 0) {
      devLog('[User Watchlist] No titles found in database');
      return {
        watchlist: [],
      };
    }

    // Fetch missing titles from TMDB if needed
    const foundTmdbIds = new Set<number>(titlesData.map((t) => t.tmdb_id));
    const missingTmdbIds: number[] = tmdbIds.filter(
      (id: number) => !foundTmdbIds.has(id)
    );

    // Get TMDB config for all API calls (used in tagline and provider fetching)
    const tmdbConfig = getTMDBConfig(language, region);

    if (missingTmdbIds.length > 0) {
      devLog(
        '[User Watchlist] Missing titles, fetching from TMDB:',
        missingTmdbIds
      );
      const fetchPromises = missingTmdbIds.map(async (tmdbId: number) => {
        const type = titleTypesMap.get(tmdbId);
        if (!type) return null;

        try {
          const endpoint = type === 'movie' ? MEDIA_TYPE.MOVIE : MEDIA_TYPE.TV;
          await $fetch(`${tmdbConfig.baseUrl}/${endpoint}/${tmdbId}`, {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              region: tmdbConfig.region,
            },
          });
          // The TMDB endpoint will insert into database
          return tmdbId;
        } catch (err) {
          safeError(
            `[User Watchlist] Error fetching title ${tmdbId} from TMDB`,
            err
          );
          return null;
        }
      });

      await Promise.all(fetchPromises);

      // Reload titles from database
      const { data: reloadedData } = await supabase
        .from(TABLES.TITLES)
        .select(
          `${TITLES_COLUMNS.ID}, ${TITLES_COLUMNS.TITLE}, ${TITLES_COLUMNS.TYPE}, ${TITLES_COLUMNS.POSTER_PATH}, ${TITLES_COLUMNS.TMDB_ID}, ${TITLES_COLUMNS.OVERVIEW}, ${TITLES_COLUMNS.TAGLINE}, ${TITLES_COLUMNS.VOTE_AVERAGE}, ${TITLES_COLUMNS.GENRES}`
        )
        .in(TITLES_COLUMNS.TMDB_ID, tmdbIds);

      if (reloadedData) {
        titlesData.length = 0;
        titlesData.push(...reloadedData);
      }
    }

    // Extract titles with alphabet detection and fetch providers
    const watchlist = await Promise.all(
      titlesData.map(
        async (title: {
          id: unknown;
          title: unknown;
          type: string;
          poster_path: unknown;
          tmdb_id: number;
          overview: unknown;
          genres: unknown;
          tagline?: unknown;
          vote_average?: number | null;
        }) => {
          const titleJsonb = title.title as MultiLanguageText;
          const posterPathJsonb = title.poster_path as MultiLanguageText | null;
          const overviewJsonb = title.overview as MultiLanguageText | null;
          const taglineJsonb = title.tagline as MultiLanguageText | null;

          // Use getTitleOrOverviewInLanguage for title and overview to follow specific fallback logic
          const extractedTitle = getTitleOrOverviewInLanguage(
            titleJsonb,
            language,
            region
          );
          const extractedPosterPath = getTitleInLanguage(
            posterPathJsonb,
            language,
            region,
            true // isImagePath = true
          );
          const extractedOverview = getTitleOrOverviewInLanguage(
            overviewJsonb,
            language,
            region
          );
          let extractedTagline = getTaglineInLanguage(
            taglineJsonb,
            language,
            region
          );

          // If tagline is empty, try to fetch it from TMDB with fallback
          if (!extractedTagline || extractedTagline.trim() === '') {
            try {
              const endpoint =
                title.type === MEDIA_TYPE.MOVIE
                  ? `/movie/${title.tmdb_id}`
                  : `/tv/${title.tmdb_id}`;
              const { fetchTaglineWithPrimaryLanguageFallback } =
                await import('@/server/utils/title-extraction');
              const mergedTaglineJsonb: MultiLanguageText = {
                ...(taglineJsonb || {}),
              };

              // First try to get tagline in requested language from TMDB
              const tmdbResponse = await $fetch<{
                tagline?: string;
              }>(`${tmdbConfig.baseUrl}${endpoint}`, {
                query: {
                  api_key: tmdbConfig.apiKey,
                  language: tmdbConfig.language,
                  region: tmdbConfig.region,
                },
              }).catch(() => null);

              let fetchedTagline = tmdbResponse?.tagline || '';

              // If tagline in requested language is empty, try primary language fallback
              if (!fetchedTagline || fetchedTagline.trim() === '') {
                fetchedTagline = await fetchTaglineWithPrimaryLanguageFallback(
                  '',
                  title.tmdb_id,
                  title.type as typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV,
                  language,
                  region,
                  endpoint,
                  mergedTaglineJsonb,
                  supabase
                );
              } else {
                // If we got tagline in requested language, add it to mergedTaglineJsonb
                mergedTaglineJsonb[language] = fetchedTagline;
              }

              if (fetchedTagline && fetchedTagline.trim() !== '') {
                extractedTagline = fetchedTagline;

                // Save tagline to database
                // fetchTaglineWithPrimaryLanguageFallback already saves when fetching from primary language
                // but we need to save when fetching from requested language
                if (
                  tmdbResponse?.tagline &&
                  tmdbResponse.tagline.trim() !== ''
                ) {
                  try {
                    await supabase
                      .from(TABLES.TITLES)
                      .update({
                        tagline: mergedTaglineJsonb,
                      })
                      .eq(TITLES_COLUMNS.TMDB_ID, title.tmdb_id)
                      .eq(TITLES_COLUMNS.TYPE, title.type);
                    // Success - tagline saved
                  } catch (error: unknown) {
                    // Log but don't fail the request
                    const { logError } = await import('@/server/utils/logger');
                    logError(
                      '[Watchlist] Error saving tagline to database',
                      error as Error,
                      {
                        tmdbId: title.tmdb_id,
                      }
                    );
                  }
                }
              }
            } catch (error) {
              // Silently fail - tagline is optional
              const { logError } = await import('@/server/utils/logger');
              logError('[Watchlist] Error fetching tagline', error as Error, {
                tmdbId: title.tmdb_id,
              });
            }
          }

          // Fetch providers from TMDB
          let providers: Array<{
            provider_id: number;
            provider_name: string;
            logo_path: string | null;
          }> = [];
          try {
            const providerPath =
              title.type === MEDIA_TYPE.MOVIE
                ? `/movie/${title.tmdb_id}/watch/providers`
                : `/tv/${title.tmdb_id}/watch/providers`;

            // Log region being used
            // Ensure region is valid (non-empty string), fallback to default
            const regionUpper =
              region && region.trim()
                ? region.toUpperCase().trim()
                : DEFAULT_REGION;

            if (import.meta.dev) {
              devLog(
                `[User Watchlist] Fetching providers for ${title.tmdb_id} (${title.type}) using region: ${regionUpper} (original: ${region || 'null/undefined'})`
              );
            }

            const providerResponse = await $fetch<{
              results?: {
                [key: string]: {
                  flatrate?: Array<{
                    provider_id: number;
                    provider_name: string;
                    logo_path: string | null;
                  }>;
                  buy?: Array<{
                    provider_id: number;
                    provider_name: string;
                    logo_path: string | null;
                  }>;
                  rent?: Array<{
                    provider_id: number;
                    provider_name: string;
                    logo_path: string | null;
                  }>;
                };
              };
            }>(`${tmdbConfig.baseUrl}${providerPath}`, {
              query: {
                api_key: tmdbConfig.apiKey,
              },
            });

            // Use user's region for providers, fallback to default
            // IMPORTANT: Only use flatrate providers (streaming services)
            // Try both uppercase and lowercase region codes (TMDB uses uppercase)
            const regionLower =
              region && region.trim()
                ? region.toLowerCase().trim()
                : DEFAULT_REGION.toLowerCase();
            const defaultRegionLower = DEFAULT_REGION.toLowerCase();

            const regionProviders =
              providerResponse.results?.[regionUpper] ||
              providerResponse.results?.[regionLower] ||
              providerResponse.results?.[DEFAULT_REGION] ||
              providerResponse.results?.[defaultRegionLower];

            if (import.meta.dev) {
              devLog(
                `[User Watchlist] Provider response for ${title.tmdb_id}:`,
                {
                  hasResults: !!providerResponse.results,
                  availableRegions: providerResponse.results
                    ? Object.keys(providerResponse.results)
                    : [],
                  regionUpper,
                  regionLower,
                  hasRegionProviders: !!regionProviders,
                  regionProvidersKeys: regionProviders
                    ? Object.keys(regionProviders)
                    : [],
                  hasFlatrate: !!regionProviders?.flatrate,
                  flatrateCount: regionProviders?.flatrate?.length || 0,
                  fullResponse: providerResponse.results
                    ? JSON.stringify(providerResponse.results, null, 2)
                    : 'no results',
                }
              );
            }

            if (regionProviders && regionProviders.flatrate) {
              providers = (regionProviders.flatrate || []).slice(0, 5);

              // Log for debugging
              if (import.meta.dev && providers.length > 0) {
                devLog(
                  `[User Watchlist] Found ${providers.length} providers for ${title.tmdb_id} in region ${regionUpper}:`,
                  providers.map((p) => ({
                    id: p.provider_id,
                    name: p.provider_name,
                    logo: p.logo_path,
                  }))
                );
              } else if (import.meta.dev) {
                devLog(
                  `[User Watchlist] Region ${regionUpper} found but no flatrate providers for ${title.tmdb_id}`
                );
              }
            } else {
              if (import.meta.dev) {
                devLog(
                  `[User Watchlist] No providers found for ${title.tmdb_id} in region ${regionUpper}. Available regions:`,
                  providerResponse.results
                    ? Object.keys(providerResponse.results)
                    : 'none'
                );
              }
            }
          } catch (error) {
            // Don't fail if providers can't be fetched
            if (import.meta.dev) {
              devError(
                `[User Watchlist] Error fetching providers for ${title.tmdb_id}:`,
                error
              );
            }
          }

          // Log providers for debugging (only in dev)
          if (import.meta.dev && providers.length > 0) {
            devLog(
              `[User Watchlist] Providers for ${title.tmdb_id}:`,
              providers.map((p) => p.provider_name)
            );
          }

          return {
            tmdb_id: title.tmdb_id,
            title: extractedTitle || '',
            type: title.type,
            poster_path: extractedPosterPath || null,
            overview: extractedOverview || null,
            tagline: extractedTagline || null,
            vote_average: title.vote_average || null,
            providers,
            created_at:
              createdAtMap.get(title.tmdb_id) || new Date().toISOString(),
          };
        }
      )
    );

    return {
      watchlist,
    };
  } catch (error: unknown) {
    // Log the full error for debugging
    safeError(
      '[User Watchlist] Unexpected error in watchlist endpoint',
      error,
      {
        userId,
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      }
    );

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Error al obtener la lista para ver';
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
