import { getTMDBConfig } from '@/server/utils/config';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { parseCookies } from 'h3';

/**
 * Cache for regions data by language
 * Cache duration: 24 hours (regions don't change frequently)
 * Key: language code (e.g., 'es-ES', 'en-US')
 */
const regionsCache = new Map<
  string,
  {
    data: Array<{ iso_3166_1: string; native_name: string }>;
    timestamp: number;
  }
>();

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
 * Get regions from TMDB API with caching by language
 * Uses app language (i18n locale) from cookies, or query parameter, or default
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { DEFAULT_LANGUAGE } = await import('@/constants/languages');

    // Get app language (i18n locale) from cookies
    // Nuxt i18n stores it in 'i18n_redirected' cookie (see nuxt.config.ts)
    let language: string = (query.language as string) || DEFAULT_LANGUAGE;

    try {
      const cookies = parseCookies(event);
      const i18nCookie = cookies['i18n_redirected'];
      if (i18nCookie) {
        language = i18nCookie;
      }
    } catch {
      // If error reading cookies, use query or default
      language = (query.language as string) || DEFAULT_LANGUAGE;
    }

    // Check cache for this specific language
    const now = Date.now();
    const cachedData = regionsCache.get(language);
    if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
      // Return cached data for this language
      const availableFlags = await getAvailableFlags();
      const filteredRegions = cachedData.data
        .filter((region) => availableFlags.has(region.iso_3166_1))
        .map((region) => ({
          code: region.iso_3166_1,
          name: region.native_name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Set cache headers
      event.node.res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
      event.node.res.setHeader('X-Cache', 'HIT');
      event.node.res.setHeader('X-Cache-Language', language);

      return {
        success: true,
        regions: filteredRegions,
        cached: true,
        language,
      };
    }

    // Fetch from TMDB API for this language
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

    // Update cache for this language
    regionsCache.set(language, {
      data: response.results,
      timestamp: now,
    });

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
    event.node.res.setHeader('X-Cache-Language', language);

    return {
      success: true,
      regions: filteredRegions,
      cached: false,
      language,
    };
  } catch (error) {
    console.error('[Regions] Error fetching regions from TMDB:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch regions from TMDB',
    });
  }
});
