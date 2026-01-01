// useSupabaseClient is auto-imported by Nuxt
import { TABLES, TITLES_FIELDS } from './constants';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';

// Multi-language structure: {"es": "...", "ca": "...", "eu": "...", "gl": "...", "en": "..."}
export type MultiLanguageText = Record<string, string>;

export interface InsertTitleData {
  tmdb_id: number;
  title: MultiLanguageText; // JSONB multi-language
  type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
  poster_path: string | null;
  backdrop_path?: string | null;
  overview?: MultiLanguageText | null; // JSONB multi-language
  release_date?: string | null;
  first_air_date?: string | null;
  genres?: Array<{ id: number; name: string }> | null; // Full genre objects
  vote_average?: number | null;
}

/**
 * Extract text in the specified language from multi-language JSONB
 * Falls back to 'es' if language not available
 */
export function getTitleInLanguage(
  titleJsonb: MultiLanguageText | null | undefined,
  language: string
): string {
  if (!titleJsonb || typeof titleJsonb !== 'object') {
    return '';
  }

  // Try requested language first
  if (titleJsonb[language]) {
    return titleJsonb[language];
  }

  // Fallback to Spanish
  if (titleJsonb.es) {
    return titleJsonb.es;
  }

  // Fallback to any available language
  const firstKey = Object.keys(titleJsonb)[0];
  return firstKey ? titleJsonb[firstKey] : '';
}

/**
 * Insert a new title into the database
 */
export async function insertTitle(data: InsertTitleData) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.TITLES)
    .insert({
      [TITLES_FIELDS.TMDB_ID]: data.tmdb_id,
      [TITLES_FIELDS.TITLE]: data.title,
      [TITLES_FIELDS.TYPE]: data.type,
      [TITLES_FIELDS.POSTER_PATH]: data.poster_path,
      [TITLES_FIELDS.BACKDROP_PATH]: data.backdrop_path || null,
      [TITLES_FIELDS.OVERVIEW]: data.overview || null,
      [TITLES_FIELDS.RELEASE_DATE]: data.release_date || null,
      [TITLES_FIELDS.FIRST_AIR_DATE]: data.first_air_date || null,
      [TITLES_FIELDS.GENRES]: data.genres || null,
      [TITLES_FIELDS.VOTE_AVERAGE]: data.vote_average || null,
    })
    .select('id')
    .single();
}

/**
 * Check if a title exists by tmdb_id and type
 */
export async function getTitleByTmdbId(
  tmdbId: number,
  type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv
) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.TITLES)
    .select('id')
    .eq(TITLES_FIELDS.TMDB_ID, tmdbId)
    .eq(TITLES_FIELDS.TYPE, type)
    .maybeSingle();
}

/**
 * Get titles by tmdb_ids
 * Returns titles with language-specific text extracted from JSONB
 * If language is missing, fetches from TMDB and updates the database
 * @param tmdbIds Array of TMDB IDs
 * @param language Language code (e.g., 'es', 'ca', 'eu', 'gl', 'en'). Defaults to 'es'
 */
