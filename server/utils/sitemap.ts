import { createClient } from '@supabase/supabase-js';
import { TITLES_COLUMNS, DISCOVER_LISTS_COLUMNS } from '@/constants/db/columns';
import { TABLES } from '@/constants/db/tables';

/**
 * Get all movie and TV show IDs from Supabase for sitemap generation
 * Returns an array of objects with tmdb_id, type, and updated_at
 */
export async function getTitleIdsForSitemap(): Promise<
  Array<{ tmdb_id: number; type: 'movie' | 'tv'; updated_at: string | null }>
> {
  try {
    // Try to use runtime config, fallback to env vars for sitemap generation context
    let supabaseUrl: string;
    let supabaseKey: string;

    try {
      const config = useRuntimeConfig();
      supabaseUrl = config.public.supabaseUrl;
      supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;
    } catch {
      // Fallback to environment variables if runtime config is not available
      supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || '';
      supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ||
        '';
    }

    if (!supabaseUrl || !supabaseKey) {
      console.error(
        '[Sitemap] Missing Supabase configuration. Cannot generate sitemap.'
      );
      return [];
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error } = await supabase
      .from(TABLES.TITLES)
      .select(
        `${TITLES_COLUMNS.TMDB_ID}, ${TITLES_COLUMNS.TYPE}, ${TITLES_COLUMNS.UPDATED_AT}`
      );

    if (error) {
      console.error('[Sitemap] Error fetching titles:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data.map((title) => ({
      tmdb_id: title.tmdb_id,
      type: title.type as 'movie' | 'tv',
      updated_at: title.updated_at,
    }));
  } catch (error) {
    console.error('[Sitemap] Unexpected error:', error);
    return [];
  }
}

/**
 * Get all discover lists for sitemap generation
 * Returns an array of objects with slug and updated_at
 * Only includes lists with is_public=true AND is_indexable=true
 */
export async function getDiscoverListsForSitemap(): Promise<
  Array<{ slug: string; updated_at: string | null }>
> {
  try {
    // Try to use runtime config, fallback to env vars for sitemap generation context
    let supabaseUrl: string;
    let supabaseKey: string;

    try {
      const config = useRuntimeConfig();
      supabaseUrl = config.public.supabaseUrl;
      supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;
    } catch {
      // Fallback to environment variables if runtime config is not available
      supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || '';
      supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ||
        '';
    }

    if (!supabaseUrl || !supabaseKey) {
      console.error(
        '[Sitemap] Missing Supabase configuration. Cannot generate sitemap for discover lists.'
      );
      return [];
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // CRITICAL: Filter by is_public=true AND is_indexable=true
    const { data, error } = await supabase
      .from(TABLES.DISCOVER_LISTS)
      .select(
        `${DISCOVER_LISTS_COLUMNS.SLUG}, ${DISCOVER_LISTS_COLUMNS.UPDATED_AT}`
      )
      .eq(DISCOVER_LISTS_COLUMNS.IS_PUBLIC, true)
      .eq(DISCOVER_LISTS_COLUMNS.IS_INDEXABLE, true);

    if (error) {
      console.error('[Sitemap] Error fetching discover lists:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data.map((list) => ({
      slug: list.slug,
      updated_at: list.updated_at,
    }));
  } catch (error) {
    console.error('[Sitemap] Unexpected error fetching discover lists:', error);
    return [];
  }
}
