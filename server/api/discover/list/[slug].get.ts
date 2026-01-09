/**
 * GET /api/discover/list/[slug]
 * Public endpoint to get a discover list with its items
 * CRITICAL: Does NOT use recommendation_pool, source, or explanation_code
 * Only uses discover_lists, discover_list_items, and titles (join)
 */

import { getRouterParams, getQuery } from 'h3';
import {
  getDiscoverListBySlug,
  getDiscoverListItems,
} from '@/composables/database/discoverLists';
import { DEFAULT_LANGUAGE, toTMDBLanguageCode } from '@/constants/languages';
import { createServerSupabaseClient } from '@/server/utils/supabase';

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

    // Get language from URL (route.params.lang) or query parameter, then default
    const query = getQuery(event);
    let language = DEFAULT_LANGUAGE;
    let urlLangCode: string | null = null;
    
    // Priority 1: URL parameter (route.params.lang) - deterministic source of truth
    const langFromUrl = params.lang as string | undefined;
    if (langFromUrl) {
      const normalizedLang = langFromUrl.toLowerCase();
      urlLangCode = normalizedLang;
      const { getI18nCodeFromUrlCode } = await import('@/composables/useLangFromUrl');
      const i18nCode = getI18nCodeFromUrlCode(normalizedLang);
      if (i18nCode) {
        language = toTMDBLanguageCode(i18nCode);
      }
    } 
    // Priority 2: Query parameter (fallback for API calls)
    else if (query.language && typeof query.language === 'string') {
      language = toTMDBLanguageCode(query.language);
      // Try to get URL code from query parameter first (if passed by client)
      if (query.urlLang && typeof query.urlLang === 'string') {
        urlLangCode = query.urlLang.toLowerCase();
      } else {
        // Fallback: Try to extract URL code from i18n code for tag extraction
        const { getUrlCodeFromI18nCode } = await import('@/composables/useLangFromUrl');
        urlLangCode = getUrlCodeFromI18nCode(query.language) || null;
      }
    }
    // Priority 3: Default (no cookies - language comes from URL only)

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
    // CRITICAL: No region, no providers - Discover is 100% stable
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

    // Set cache headers (content is stable, cacheable)
    setHeader(event, 'Cache-Control', 'public, max-age=3600'); // 1 hour

    return {
      success: true,
      list,
      items: items || [],
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
