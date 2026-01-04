import { getTMDBConfig } from '@/server/utils/config';
import { createError, setHeader } from 'h3';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import type { MediaResponse } from '@/types/Media';
import type { Media } from '@/types/Media';
import { LanguageCode, LanguageIsoCode } from '@/constants/languages';

/**
 * Translates English text to Spanish using LibreTranslate
 * Falls back to English if translation fails
 */
async function translateToSpanish(text: string): Promise<string> {
  try {
    const translateResponse = await $fetch<{ translatedText: string }>(
      'https://libretranslate.de/translate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          q: text,
          source: LanguageIsoCode.ENGLISH,
          target: LanguageIsoCode.SPANISH,
          format: 'text',
        },
      }
    );
    const translated = translateResponse.translatedText || text;
    // Small delay after translation to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
    return translated;
  } catch (translateError) {
    // If translation fails, use English text as fallback
    console.warn(
      'Translation failed, using English text:',
      translateError instanceof Error ? translateError.message : translateError
    );
    return text;
  }
}

/**
 * Scrapes IMDB trending TV shows page and converts IMDB IDs to TMDB TV show data
 * Fetches the first 20 trending TV shows from IMDB and returns their TMDB equivalents
 * Cached for 1 hour (3600 seconds) to reduce API calls and improve performance
 */
