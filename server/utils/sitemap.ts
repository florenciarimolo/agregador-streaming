import { createClient } from '@supabase/supabase-js';
import { PROFILES_COLUMNS, USER_PREFERENCES_COLUMNS, TITLES_COLUMNS } from '@/constants/db/columns';
import { TABLES, TITLES_COLUMNS } from '@/constants/db/tables';
import { SCORE_WEIGHTS } from '@/constants/domain/scoring';
import { getTMDBConfig } from './config';
import type { Season } from '@/types/TVShow';
import { DEFAULT_LANGUAGE } from '@/constants/languages';

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
 * Get seasons for a TV show from TMDB
 * Returns an array of season numbers
 */
export async function getTVShowSeasons(
  tmdbId: number
): Promise<Array<{ season_number: number }>> {
  try {
    const apiKey = process.env.NUXT_TMDB_API_KEY;
    const baseUrl =
      process.env.NUXT_TMDB_BASE_URL || 'https://api.themoviedb.org/3';

    if (!apiKey) {
      if (import.meta.dev) {
        console.warn(
          `[Sitemap] TMDB API key not found, skipping seasons for TV show ${tmdbId}`
        );
      }
      return [];
    }

    // Fetch TV show details which includes seasons list
    const response = await $fetch<{ seasons: Season[] }>(
      `${baseUrl}/tv/${tmdbId}`,
      {
        query: {
          api_key: apiKey,
          language: DEFAULT_LANGUAGE,
        },
      }
    );

    if (!response?.seasons) {
      return [];
    }

    // Filter out special seasons (season_number 0) and return only regular seasons
    return response.seasons
      .filter((season) => season.season_number > 0)
      .map((season) => ({
        season_number: season.season_number,
      }));
  } catch (error) {
    // Silently fail for individual TV shows to not break the entire sitemap
    if (import.meta.dev) {
      console.warn(
        `[Sitemap] Error fetching seasons for TV show ${tmdbId}:`,
        error
      );
    }
    return [];
  }
}

