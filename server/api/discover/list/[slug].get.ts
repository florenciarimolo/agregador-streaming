/**
 * GET /api/discover/list/[slug]
 * Public endpoint to get a discover list with its items
 * CRITICAL: Does NOT use recommendation_pool, source, or explanation_code
 * Only uses discover_lists, discover_list_items, and titles (join)
 */

import { getRouterParams } from 'h3';
import { parseCookies } from 'h3';
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

    // Get language from cookies (i18n_redirected cookie from Nuxt i18n)
    let language = DEFAULT_LANGUAGE;
    try {
      const cookies = parseCookies(event);
      const i18nCookie = cookies['i18n_redirected'];
      if (i18nCookie) {
        language = toTMDBLanguageCode(i18nCookie);
      }
    } catch {
      // If error reading cookies, use default
      language = DEFAULT_LANGUAGE;
    }

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
