/**
 * Discover Lists Database Operations
 * Public, SEO-oriented editorial lists
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/constants/db/tables';
import {
  DISCOVER_LISTS_COLUMNS,
  DISCOVER_LIST_ITEMS_COLUMNS,
} from '@/constants/db/columns';
import { getTitleInLanguage, type MultiLanguageText } from './titles';
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
  // Title data (from join with titles table)
  title?: string;
  poster_path?: string | null;
  overview?: string | null;
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
    const lists: DiscoverList[] = data.map((list) => {
      const titleJsonb = list.title as MultiLanguageText;
      const descriptionJsonb = list.description as MultiLanguageText | null;

      const extractedTitle = getTitleInLanguage(
        titleJsonb,
        language,
        null,
        false
      );
      const extractedDescription = descriptionJsonb
        ? getTitleInLanguage(descriptionJsonb, language, null, false)
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
    const titleJsonb = data.title as MultiLanguageText;
    const descriptionJsonb = data.description as MultiLanguageText | null;

    const extractedTitle = getTitleInLanguage(
      titleJsonb,
      language,
      null,
      false
    );
    const extractedDescription = descriptionJsonb
      ? getTitleInLanguage(descriptionJsonb, language, null, false)
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
 * @param supabaseClient Optional Supabase client (for server-side use)
 */
export async function getDiscoverListItems(
  listId: string,
  language: string = DEFAULT_LANGUAGE,
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

      return {
        id: item.id,
        discover_list_id: item.discover_list_id,
        tmdb_id: item.tmdb_id,
        type: item.type as 'movie' | 'tv',
        position: item.position,
        title: title?.title || undefined,
        poster_path: title?.poster_path || undefined,
        overview: title?.overview || undefined,
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
      .from('user_title_status')
      .select('tmdb_id')
      .eq('user_id', userId)
      .in('status', ['seen', 'not_interested']);

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

    // Prepare entries for recommendation pool
    const entries = itemsToInsert.map((item) => ({
      tmdb_id: item.tmdb_id,
      type: item.type as 'movie' | 'tv',
      source: 'discover' as RecommendationPoolSource,
      score: 0,
      explanation_code: 'DISCOVER_LIST' as string,
    }));

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
