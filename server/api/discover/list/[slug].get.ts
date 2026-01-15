/**
 * GET /api/discover/list/[slug]
 * Public endpoint to get a discover list with its items
 * CRITICAL: Does NOT use recommendation_pool, source, or explanation_code
 * Only uses discover_lists, discover_list_items, and titles (join)
 */

import { getRouterParams, getQuery, getRequestHeader } from 'h3';
import {
  getDiscoverListBySlug,
  getDiscoverListItems,
} from '@/composables/database/discoverLists';
import { DEFAULT_LANGUAGE, DEFAULT_LANGUAGE_ISO, toTMDBLanguageCode } from '@/constants/languages';
import { createServerSupabaseClient } from '@/server/utils/supabase';
import { TABLES } from '@/constants/db/tables';
import { TITLES_COLUMNS } from '@/constants/db/columns';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import type { MultiLanguageText } from '@/composables/database/titles';
import { extractLangFromPath } from '@/composables/useRouteWithLang';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();

    // Create Supabase client for server-side operations
    const supabase = createServerSupabaseClient(config);

    const params = getRouterParams(event);
    const { slug } = params as { slug: string };

    if (!slug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Slug is required',
      });
    }

    // Get language from URL (route.params.lang), Referer header, or query parameter, then default
    const query = getQuery(event);
    let language = DEFAULT_LANGUAGE;
    let urlLangCode: string | null = null;

    // Priority 1: URL parameter (route.params.lang) - deterministic source of truth
    let langFromUrl = params.lang as string | undefined;

    // Priority 2: Extract from Referer header if not in params (for API routes without :lang)
    if (!langFromUrl) {
      try {
        const referer = getRequestHeader(event, 'referer');
        if (referer) {
          try {
            const refererUrl = new URL(referer);
            const extractedLang = extractLangFromPath(refererUrl.pathname);
            if (extractedLang) {
              langFromUrl = extractedLang;
            }
          } catch {
            // If URL parsing fails, try direct path extraction
            const extractedLang = extractLangFromPath(referer);
            if (extractedLang) {
              langFromUrl = extractedLang;
            }
          }
        }
      } catch {
        // If referer extraction fails, continue to next priority
      }
    }

    if (langFromUrl) {
      const normalizedLang = langFromUrl.toLowerCase();
      urlLangCode = normalizedLang;
      const { getI18nCodeFromUrlCode } =
        await import('@/composables/useLangFromUrl');
      const i18nCode = getI18nCodeFromUrlCode(normalizedLang);
      if (i18nCode) {
        language = toTMDBLanguageCode(i18nCode);
      }
    }
    // Priority 3: Query parameter (fallback for API calls without Referer)
    else if (query.language && typeof query.language === 'string') {
      language = toTMDBLanguageCode(query.language);
      // Try to get URL code from query parameter first (if passed by client)
      if (query.urlLang && typeof query.urlLang === 'string') {
        urlLangCode = query.urlLang.toLowerCase();
      } else {
        // Fallback: Try to extract URL code from i18n code for tag extraction
        const { getUrlCodeFromI18nCode } =
          await import('@/composables/useLangFromUrl');
        urlLangCode = getUrlCodeFromI18nCode(query.language) || null;
      }
    }
    // Priority 4: Default (no cookies - language comes from URL only)

    // Get list by slug
    const { data: list, error: listError } = await getDiscoverListBySlug(
      slug,
      language,
      supabase
    );

    if (listError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Error fetching discover list',
        data: listError,
      });
    }

    if (!list) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Discover list not found',
      });
    }

    // Get list items with title data
    // CRITICAL: No region - Discover is 100% stable
    // Pass urlLangCode to extract tag in correct language
    const { data: items, error: itemsError } = await getDiscoverListItems(
      list.id,
      language,
      urlLangCode,
      supabase
    );

    if (itemsError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Error fetching discover list items',
        data: itemsError,
      });
    }

    // Fetch providers for each item
    // Get user region for providers (fallback to ES)
    const { getUserTMDBParams } = await import('@/server/utils/user-tmdb');
    const { region } = await getUserTMDBParams(event);
    const { getTMDBConfig } = await import('@/server/utils/config');
    const tmdbConfig = getTMDBConfig(language, region || 'ES');

    const itemsWithProviders = await Promise.all(
      (items || []).map(async (item) => {
        // Fetch providers from TMDB
        let providers: Array<{
          provider_id: number;
          provider_name: string;
          logo_path: string | null;
        }> = [];
        try {
          const providerPath =
            item.type === 'movie'
              ? `/movie/${item.tmdb_id}/watch/providers`
              : `/tv/${item.tmdb_id}/watch/providers`;
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

          // Use user's region for providers, fallback to ES
          // IMPORTANT: Only use flatrate providers (streaming services)
          const regionProviders =
            providerResponse.results?.[region || 'ES'] ||
            providerResponse.results?.ES;
          if (regionProviders) {
            providers = (regionProviders.flatrate || []).slice(0, 5);
          }
        } catch (error) {
          // Don't fail if providers can't be fetched
          if (process.env.NODE_ENV === 'development') {
            console.error(
              `Error fetching providers for ${item.tmdb_id}:`,
              error
            );
          }
        }

        // If overview is empty, fetch from TMDB as fallback (same logic as detail page)
        let overview = item.overview;
        if (!overview || overview.trim() === '') {
          try {
            const endpoint = item.type === 'movie' ? 'movies' : 'tvshows';
            // Use urlLangCode if available, otherwise extract from language
            const langParam =
              urlLangCode || language.split('-')[0]?.toLowerCase() || DEFAULT_LANGUAGE_ISO;
            const tmdbResponse = await $fetch<{
              overview?: string;
            }>(`/api/tmdb/${endpoint}/${item.tmdb_id}`, {
              query: {
                lang: langParam,
              },
            });
            if (tmdbResponse?.overview && tmdbResponse.overview.trim() !== '') {
              overview = tmdbResponse.overview;

              // Save overview to database in the correct language
              // Get current overview JSONB from database
              const { data: titleFromDb } = await supabase
                .from(TABLES.TITLES)
                .select(TITLES_COLUMNS.OVERVIEW)
                .eq(TITLES_COLUMNS.TMDB_ID, item.tmdb_id)
                .eq(
                  TITLES_COLUMNS.TYPE,
                  item.type === 'movie' ? MEDIA_TYPE.MOVIE : MEDIA_TYPE.TV
                )
                .maybeSingle();

              const overviewJsonb =
                (titleFromDb?.overview as MultiLanguageText | null) || {};
              const updatedOverview: MultiLanguageText = {
                ...overviewJsonb,
                [language]: overview, // Save in ISO format (e.g., 'es-ES')
              };

              // Update database with new overview
              await supabase
                .from(TABLES.TITLES)
                .update({
                  [TITLES_COLUMNS.OVERVIEW]: updatedOverview,
                })
                .eq(TITLES_COLUMNS.TMDB_ID, item.tmdb_id)
                .eq(
                  TITLES_COLUMNS.TYPE,
                  item.type === 'movie' ? MEDIA_TYPE.MOVIE : MEDIA_TYPE.TV
                );
            }
          } catch (error) {
            // Don't fail if overview can't be fetched from TMDB
            if (process.env.NODE_ENV === 'development') {
              console.error(
                `Error fetching overview from TMDB for ${item.tmdb_id}:`,
                error
              );
            }
          }
        }

        return {
          ...item,
          overview,
          providers,
        };
      })
    );

    // Set cache headers (content is stable, cacheable)
    setHeader(event, 'Cache-Control', 'public, max-age=3600'); // 1 hour

    return {
      success: true,
      list,
      items: itemsWithProviders,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    // Log error details for debugging
    console.error('[DiscoverList] Error:', error);
    if (error instanceof Error) {
      console.error('[DiscoverList] Error message:', error.message);
      console.error('[DiscoverList] Error stack:', error.stack);
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching discover list',
      data: error instanceof Error ? error.message : String(error),
    });
  }
});
