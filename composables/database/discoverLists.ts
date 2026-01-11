/**
 * Discover Lists Database Operations
 * Public, SEO-oriented editorial lists
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/constants/db/tables';
import {
  DISCOVER_LISTS_COLUMNS,
  DISCOVER_LIST_ITEMS_COLUMNS,
  TITLES_COLUMNS,
  USER_TITLE_STATUS_COLUMNS,
} from '@/constants/db/columns';
import { TITLE_STATUS } from '@/constants/domain/titleStatus';
import { getTitleOrOverviewInLanguage, type MultiLanguageText } from './titles';
import { getTitlesByTmdbIds } from './titles';
import { insertPoolEntries } from '@/services/recommendationPool';
import type { RecommendationPoolSource } from '@/services/recommendationPool';
import { DEFAULT_LANGUAGE } from '@/constants/languages';

export interface DiscoverList {
  id: string;
  slug: string;
  title: string; // Extracted from JSONB in requested language
  description: string | null; // Extracted from JSONB in requested language
  type: 'movie' | 'tv' | 'mixed';
  is_public: boolean;
  is_indexable: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscoverListItem {
  id: string;
  discover_list_id: string;
  tmdb_id: number;
  type: 'movie' | 'tv';
  position: number;
  tag?: string | null; // Tag extracted from JSONB in requested language
  // Title data (from join with titles table)
  title?: string;
  poster_path?: string | null;
  overview?: string | null;
  tagline?: string | null;
  vote_average?: number | null;
  providers?: Array<{
    provider_id: number;
    provider_name: string;
    logo_path: string | null;
  }>;
}

/**
 * Get all public discover lists
 * @param language Language code in ISO format (e.g., 'es-ES', 'ca-ES')
 * @param isPublic Filter by is_public (default: true)
 * @param supabaseClient Optional Supabase client (for server-side use)
 */
