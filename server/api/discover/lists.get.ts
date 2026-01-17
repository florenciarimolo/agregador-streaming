/**
 * GET /api/discover/lists
 * Public endpoint to get all public discover lists
 * CRITICAL: Does NOT use recommendation_pool, source, or explanation_code
 */

import { getQuery } from 'h3';
import { getDiscoverLists } from '@/composables/database/discoverLists';
import { DEFAULT_LANGUAGE, toTMDBLanguageCode } from '@/constants/languages';
import { createServerSupabaseClient } from '@/server/utils/supabase';
import { getTitleInLanguage, type MultiLanguageText } from '@/composables/database/titles';
import { TABLES } from '@/constants/db/tables';
import { DISCOVER_LIST_ITEMS_COLUMNS, TITLES_COLUMNS } from '@/constants/db/columns';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();

    // Create Supabase client for server-side operations
    const supabase = createServerSupabaseClient(config);

    // Get language from URL (route.params.lang) or query parameter, then default
    const query = getQuery(event);
    const params = event.context.params || {};
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
          .from(TABLES.DISCOVER_LIST_ITEMS)
          .select(`${DISCOVER_LIST_ITEMS_COLUMNS.TMDB_ID}, ${DISCOVER_LIST_ITEMS_COLUMNS.TYPE}`)
          .eq(DISCOVER_LIST_ITEMS_COLUMNS.DISCOVER_LIST_ID, list.id)
          .order(DISCOVER_LIST_ITEMS_COLUMNS.POSITION, { ascending: true })
          .limit(4);

        const countResult = await supabase
          .from(TABLES.DISCOVER_LIST_ITEMS)
          .select('*', { count: 'exact', head: true })
          .eq(DISCOVER_LIST_ITEMS_COLUMNS.DISCOVER_LIST_ID, list.id);

        const totalCount = countResult.count || 0;

        // Get poster paths for preview items
        let previewPosters: (string | null)[] = [];
        if (items && items.length > 0) {
          const tmdbIds = items.map((item) => item.tmdb_id);
          const { data: titles } = await supabase
            .from(TABLES.TITLES)
            .select(`${TITLES_COLUMNS.TMDB_ID}, ${TITLES_COLUMNS.POSTER_PATH}`)
            .in(TITLES_COLUMNS.TMDB_ID, tmdbIds);

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
