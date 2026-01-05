/**
 * GET /api/discover/lists
 * Public endpoint to get all public discover lists
 * CRITICAL: Does NOT use recommendation_pool, source, or explanation_code
 */

import { parseCookies, getQuery } from 'h3';
import { getDiscoverLists } from '@/composables/database/discoverLists';
import { DEFAULT_LANGUAGE, toTMDBLanguageCode } from '@/constants/languages';
import { createServerSupabaseClient } from '@/server/utils/supabase';
import { getTitleInLanguage, type MultiLanguageText } from '@/composables/database/titles';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();

    // Create Supabase client for server-side operations
    const supabase = createServerSupabaseClient(config);

    // Get language from query parameter first, then fall back to cookies
    const query = getQuery(event);
    let language = DEFAULT_LANGUAGE;
    
    // Try query parameter first (more reliable for immediate updates)
    if (query.language && typeof query.language === 'string') {
      language = toTMDBLanguageCode(query.language);
    } else {
      // Fall back to cookies (i18n_redirected cookie from Nuxt i18n)
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

    // Get count and preview images for each list
    const listsWithPreview = await Promise.all(
      (data || []).map(async (list) => {
        // Get first 4 items with poster paths for preview
        const { data: items } = await supabase
          .from('discover_list_items')
          .select('tmdb_id, type')
          .eq('discover_list_id', list.id)
          .order('position', { ascending: true })
          .limit(4);

        const countResult = await supabase
          .from('discover_list_items')
          .select('*', { count: 'exact', head: true })
          .eq('discover_list_id', list.id);

        const totalCount = countResult.count || 0;

        // Get poster paths for preview items
        let previewPosters: (string | null)[] = [];
        if (items && items.length > 0) {
          const tmdbIds = items.map((item) => item.tmdb_id);
          const { data: titles } = await supabase
            .from('titles')
            .select('tmdb_id, poster_path')
            .in('tmdb_id', tmdbIds);

          if (titles) {
            // Map posters in the same order as items, extracting from JSONB
            previewPosters = items.map((item) => {
              const title = titles.find((t) => t.tmdb_id === item.tmdb_id);
              if (!title || !title.poster_path) return null;
              // Extract poster_path from JSONB (it's stored as MultiLanguageText)
              const posterPath = getTitleInLanguage(
                title.poster_path as MultiLanguageText,
                language,
                null,
                true // isImagePath = true
              );
              return posterPath || null;
            });
          }
        }

        return {
          ...list,
          itemCount: totalCount,
          previewPosters: previewPosters.filter((p) => p !== null).slice(0, 4),
        };
      })
    );

    // Set cache headers (content is stable, cacheable)
    setHeader(event, 'Cache-Control', 'public, max-age=3600'); // 1 hour

    return {
      success: true,
      lists: listsWithPreview,
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching discover lists',
      data: error,
    });
  }
});
