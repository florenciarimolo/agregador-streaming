/**
 * Get user following list
 * Returns TV series the user is following with full TMDB details
 */

import { createClient } from '@supabase/supabase-js';
import { getUserTMDBParams } from '@/server/utils/user-tmdb';
import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { devLog, devError, devWarn, safeError } from '@/server/utils/logger';
import { TABLES } from '@/constants/db/tables';
import {
  USER_TITLE_FOLLOWING_COLUMNS,
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

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const userId = await getUserIdFromEvent(event);

  if (!userId) {
    devError('[User Following] Unauthorized - no user found');
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    devWarn(
      '[User Following] WARNING: Using anon key instead of service role key. RLS policies may block queries.'
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
    // Fetch user following records
    const { data: followingRecords, error: followingError } = await supabase
      .from(TABLES.USER_TITLE_FOLLOWING)
      .select(
        `${USER_TITLE_FOLLOWING_COLUMNS.TMDB_ID}, ${USER_TITLE_FOLLOWING_COLUMNS.TYPE}, ${USER_TITLE_FOLLOWING_COLUMNS.CREATED_AT}`
      )
      .eq(USER_TITLE_FOLLOWING_COLUMNS.USER_ID, userId)
      .order(USER_TITLE_FOLLOWING_COLUMNS.CREATED_AT, { ascending: false });

    if (followingError) {
      safeError(
        '[User Following] Error fetching following records',
        followingError,
        {
          userId,
          supabaseUrl: config.public.supabaseUrl,
        }
      );
      throw createError({
        statusCode: 500,
        message: 'Error al obtener las series seguidas',
      });
    }

    devLog('[User Following] Following count:', followingRecords?.length || 0);

    if (!followingRecords || followingRecords.length === 0) {
      devLog('[User Following] No following records found for user');
      return {
        following: [],
      };
    }

    // Get user preferences for language and region
    const { language, region } = await getUserTMDBParams(event);

    if (import.meta.dev) {
      devLog('[User Following] Using TMDB params:', { language, region });
    }

    // Extract tmdb_ids and create maps
    const tmdbIds: number[] = followingRecords.map((r) => r.tmdb_id);
    const titleTypesMap = new Map<
      number,
      typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV
    >(
      followingRecords.map((r) => [
        r.tmdb_id,
        r.type as typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV,
      ])
    );
    const createdAtMap = new Map<number, string>(
      followingRecords.map((r) => [r.tmdb_id, r.created_at])
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
        '[User Following] Error fetching titles from database',
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
      devLog('[User Following] No titles found in database');
      return {
        following: [],
      };
    }

    // Fetch missing titles from TMDB if needed
    const foundTmdbIds = new Set<number>(titlesData.map((t) => t.tmdb_id));
    const missingTmdbIds: number[] = tmdbIds.filter(
      (id: number) => !foundTmdbIds.has(id)
    );

    const tmdbConfig = getTMDBConfig(language, region);

    if (missingTmdbIds.length > 0) {
      devLog(
        '[User Following] Missing titles, fetching from TMDB:',
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
          return tmdbId;
        } catch (err) {
          safeError(
            `[User Following] Error fetching title ${tmdbId} from TMDB`,
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
    const following = await Promise.all(
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

          const extractedTitle = getTitleOrOverviewInLanguage(
            titleJsonb,
            language,
            region
          );
          const extractedPosterPath = getTitleInLanguage(
            posterPathJsonb,
            language,
            region,
            true
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

          // Fetch tagline if missing (similar to watchlist)
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
                mergedTaglineJsonb[language] = fetchedTagline;
              }

              if (fetchedTagline && fetchedTagline.trim() !== '') {
                extractedTagline = fetchedTagline;

                if (tmdbResponse?.tagline && tmdbResponse.tagline.trim() !== '') {
                  try {
                    await supabase
                      .from(TABLES.TITLES)
                      .update({
                        tagline: mergedTaglineJsonb,
                      })
                      .eq(TITLES_COLUMNS.TMDB_ID, title.tmdb_id)
                      .eq(TITLES_COLUMNS.TYPE, title.type);
                  } catch (error: unknown) {
                    const { logError } = await import('@/server/utils/logger');
                    logError(
                      '[Following] Error saving tagline to database',
                      error as Error,
                      {
                        tmdbId: title.tmdb_id,
                      }
                    );
                  }
                }
              }
            } catch (error) {
              const { logError } = await import('@/server/utils/logger');
              logError('[Following] Error fetching tagline', error as Error, {
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

            const regionUpper =
              region && region.trim()
                ? region.toUpperCase().trim()
                : DEFAULT_REGION;
            const regionLower =
              region && region.trim()
                ? region.toLowerCase().trim()
                : DEFAULT_REGION.toLowerCase();
            const defaultRegionLower = DEFAULT_REGION.toLowerCase();

            const providerResponse = await $fetch<{
              results?: {
                [key: string]: {
                  flatrate?: Array<{
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

            const regionProviders =
              providerResponse.results?.[regionUpper] ||
              providerResponse.results?.[regionLower] ||
              providerResponse.results?.[DEFAULT_REGION] ||
              providerResponse.results?.[defaultRegionLower];

            if (regionProviders && regionProviders.flatrate) {
              providers = (regionProviders.flatrate || []).slice(0, 5);
            }
          } catch {
            // Don't fail if providers can't be fetched
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
      following,
    };
  } catch (error: unknown) {
    safeError(
      '[User Following] Unexpected error in following endpoint',
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
        : 'Error al obtener las series seguidas';
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
