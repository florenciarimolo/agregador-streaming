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

    const { slug } = getRouterParams(event) as { slug: string };

    if (!slug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Slug is required',
      });
    }

    // Get language from URL (route.params.lang) or query parameter, then default
    const query = getQuery(event);
    const params = getRouterParams(event);
    let language = DEFAULT_LANGUAGE;
    
    // Priority 1: URL parameter (route.params.lang) - deterministic source of truth
    const langFromUrl = params.lang as string | undefined;
    if (langFromUrl) {
      const { getI18nCodeFromUrlCode } = await import('@/composables/useLangFromUrl');
      const i18nCode = getI18nCodeFromUrlCode(langFromUrl.toLowerCase());
      if (i18nCode) {
        language = toTMDBLanguageCode(i18nCode);
      }
    } 
    // Priority 2: Query parameter (fallback for API calls)
    else if (query.language && typeof query.language === 'string') {
      language = toTMDBLanguageCode(query.language);
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
    const { data: items, error: itemsError } = await getDiscoverListItems(
      list.id,
      language,
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
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching discover list',
      data: error,
    });
  }
});
