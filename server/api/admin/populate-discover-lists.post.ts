/**
 * POST /api/admin/populate-discover-lists
 * Temporary endpoint to populate discover lists with titles
 * 
 * Logic:
 * - For each title, search if it exists in Supabase titles table
 * - If it exists, insert into the corresponding discover list
 * - If it doesn't exist, search in TMDB, save to titles, then insert into list
 */

import { createError, defineEventHandler } from 'h3';
import { createClient } from '@supabase/supabase-js';
import { getTMDBConfig } from '@/server/utils/config';
import { TABLES } from '@/constants/db/tables';
import {
  DISCOVER_LISTS_COLUMNS,
  DISCOVER_LIST_ITEMS_COLUMNS,
  TITLES_COLUMNS,
} from '@/constants/db/columns';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGE_CODES } from '@/constants/languages';
import type { TMDBSearchResult } from '@/types/tmdb/Search';
import type { MultiLanguageText } from '@/services/titles';

// Map list names to slugs
const LIST_SLUGS: Record<string, string> = {
  'Intense Movies': 'intense-movies',
  'Short Movies for Today': 'short-movies-for-today',
  'Easy TV Shows': 'easy-tv-shows',
  'Easy to Start TV Shows': 'easy-to-start-tv-shows',
  'Feel Good Movies': 'feel-good-movies',
  'Binge-Worthy TV Shows': 'binge-worthy-tv-shows',
  'Twist Movies': 'twist-movies',
  'Hook from Episode One Series': 'hook-from-episode-one-series',
  'Turn Your Brain Off Movies': 'turn-your-brain-off-movies',
  'Short TV Series': 'short-tv-series',
};

// Discover lists data
const DISCOVER_LISTS = [
  {
    name: 'Intense Movies',
    type: 'movie' as const,
    titles: [
      'Whiplash',
      'Uncut Gems',
      'Sicario',
      'Prisoners',
      'Black Swan',
      'Requiem for a Dream',
      'Nightcrawler',
      'No Country for Old Men',
      'Irreversible',
      'The Lighthouse',
    ],
  },
  {
    name: 'Short Movies for Today',
    type: 'movie' as const,
    titles: [
      'Locke',
      'Coherence',
      'Buried',
      'Before Sunset',
      'Victoria',
      'Run Lola Run',
      'Primer',
      'A Ghost Story',
      'The Guilty',
      'Shiva Baby',
    ],
  },
  {
    name: 'Easy TV Shows',
    type: 'tv' as const,
    titles: [
      'Ted Lasso',
      'Shrinking',
      'Sex Education',
      'Modern Family',
      'Brooklyn Nine-Nine',
      'The Bear',
      'Fleabag',
      'Only Murders in the Building',
      'Master of None',
      'Love',
    ],
  },
  {
    name: 'Easy to Start TV Shows',
    type: 'tv' as const,
    titles: [
      'The Night Of',
      'Chernobyl',
      "The Queen's Gambit",
      'Dark',
      'The Last of Us',
      'Money Heist',
      'Breaking Bad',
      'Severance',
      'Sharp Objects',
      'True Detective',
    ],
  },
  {
    name: 'Feel Good Movies',
    type: 'movie' as const,
    titles: [
      'Little Miss Sunshine',
      'The Peanut Butter Falcon',
      'Chef',
      'Frances Ha',
      'About Time',
      'Paterson',
      'Amélie',
      'The Intouchables',
      'CODA',
      'The Way Way Back',
    ],
  },
  {
    name: 'Binge-Worthy TV Shows',
    type: 'tv' as const,
    titles: [
      'Breaking Bad',
      'The Wire',
      'Dark',
      'Succession',
      'Money Heist',
      'Ozark',
      'Narcos',
      'The Americans',
      'The Bear',
      'Mr. Robot',
    ],
  },
  {
    name: 'Twist Movies',
    type: 'movie' as const,
    titles: [
      'The Prestige',
      'Oldboy',
      'Gone Girl',
      'Shutter Island',
      'Enemy',
      'The Game',
      'Mulholland Drive',
      'Memento',
      'The Sixth Sense',
      'Incendies',
    ],
  },
  {
    name: 'Hook from Episode One Series',
    type: 'tv' as const,
    titles: [
      'Lost',
      'Dark',
      'Breaking Bad',
      'The Boys',
      'Severance',
      'Westworld',
      'Money Heist',
      'The Night Of',
      'The Last of Us',
      'True Detective',
    ],
  },
  {
    name: 'Turn Your Brain Off Movies',
    type: 'movie' as const,
    titles: [
      "Ocean's Eleven",
      'The Nice Guys',
      'Knives Out',
      'Bullet Train',
      'Once Upon a Time in Hollywood',
      'The Big Lebowski',
      'Burn After Reading',
      'Game Night',
      'Palm Springs',
    ],
  },
  {
    name: 'Short TV Series',
    type: 'tv' as const,
    titles: [
      'Chernobyl',
      "The Queen's Gambit",
      'When They See Us',
      'Unbelievable',
      'Mare of Easttown',
      'The Night Of',
      'Bodyguard',
      'Sharp Objects',
      'Station Eleven',
      'Band of Brothers',
    ],
  },
];