export async function getTitlesByTmdbIds(
  tmdbIds: number[],
  language: string = 'es'
) {
  const supabase = useSupabaseClient();
  const { data, error } = await supabase
    .from(TABLES.TITLES)
    .select('id, title, type, poster_path, tmdb_id, overview, genres')
    .in(TITLES_FIELDS.TMDB_ID, tmdbIds);

  if (error || !data) {
    return { data: null, error };
  }

  // Check which titles need language updates and fetch them in parallel
  const updatePromises: Array<Promise<{ tmdb_id: number; title?: string; overview?: string }>> = [];
  const titlesNeedingUpdate: Array<{
    title: any;
    titleJsonb: MultiLanguageText;
    overviewJsonb: MultiLanguageText | null;
    hasTitleLanguage: boolean;
    hasOverviewLanguage: boolean;
  }> = [];

  data.forEach((title) => {
    const titleJsonb = title.title as MultiLanguageText;
    const overviewJsonb = title.overview as MultiLanguageText | null;

    // Check if language is missing
    const hasTitleLanguage =
      titleJsonb && typeof titleJsonb === 'object' && titleJsonb[language];
    const hasOverviewLanguage =
      overviewJsonb &&
      typeof overviewJsonb === 'object' &&
      overviewJsonb[language];

    // If language is missing, fetch from TMDB and update
    if (!hasTitleLanguage || !hasOverviewLanguage) {
      titlesNeedingUpdate.push({
        title,
        titleJsonb,
        overviewJsonb,
        hasTitleLanguage,
        hasOverviewLanguage,
      });

      const updatePromise = $fetch<{
        success: boolean;
        title?: string;
        overview?: string;
      }>('/api/titles/update-language', {
        method: 'POST',
        body: {
          tmdb_id: title.tmdb_id,
          type: title.type,
        },
      })
        .then((response) => ({
          tmdb_id: title.tmdb_id,
          title: response.title,
          overview: response.overview,
        }))
        .catch((err) => {
          console.error(
            `Error updating language for title ${title.tmdb_id}:`,
            err
          );
          return { tmdb_id: title.tmdb_id };
        });
      updatePromises.push(updatePromise);
    }
  });

  // Wait for all updates to complete
  if (updatePromises.length > 0) {
    const updateResults = await Promise.all(updatePromises);
    const updateMap = new Map(
      updateResults.map((r) => [r.tmdb_id, { title: r.title, overview: r.overview }])
    );

    // Update local data with fetched languages
    titlesNeedingUpdate.forEach((item) => {
      const update = updateMap.get(item.title.tmdb_id);
      if (update) {
        if (update.title && !item.hasTitleLanguage) {
          item.titleJsonb[language] = update.title;
        }
        if (update.overview && !item.hasOverviewLanguage) {
          if (!item.overviewJsonb) {
            item.title.overview = { [language]: update.overview };
          } else {
            item.overviewJsonb[language] = update.overview;
          }
        }
      }
    });
  }

  // Extract language-specific text from JSONB fields (now with updated languages)
  const titlesWithLanguage = data.map((title) => ({
    ...title,
    title: getTitleInLanguage(title.title as MultiLanguageText, language),
    overview: getTitleInLanguage(
      title.overview as MultiLanguageText | null,
      language
    ),
  }));

  return { data: titlesWithLanguage, error: null };
}

/**
 * Get title with specific language extracted
 * If language is missing, fetches from TMDB and updates the database
 */
export async function getTitleByTmdbIdWithLanguage(
  tmdbId: number,
  type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv,
  language: string = 'es'
) {
  const supabase = useSupabaseClient();
  const { data, error } = await supabase
    .from(TABLES.TITLES)
    .select('*')
    .eq(TITLES_FIELDS.TMDB_ID, tmdbId)
    .eq(TITLES_FIELDS.TYPE, type)
    .maybeSingle();

  if (error || !data) {
    return { data: null, error };
  }

  const titleJsonb = data.title as MultiLanguageText;
  const overviewJsonb = data.overview as MultiLanguageText | null;

  // Check if language is missing
  const hasTitleLanguage =
    titleJsonb && typeof titleJsonb === 'object' && titleJsonb[language];
  const hasOverviewLanguage =
    overviewJsonb &&
    typeof overviewJsonb === 'object' &&
    overviewJsonb[language];

  // If language is missing, fetch from TMDB and update
  if (!hasTitleLanguage || !hasOverviewLanguage) {
    try {
      const response = await $fetch<{
        success: boolean;
        title?: string;
        overview?: string;
      }>('/api/titles/update-language', {
        method: 'POST',
        body: {
          tmdb_id: tmdbId,
          type: type,
        },
      });

      if (response.success) {
        // Update local data with fetched language
        if (response.title && !hasTitleLanguage) {
          titleJsonb[language] = response.title;
        }
        if (response.overview && !hasOverviewLanguage) {
          if (!overviewJsonb) {
            data.overview = { [language]: response.overview };
          } else {
            overviewJsonb[language] = response.overview;
          }
        }
      }
    } catch (err) {
      console.error(`Error updating language for title ${tmdbId}:`, err);
      // Continue with fallback language
    }
  }

  // Extract language-specific text
  const titleText = getTitleInLanguage(titleJsonb, language);
  const overviewText = getTitleInLanguage(overviewJsonb, language);

  return {
    data: {
      ...data,
      title: titleText,
      overview: overviewText,
    },
    error: null,
  };
}