// defineCachedEventHandler is auto-imported by Nuxt
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - defineCachedEventHandler is auto-imported by Nuxt
export default defineCachedEventHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (event: any) => {
    try {
      const config = getTMDBConfig();
      const imdbUrl =
        'https://www.imdb.com/es-es/chart/tvmeter/?ref_=hm_nv_menu';

      // Fetch IMDB trending page
      // Note: IMDB may block requests without proper headers or rate limit
      let html: string;
      try {
        html = await $fetch<string>(imdbUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            Referer: 'https://www.imdb.com/',
          },
          // Add timeout to prevent hanging
          timeout: 15000, // 15 seconds
        });
      } catch (fetchError) {
        console.error('Failed to fetch IMDB page:', fetchError);
        throw createError({
          statusCode: 503,
          statusMessage: `Failed to fetch IMDB page: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
          data: fetchError,
        });
      }

      // Parse HTML to extract IMDB IDs
      const imdbIds = extractImdbIds(html);
      console.log(`Found ${imdbIds.length} IMDB IDs`);

      if (imdbIds.length === 0) {
        console.error('No IMDB IDs found. HTML length:', html.length);
        // Log a sample of the HTML to help debug
        console.error('HTML sample (first 500 chars):', html.substring(0, 500));
        throw createError({
          statusCode: 500,
          statusMessage:
            'No IMDB IDs found on trending page. The page structure may have changed.',
        });
      }

      // Get first 20 IDs
      const top20Ids = imdbIds.slice(0, 20);
      console.log(`Processing ${top20Ids.length} IMDB IDs`);

      // Convert IMDB IDs to TMDB TV show data
      const tvShows: Media[] = [];
      let successCount = 0;
      let failCount = 0;

      for (const imdbId of top20Ids) {
        try {
          // Find TMDB TV show by IMDB ID
          const findResponse = await $fetch<{
            tv_results: Array<{ id: number }>;
          }>(`${config.baseUrl}/find/${imdbId}`, {
            query: {
              api_key: config.apiKey,
              external_source: 'imdb_id',
            },
          });

          if (findResponse.tv_results && findResponse.tv_results.length > 0) {
            const tmdbId = findResponse.tv_results[0].id;

            // Fetch full TV show details from TMDB in Spanish first
            // Don't type as Media - TMDB returns full TVShow object with all fields including overview
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tvShowResponse = await $fetch<any>(
              `${config.baseUrl}/tv/${tmdbId}`,
              {
                query: {
                  api_key: config.apiKey,
                  language: config.language, // es-ES
                  include_adult: config.includeAdult,
                },
              }
            );

            // Get Spanish overview
            let overview = tvShowResponse.overview || '';

            // Always fetch English version to compare and translate if needed
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const englishResponse = await $fetch<any>(
                `${config.baseUrl}/tv/${tmdbId}`,
                {
                  query: {
                    api_key: config.apiKey,
                    language: LanguageCode.ENGLISH,
                    include_adult: config.includeAdult,
                  },
                }
              );

              const englishOverview = englishResponse.overview || '';

              // If Spanish overview is empty or matches English (TMDB returned English when we asked for Spanish)
              // Translate English to Spanish
              if (
                (!overview || overview.trim().length === 0) &&
                englishOverview &&
                englishOverview.trim().length > 0
              ) {
                // Spanish overview is empty, translate English
                overview = await translateToSpanish(englishOverview);
              } else if (
                overview &&
                overview.trim().length > 0 &&
                englishOverview &&
                englishOverview.trim().length > 0 &&
                overview.trim() === englishOverview.trim()
              ) {
                // Spanish overview matches English (TMDB returned English when we asked for Spanish)
                // Translate English to Spanish
                overview = await translateToSpanish(englishOverview);
              }
            } catch (englishFetchError) {
              console.warn(
                `Failed to fetch English overview for TV show ${tmdbId}:`,
                englishFetchError instanceof Error
                  ? englishFetchError.message
                  : englishFetchError
              );
            }

            // Map TMDB TVShow response to Media type
            // All data comes from TMDB API, we only use IMDB ID for lookup
            const media: Media = {
              id: tvShowResponse.id,
              name: tvShowResponse.name,
              original_name: tvShowResponse.original_name,
              overview: overview, // Overview from TMDB (Spanish or translated from English)
              poster_path: tvShowResponse.poster_path,
              backdrop_path: tvShowResponse.backdrop_path,
              first_air_date: tvShowResponse.first_air_date,
              vote_average: tvShowResponse.vote_average,
              media_type: MediaTypeEnum.tv,
              original_language: tvShowResponse.original_language,
              imdb_id: imdbId,
            };

            tvShows.push(media);
            successCount++;
          } else {
            console.warn(`No TMDB TV show found for IMDB ID ${imdbId}`);
            failCount++;
          }
        } catch (error) {
          // Skip TV shows that can't be found in TMDB
          failCount++;
          console.warn(
            `Failed to fetch TMDB data for IMDB ID ${imdbId}:`,
            error instanceof Error ? error.message : error
          );
          continue;
        }

        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(
        `IMDB TV scraper completed: ${successCount} successful, ${failCount} failed, ${tvShows.length} total TV shows`
      );

      if (tvShows.length === 0) {
        throw createError({
          statusCode: 500,
          statusMessage:
            'No TV shows could be fetched from TMDB. All IMDB IDs failed to convert.',
        });
      }

      // Set cache headers
      setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=3600');
      setHeader(event, 'CDN-Cache-Control', 'public, max-age=3600');
      setHeader(event, 'Vercel-CDN-Cache-Control', 'public, max-age=3600');

      // Return in MediaResponse format
      const response: MediaResponse = {
        page: 1,
        results: tvShows,
        total_pages: 1,
        total_results: tvShows.length,
      };

      return response;
    } catch (error) {
      console.error('IMDB TV scraper error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw createError({
        statusCode: 500,
        statusMessage: `Error fetching trending TV shows from IMDB: ${errorMessage}`,
        data: error,
      });
    }
  },
  {
    // Cache for 1 hour (3600 seconds)
    maxAge: 3600,
    // Cache key based on the endpoint
    name: 'imdb-trending-tvshows',
    // Cache in memory (can be configured to use other storage)
    getKey: () => 'imdb-trending-tvshows',
  }
);

/**
 * Extracts IMDB TV show IDs from HTML content
 * Looks for links with pattern /title/tt.../ in the specific list container
 * Multiple strategies to handle different IMDB page structures
 */
function extractImdbIds(html: string): string[] {
  const imdbIds: string[] = [];
  const idSet = new Set<string>(); // Use Set to avoid duplicates

  // Strategy 1: Try to find the specific list container
  // Look for various possible list container patterns
  const listPatterns = [
    /<ul[^>]*class="[^"]*ipc-metadata-list[^"]*"[^>]*>([\s\S]*?)<\/ul>/i,
    /<ul[^>]*class="[^"]*chart[^"]*"[^>]*>([\s\S]*?)<\/ul>/i,
    /<ul[^>]*class="[^"]*list[^"]*"[^>]*>([\s\S]*?)<\/ul>/i,
  ];

  let searchContent = html;
  for (const pattern of listPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      searchContent = match[1];
      break;
    }
  }

  // Strategy 2: Multiple patterns to match IMDB IDs
  // Pattern 1: href="/title/tt..." or href="/es-es/title/tt..."
  const patterns = [
    /href=["']\/[^"']*\/title\/(tt\d{7,8})\//gi,
    /href=["']\/title\/(tt\d{7,8})\//gi,
    /\/title\/(tt\d{7,8})\//g,
    /data-testid="[^"]*"\s+href="\/title\/(tt\d{7,8})\//gi,
  ];

  for (const pattern of patterns) {
    let match;
    while (
      (match = pattern.exec(searchContent)) !== null &&
      imdbIds.length < 20
    ) {
      const imdbId = match[1];
      if (!idSet.has(imdbId)) {
        idSet.add(imdbId);
        imdbIds.push(imdbId);
      }
    }
    if (imdbIds.length >= 20) break;
  }

  // Strategy 3: If still not enough, search the whole HTML
  if (imdbIds.length < 20) {
    const fallbackPattern = /\/title\/(tt\d{7,8})\//g;
    let fallbackMatch;
    while (
      (fallbackMatch = fallbackPattern.exec(html)) !== null &&
      imdbIds.length < 20
    ) {
      const imdbId = fallbackMatch[1];
      if (!idSet.has(imdbId)) {
        idSet.add(imdbId);
        imdbIds.push(imdbId);
      }
    }
  }

  return imdbIds;
}