/**
 * Search for a title in TMDB by name
 */
async function searchTitleInTMDB(
  titleName: string,
  expectedType: 'movie' | 'tv'
): Promise<{ tmdbId: number; type: 'movie' | 'tv' } | null> {
  const tmdbConfig = getTMDBConfig(DEFAULT_LANGUAGE, 'ES');

  try {
    const response = await $fetch<{
      results?: TMDBSearchResult[];
    }>(`${tmdbConfig.baseUrl}/search/multi`, {
      query: {
        api_key: tmdbConfig.apiKey,
        language: tmdbConfig.language,
        region: tmdbConfig.region,
        query: titleName,
      },
    });

    if (!response.results || response.results.length === 0) {
      console.warn(`[PopulateDiscover] No results found for: ${titleName}`);
      return null;
    }

    // Filter by expected type and find best match
    const filteredResults = response.results.filter(
      (result) => result.media_type === expectedType
    );

    if (filteredResults.length === 0) {
      console.warn(
        `[PopulateDiscover] No ${expectedType} results found for: ${titleName}`
      );
      return null;
    }

    // Get the first result (usually the most relevant)
    const bestMatch = filteredResults[0];
    return {
      tmdbId: bestMatch.id,
      type: bestMatch.media_type as 'movie' | 'tv',
    };
  } catch (error) {
    console.error(
      `[PopulateDiscover] Error searching TMDB for ${titleName}:`,
      error
    );
    return null;
  }
}

/**
 * Ensure title exists in database, fetching from TMDB if needed
 */