export async function getDiscoverLists(
  language: string = DEFAULT_LANGUAGE,
  isPublic: boolean = true,
  supabaseClient?: SupabaseClient
): Promise<{ data: DiscoverList[] | null; error: Error | null }> {
  const supabase = supabaseClient || useSupabaseClient();

  try {
    let query = supabase
      .from(TABLES.DISCOVER_LISTS)
      .select('*')
      .order(DISCOVER_LISTS_COLUMNS.CREATED_AT, { ascending: false });

    if (isPublic) {
      query = query.eq(DISCOVER_LISTS_COLUMNS.IS_PUBLIC, true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[DiscoverLists] Error fetching lists:', error);
      return { data: null, error };
    }

    if (!data) {
      return { data: [], error: null };
    }

    // Extract title and description from JSONB in requested language
    // Use getTitleOrOverviewInLanguage for consistency with title/overview extraction
    const lists: DiscoverList[] = data.map((list) => {
      const titleJsonb = list.title as MultiLanguageText;
      const descriptionJsonb = list.description as MultiLanguageText | null;

      const extractedTitle = getTitleOrOverviewInLanguage(
        titleJsonb,
        language,
        null
      );
      const extractedDescription = descriptionJsonb
        ? getTitleOrOverviewInLanguage(descriptionJsonb, language, null)
        : null;

      return {
        id: list.id,
        slug: list.slug,
        title: extractedTitle,
        description: extractedDescription,
        type: list.type as 'movie' | 'tv' | 'mixed',
        is_public: list.is_public,
        is_indexable: list.is_indexable,
        created_at: list.created_at,
        updated_at: list.updated_at,
      };
    });

    return { data: lists, error: null };
  } catch (error) {
    console.error('[DiscoverLists] Unexpected error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get discover list by slug
 * @param slug List slug (always in English)
 * @param language Language code in ISO format (e.g., 'es-ES', 'ca-ES')
 * @param supabaseClient Optional Supabase client (for server-side use)
 */
export async function getDiscoverListBySlug(
  slug: string,
  language: string = DEFAULT_LANGUAGE,
  supabaseClient?: SupabaseClient
): Promise<{ data: DiscoverList | null; error: Error | null }> {
  const supabase = supabaseClient || useSupabaseClient();

  try {
    const { data, error } = await supabase
      .from(TABLES.DISCOVER_LISTS)
      .select('*')
      .eq(DISCOVER_LISTS_COLUMNS.SLUG, slug)
      .eq(DISCOVER_LISTS_COLUMNS.IS_PUBLIC, true)
      .maybeSingle();

    if (error) {
      console.error('[DiscoverLists] Error fetching list by slug:', error);
      return { data: null, error };
    }

    if (!data) {
      return { data: null, error: null };
    }

    // Extract title and description from JSONB in requested language
    // Use getTitleOrOverviewInLanguage for consistency with title/overview extraction
    const titleJsonb = data.title as MultiLanguageText;
    const descriptionJsonb = data.description as MultiLanguageText | null;

    const extractedTitle = getTitleOrOverviewInLanguage(
      titleJsonb,
      language,
      null
    );
    const extractedDescription = descriptionJsonb
      ? getTitleOrOverviewInLanguage(descriptionJsonb, language, null)
      : null;

    const list: DiscoverList = {
      id: data.id,
      slug: data.slug,
      title: extractedTitle,
      description: extractedDescription,
      type: data.type as 'movie' | 'tv' | 'mixed',
      is_public: data.is_public,
      is_indexable: data.is_indexable,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return { data: list, error: null };
  } catch (error) {
    console.error('[DiscoverLists] Unexpected error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get discover list items with title data
 * CRITICAL: Does NOT use recommendation_pool - only uses discover_list_items and titles
 * @param listId Discover list ID
 * @param language Language code in ISO format (e.g., 'es-ES', 'ca-ES')
 * @param urlLangCode URL language code (e.g., 'es', 'ca', 'en', 'en-gb') for tag extraction
 * @param supabaseClient Optional Supabase client (for server-side use)
 */
export async function getDiscoverListItems(
  listId: string,
  language: string = DEFAULT_LANGUAGE,
  urlLangCode?: string | null,
  supabaseClient?: SupabaseClient
): Promise<{ data: DiscoverListItem[] | null; error: Error | null }> {
  const supabase = supabaseClient || useSupabaseClient();

  try {
    // Get list items ordered by position (editorial order)
    const { data: items, error: itemsError } = await supabase
      .from(TABLES.DISCOVER_LIST_ITEMS)
      .select('*')
      .eq(DISCOVER_LIST_ITEMS_COLUMNS.DISCOVER_LIST_ID, listId)
      .order(DISCOVER_LIST_ITEMS_COLUMNS.POSITION, { ascending: true });

    if (itemsError) {
      console.error('[DiscoverLists] Error fetching list items:', itemsError);
      return { data: null, error: itemsError };
    }

    if (!items || items.length === 0) {
      return { data: [], error: null };
    }

    // Get tmdb_ids and types for fetching titles
    const tmdbIds = items.map((item) => item.tmdb_id);
    const titleTypes = new Map<number, 'movie' | 'tv'>(
      items.map((item) => [item.tmdb_id, item.type as 'movie' | 'tv'])
    );

    // Fetch titles (with automatic ingestion if missing)
    // CRITICAL: No region, no providers - Discover is 100% stable
    const { data: titles, error: titlesError } = await getTitlesByTmdbIds(
      tmdbIds,
      language,
      null, // No region - Discover is stable
      titleTypes,
      supabase // Pass supabase client for server-side use
    );

    if (titlesError) {
      console.error('[DiscoverLists] Error fetching titles:', titlesError);
      return { data: null, error: titlesError };
    }

    // Map items with title data
    const itemsWithTitles: DiscoverListItem[] = items.map((item) => {
      const title = titles?.find((t) => t.tmdb_id === item.tmdb_id);

      // Extract tag from JSONB in requested language
      let extractedTag: string | null = null;
      if (item.tag) {
        // If urlLangCode is provided, extract the specific language tag
        if (urlLangCode) {
          const tagJsonb = item.tag as Record<string, string> | null;
          if (
            tagJsonb &&
            typeof tagJsonb === 'object' &&
            !Array.isArray(tagJsonb)
          ) {
            // Extract tag using URL language code (es, ca, eu, gl, en, en-gb)
            extractedTag = tagJsonb[urlLangCode] || null;
            // Debug logging in development
            if (import.meta.dev && !extractedTag && tagJsonb) {
              console.warn(
                `[DiscoverLists] Tag not found for lang "${urlLangCode}". Available keys:`,
                Object.keys(tagJsonb)
              );
            }
          } else if (import.meta.dev) {
            console.warn(
              '[DiscoverLists] Tag is not a valid JSONB object:',
              item.tag,
              typeof item.tag
            );
          }
        } else if (import.meta.dev) {
          console.warn(
            '[DiscoverLists] Tag exists but urlLangCode is missing. Tag will be null.',
            item.tag
          );
        }
        // Always set to null if we couldn't extract a string (never return the object)
        if (typeof extractedTag !== 'string') {
          extractedTag = null;
        }
      }

      // title.overview is already extracted by getTitlesByTmdbIds using getTitleOrOverviewInLanguage
      // It should already have the correct language fallback applied
      // Use the extracted overview as-is (it should already have fallback logic)
      return {
        id: item.id,
        discover_list_id: item.discover_list_id,
        tmdb_id: item.tmdb_id,
        type: item.type as 'movie' | 'tv',
        position: item.position,
        tag: extractedTag,
        title: title?.title || undefined,
        poster_path: title?.poster_path || undefined,
        overview: title?.overview || undefined,
        tagline: title?.tagline || undefined,
        vote_average: title?.vote_average || undefined,
      };
    });

    return { data: itemsWithTitles, error: null };
  } catch (error) {
    console.error('[DiscoverLists] Unexpected error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Insert discover list items into user's recommendation pool
 * CRITICAL: Never modifies Discover lists or their content, only affects recommendation_pool
 * @param userId User ID
 * @param listId Discover list ID
 * @param supabaseClient Optional Supabase client
 */
export async function insertDiscoverListIntoPool(
  userId: string,
  listId: string,
  supabaseClient?: SupabaseClient
): Promise<{ inserted: number; error: Error | null }> {
  const supabase = supabaseClient || useSupabaseClient();

  try {
    // Get list items
    const { data: items, error: itemsError } = await supabase
      .from(TABLES.DISCOVER_LIST_ITEMS)
      .select('*')
      .eq(DISCOVER_LIST_ITEMS_COLUMNS.DISCOVER_LIST_ID, listId);

    if (itemsError) {
      console.error(
        '[DiscoverLists] Error fetching list items for seed:',
        itemsError
      );
      return { inserted: 0, error: itemsError };
    }

    if (!items || items.length === 0) {
      return { inserted: 0, error: null };
    }

    // Get user exclusions (seen, not_interested)
    const { data: exclusions, error: exclusionsError } = await supabase
      .from(TABLES.USER_TITLE_STATUS)
      .select(USER_TITLE_STATUS_COLUMNS.TMDB_ID)
      .eq(USER_TITLE_STATUS_COLUMNS.USER_ID, userId)
      .in(USER_TITLE_STATUS_COLUMNS.STATUS, [
        TITLE_STATUS.SEEN,
        TITLE_STATUS.NOT_INTERESTED,
      ]);

    if (exclusionsError) {
      console.error(
        '[DiscoverLists] Error fetching exclusions:',
        exclusionsError
      );
      return { inserted: 0, error: exclusionsError };
    }

    const excludedTmdbIds = new Set(
      (exclusions || []).map((exclusion) => exclusion.tmdb_id)
    );

    // Filter out excluded titles
    const itemsToInsert = items.filter(
      (item) => !excludedTmdbIds.has(item.tmdb_id)
    );

    if (itemsToInsert.length === 0) {
      return { inserted: 0, error: null };
    }

    // Fetch titles to get vote_average for base_score calculation
    const tmdbIds = itemsToInsert.map((item) => item.tmdb_id);
    const { data: titles, error: titlesError } = await supabase
      .from(TABLES.TITLES)
      .select(
        `${TITLES_COLUMNS.TMDB_ID}, ${TITLES_COLUMNS.TYPE}, ${TITLES_COLUMNS.VOTE_AVERAGE}`
      )
      .in(TITLES_COLUMNS.TMDB_ID, tmdbIds);

    if (titlesError) {
      console.error(
        '[DiscoverLists] Error fetching titles for base_score:',
        titlesError
      );
      return { inserted: 0, error: titlesError };
    }

    // Create a map of tmdb_id -> vote_average for quick lookup
    const voteAverageMap = new Map<number, number | null>();
    if (titles) {
      titles.forEach((title) => {
        voteAverageMap.set(title.tmdb_id, title.vote_average);
      });
    }

    // Prepare entries for recommendation pool with base_score calculation
    const entries = itemsToInsert.map((item) => {
      const voteAverage = voteAverageMap.get(item.tmdb_id) ?? null;
      // Calculate base_score: (vote_average / 10) * 50, or 25 if null
      const baseScore = voteAverage !== null ? (voteAverage / 10) * 50 : 25;

      return {
        tmdb_id: item.tmdb_id,
        type: item.type as 'movie' | 'tv',
        source: 'discover' as RecommendationPoolSource,
        base_score: baseScore,
        preference_score: 0,
        score: baseScore, // base_score + preference_score (0)
        explanation_code: 'DISCOVER_LIST' as string,
      };
    });

    // Insert into pool (idempotent - ON CONFLICT DO NOTHING)
    const inserted = await insertPoolEntries(userId, entries, supabase);

    return { inserted, error: null };
  } catch (error) {
    console.error(
      '[DiscoverLists] Unexpected error inserting into pool:',
      error
    );
    return { inserted: 0, error: error as Error };
  }
}
