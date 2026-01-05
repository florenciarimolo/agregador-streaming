/**
 * GET /api/discover/lists
 * Public endpoint to get all public discover lists
 * CRITICAL: Does NOT use recommendation_pool, source, or explanation_code
 */

import { parseCookies } from 'h3';
import { getDiscoverLists } from '@/composables/database/discoverLists';
import { DEFAULT_LANGUAGE, toTMDBLanguageCode } from '@/constants/languages';
import { createServerSupabaseClient } from '@/server/utils/supabase';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();

    // Create Supabase client for server-side operations
    const supabase = createServerSupabaseClient(config);

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

    // Get lists (public only, no region/providers - Discover is 100% stable)
    const { data, error } = await getDiscoverLists(language, true, supabase);

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Error fetching discover lists',
        data: error,
      });
    }

    // Set cache headers (content is stable, cacheable)
    setHeader(event, 'Cache-Control', 'public, max-age=3600'); // 1 hour

    return {
      success: true,
      lists: data || [],
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching discover lists',
      data: error,
    });
  }
});
