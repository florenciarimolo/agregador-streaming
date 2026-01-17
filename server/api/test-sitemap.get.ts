/**
 * Test endpoint to verify sitemap generation
 * Access at: /api/test-sitemap
 */
import {
  getTitleIdsForSitemap,
  getDiscoverListsForSitemap,
} from '@/server/utils/sitemap';
import { devLog, logError } from '@/server/utils/logger';

export default defineEventHandler(async () => {
  devLog('[Test Sitemap] Endpoint called');

  try {
    devLog('[Test Sitemap] Calling getTitleIdsForSitemap()...');
    const titles = await getTitleIdsForSitemap();
    devLog('[Test Sitemap] Titles fetched:', titles.length);

    devLog('[Test Sitemap] Calling getDiscoverListsForSitemap()...');
    const discoverLists = await getDiscoverListsForSitemap();
    devLog('[Test Sitemap] Discover lists fetched:', discoverLists.length);

    const movies = titles.filter((t) => t.type === 'movie');
    const tvShows = titles.filter((t) => t.type === 'tv');

    return {
      success: true,
      stats: {
        totalTitles: titles.length,
        movies: movies.length,
        tvShows: tvShows.length,
        discoverLists: discoverLists.length,
      },
      sample: {
        firstMovie: movies[0] || null,
        firstTVShow: tvShows[0] || null,
        firstDiscoverList: discoverLists[0] || null,
      },
      allTitles: titles.slice(0, 10), // First 10 for debugging
    };
  } catch (error) {
    logError('[Test Sitemap] Error', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
  }
});