async function ensureTitleInDatabase(
  tmdbId: number,
  type: 'movie' | 'tv',
  supabase: ReturnType<typeof createClient>
): Promise<boolean> {
  // Check if title exists
  const { data: existingTitle, error: checkError } = await supabase
    .from(TABLES.TITLES)
    .select('tmdb_id')
    .eq(TITLES_COLUMNS.TMDB_ID, tmdbId)
    .eq(TITLES_COLUMNS.TYPE, type)
    .maybeSingle();

  if (checkError) {
    console.error(
      `[PopulateDiscover] Error checking title ${tmdbId}:`,
      checkError
    );
    return false;
  }

  // If title exists, we're done
  if (existingTitle) {
    return true;
  }

  // Title doesn't exist, fetch from TMDB and insert
  const tmdbConfig = getTMDBConfig(DEFAULT_LANGUAGE, 'ES');
  const supportedLanguages = SUPPORTED_LANGUAGE_CODES.map((code) => code);
  const endpoint = type === MEDIA_TYPE.MOVIE ? 'movie' : 'tv';

  try {
    // Fetch movie/TV data for all supported languages
    const languagePromises = supportedLanguages.map(async (lang) => {
      try {
        const response = await $fetch<{
          title?: string;
          name?: string;
          overview?: string;
          poster_path?: string | null;
          backdrop_path?: string | null;
          release_date?: string;
          first_air_date?: string;
          vote_average?: number;
          status?: string;
          genres?: Array<{ id: number; name: string }>;
        }>(`${tmdbConfig.baseUrl}/${endpoint}/${tmdbId}`, {
          query: {
            api_key: tmdbConfig.apiKey,
            language: lang,
            region: tmdbConfig.region,
          },
        });
        return { lang, data: response };
      } catch {
        return { lang, data: null };
      }
    });

    const languageResults = await Promise.all(languagePromises);

    // Build multi-language JSONB objects
    const titleMultiLang: MultiLanguageText = {};
    const overviewMultiLang: MultiLanguageText = {};
    const posterPathMultiLang: MultiLanguageText = {};
    let backdropPath: string | null = null;
    let releaseDate: string | null = null;
    let firstAirDate: string | null = null;
    let voteAverage: number | null = null;
    let status: string | null = null;
    let genres: Array<{ id: number; name: string }> = [];

    languageResults.forEach(({ lang, data }) => {
      if (data) {
        const titleText = data.title || data.name || '';
        if (titleText) titleMultiLang[lang] = titleText;
        if (data.overview) overviewMultiLang[lang] = data.overview;
        if (data.poster_path) posterPathMultiLang[lang] = data.poster_path;
        // Use first successful response for non-language fields
        if (!backdropPath && data.backdrop_path)
          backdropPath = data.backdrop_path;
        if (type === MEDIA_TYPE.MOVIE) {
          if (!releaseDate && data.release_date) releaseDate = data.release_date;
        } else {
          if (!firstAirDate && data.first_air_date)
            firstAirDate = data.first_air_date;
        }
        if (!voteAverage && data.vote_average) voteAverage = data.vote_average;
        if (!status && data.status) status = data.status;
        if (genres.length === 0 && data.genres) genres = data.genres;
      }
    });

    // Save to database if we got at least one language
    if (Object.keys(titleMultiLang).length > 0) {
      const insertData: Record<string, unknown> = {
        tmdb_id: tmdbId,
        type: type,
        title: titleMultiLang,
        overview: overviewMultiLang,
        poster_path:
          Object.keys(posterPathMultiLang).length > 0
            ? posterPathMultiLang
            : null,
        backdrop_path: backdropPath,
        vote_average: voteAverage,
        status: status,
        genres: genres,
      };

      if (type === MEDIA_TYPE.MOVIE) {
        insertData.release_date = releaseDate;
      } else {
        insertData.first_air_date = firstAirDate;
      }

      const { error: insertError } = await supabase
        .from(TABLES.TITLES)
        .upsert(insertData, {
          onConflict: 'tmdb_id',
        });

      if (insertError) {
        console.error(
          `[PopulateDiscover] Error inserting title ${tmdbId}:`,
          insertError
        );
        return false;
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error(
      `[PopulateDiscover] Error fetching title ${tmdbId} from TMDB:`,
      error
    );
    return false;
  }
}

/**
 * Insert title into discover list
 */
async function insertTitleIntoList(
  discoverListId: string,
  tmdbId: number,
  type: 'movie' | 'tv',
  position: number,
  supabase: ReturnType<typeof createClient>
): Promise<boolean> {
  // Check if item already exists
  const { data: existingItem, error: checkError } = await supabase
    .from(TABLES.DISCOVER_LIST_ITEMS)
    .select('id')
    .eq(DISCOVER_LIST_ITEMS_COLUMNS.DISCOVER_LIST_ID, discoverListId)
    .eq(DISCOVER_LIST_ITEMS_COLUMNS.TMDB_ID, tmdbId)
    .maybeSingle();

  if (checkError) {
    console.error(
      `[PopulateDiscover] Error checking list item ${tmdbId}:`,
      checkError
    );
    return false;
  }

  // If item already exists, update position
  if (existingItem) {
    const { error: updateError } = await supabase
      .from(TABLES.DISCOVER_LIST_ITEMS)
      .update({
        [DISCOVER_LIST_ITEMS_COLUMNS.POSITION]: position,
      })
      .eq('id', existingItem.id);

    if (updateError) {
      console.error(
        `[PopulateDiscover] Error updating list item ${tmdbId}:`,
        updateError
      );
      return false;
    }
    return true;
  }

  // Insert new item
  const { error: insertError } = await supabase
    .from(TABLES.DISCOVER_LIST_ITEMS)
    .insert({
      [DISCOVER_LIST_ITEMS_COLUMNS.DISCOVER_LIST_ID]: discoverListId,
      [DISCOVER_LIST_ITEMS_COLUMNS.TMDB_ID]: tmdbId,
      [DISCOVER_LIST_ITEMS_COLUMNS.TYPE]: type,
      [DISCOVER_LIST_ITEMS_COLUMNS.POSITION]: position,
    });

  if (insertError) {
    console.error(
      `[PopulateDiscover] Error inserting list item ${tmdbId}:`,
      insertError
    );
    return false;
  }

  return true;
}

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();

    // Create Supabase client with service role key
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;
    const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const results: {
      listName: string;
      slug: string;
      processed: number;
      inserted: number;
      errors: string[];
    }[] = [];

    // Process each list
    for (const listData of DISCOVER_LISTS) {
      const slug = LIST_SLUGS[listData.name];
      if (!slug) {
        console.warn(
          `[PopulateDiscover] No slug found for list: ${listData.name}`
        );
        continue;
      }

      // Get discover list ID
      const { data: discoverList, error: listError } = await supabase
        .from(TABLES.DISCOVER_LISTS)
        .select('id')
        .eq(DISCOVER_LISTS_COLUMNS.SLUG, slug)
        .maybeSingle();

      if (listError || !discoverList) {
        console.error(
          `[PopulateDiscover] Error fetching list ${slug}:`,
          listError
        );
        results.push({
          listName: listData.name,
          slug,
          processed: 0,
          inserted: 0,
          errors: [`Error fetching list: ${listError?.message || 'Not found'}`],
        });
        continue;
      }

      const listResult = {
        listName: listData.name,
        slug,
        processed: 0,
        inserted: 0,
        errors: [] as string[],
      };

      // Process each title in the list
      for (let position = 0; position < listData.titles.length; position++) {
        const titleName = listData.titles[position];
        listResult.processed++;

        try {
          // Search in TMDB
          const searchResult = await searchTitleInTMDB(
            titleName,
            listData.type
          );

          if (!searchResult) {
            listResult.errors.push(
              `Title not found in TMDB: ${titleName}`
            );
            continue;
          }

          // Ensure title exists in database
          const titleExists = await ensureTitleInDatabase(
            searchResult.tmdbId,
            searchResult.type,
            supabase
          );

          if (!titleExists) {
            listResult.errors.push(
              `Failed to ensure title in database: ${titleName} (${searchResult.tmdbId})`
            );
            continue;
          }

          // Insert into discover list
          const inserted = await insertTitleIntoList(
            discoverList.id,
            searchResult.tmdbId,
            searchResult.type,
            position + 1, // Position is 1-indexed
            supabase
          );

          if (inserted) {
            listResult.inserted++;
          } else {
            listResult.errors.push(
              `Failed to insert into list: ${titleName} (${searchResult.tmdbId})`
            );
          }
        } catch (error) {
          listResult.errors.push(
            `Error processing ${titleName}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      results.push(listResult);
    }

    return {
      success: true,
      results,
      summary: {
        totalLists: results.length,
        totalProcessed: results.reduce((sum, r) => sum + r.processed, 0),
        totalInserted: results.reduce((sum, r) => sum + r.inserted, 0),
        totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      },
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error populating discover lists',
      data: error,
    });
  }
});

