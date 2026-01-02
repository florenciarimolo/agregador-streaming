import { getTMDBConfig } from '@/server/utils/config';
import { readdir } from 'fs/promises';
import { join } from 'path';

/**
 * Cache for regions data
 * Cache duration: 24 hours (regions don't change frequently)
 */
let regionsCache: {
  data: Array<{ iso_3166_1: string; native_name: string }>;
  timestamp: number;
} | null = null;

/**
 * Cache for available flags
 * Flags don't change frequently, so we cache them
 */
let flagsCache: Set<string> | null = null;

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Get available flag files from public/icons/flags directory
 */
async function getAvailableFlags(): Promise<Set<string>> {
  // Return cached flags if available
  if (flagsCache) {
    return flagsCache;
  }

  try {
    const flagsDir = join(process.cwd(), 'public', 'icons', 'flags');
    const files = await readdir(flagsDir);
    const flags = new Set<string>();

    files.forEach((file) => {
      if (file.endsWith('.svg')) {
        const code = file.replace('.svg', '').toUpperCase();
        flags.add(code);
      }
    });

    // Cache the flags
    flagsCache = flags;
    return flags;
  } catch (error) {
    console.error('[Regions] Error reading flags directory:', error);
    // Return empty set if error, but don't cache it
    return new Set<string>();
  }
}

/**
 * Get regions from TMDB API with caching
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const language = (query.language as string) || 'es-ES';

    // Check cache
    const now = Date.now();
    if (
      regionsCache &&
      now - regionsCache.timestamp < CACHE_DURATION
    ) {
      // Return cached data
      const availableFlags = await getAvailableFlags();
      const filteredRegions = regionsCache.data
        .filter((region) => availableFlags.has(region.iso_3166_1))
        .map((region) => ({
          code: region.iso_3166_1,
          name: region.native_name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Set cache headers
      event.node.res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
      event.node.res.setHeader('X-Cache', 'HIT');

      return {
        success: true,
        regions: filteredRegions,
        cached: true,
      };
    }

    // Fetch from TMDB API
    const tmdbConfig = getTMDBConfig(language);
    const response = await $fetch<{
      results: Array<{ iso_3166_1: string; native_name: string }>;
    }>(`${tmdbConfig.baseUrl}/watch/providers/regions`, {
      query: {
        api_key: tmdbConfig.apiKey,
        language: language,
      },
    });

    if (!response || !response.results) {
      throw new Error('Invalid response from TMDB API');
    }

    // Update cache
    regionsCache = {
      data: response.results,
      timestamp: now,
    };

    // Get available flags and filter regions
    const availableFlags = await getAvailableFlags();
    const filteredRegions = response.results
      .filter((region) => availableFlags.has(region.iso_3166_1))
      .map((region) => ({
        code: region.iso_3166_1,
        name: region.native_name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Set cache headers
    event.node.res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
    event.node.res.setHeader('X-Cache', 'MISS');

    return {
      success: true,
      regions: filteredRegions,
      cached: false,
    };
  } catch (error) {
    console.error('[Regions] Error fetching regions from TMDB:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch regions from TMDB',
    });
  }
});

