// useSupabaseClient is auto-imported by Nuxt
import { TABLES, TITLES_FIELDS } from './constants';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import { hasUnexpectedCharacters } from '@/utils/language-detection';

// Multi-language structure: {"es": "...", "ca": "...", "eu": "...", "gl": "...", "en": "..."}
export type MultiLanguageText = Record<string, string>;

export interface InsertTitleData {
  tmdb_id: number;
  title: MultiLanguageText; // JSONB multi-language
  type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
  poster_path: MultiLanguageText | null; // JSONB multi-language
  backdrop_path?: string | null;
  overview?: MultiLanguageText | null; // JSONB multi-language
  release_date?: string | null;
  first_air_date?: string | null;
  genres?: Array<{ id: number; name: string }> | null; // Full genre objects
  vote_average?: number | null;
}

/**
 * Extract text in the specified language from multi-language JSONB
 * Falls back to 'es-ES' if language not available
 * If the title contains unexpected characters (non-Latin for ES region languages),
 * falls back to Spanish (primary language of ES region)
 *
 * @param titleJsonb The multi-language JSONB object
 * @param language The requested language code in ISO/TMDB format (e.g., 'es-ES', 'ca-ES', 'eu-ES', 'gl-ES', 'en-US')
 * @param userRegion Optional user region to determine primary language fallback
 */
export function getTitleInLanguage(
  titleJsonb: MultiLanguageText | null | undefined,
  language: string,
  userRegion?: string | null,
  isImagePath: boolean = false
): string {
  if (!titleJsonb || typeof titleJsonb !== 'object') {
    return '';
  }

  // Try requested language first (using ISO/TMDB format)
  if (titleJsonb[language]) {
    const titleText = titleJsonb[language];

    // IMPORTANT: Never check language for image paths - they are universal
    // IMPORTANT: Only check for non-Latin alphabet if we're in ES region and language is NOT Spanish
    // This check should ONLY trigger when TMDB returns titles in completely wrong alphabets
    // (e.g., Japanese, Chinese, Hindi alphabets when expecting Catalan)
    // Catalan diacritics (à, è, é, í, ò, ó, ú, ç) are Latin and should NOT trigger this
    if (!isImagePath) {
      const langCode = language.split('-')[0]?.toLowerCase() || '';
      if (userRegion && userRegion.toUpperCase() === 'ES' && langCode !== 'es') {
        const hasUnexpected = hasUnexpectedCharacters(titleText, langCode);
        if (hasUnexpected) {
          // Only fallback to Spanish if we detect non-Latin alphabet (more than 50% non-Latin chars)
          // This should be very rare - only when TMDB returns titles in completely wrong alphabets
          if (import.meta.dev) {
            console.log(
              `[getTitleInLanguage] Falling back to Spanish for language ${language} due to non-Latin alphabet in:`,
              titleText.substring(0, 50)
            );
          }
          // Try Spanish in ISO format first
          if (titleJsonb['es-ES']) {
            return titleJsonb['es-ES'];
          }
          // Fallback to any Spanish variant
          const spanishKey = Object.keys(titleJsonb).find((k) =>
            k.startsWith('es-')
          );
          if (spanishKey) {
            return titleJsonb[spanishKey];
          }
        }
      }
    }

    // Return the requested language title (Catalan, Basque, Galician, etc.)
    // This is the normal case - titles in Catalan should be returned as-is
    return titleText;
  }

  // Backward compatibility: try simple format (e.g., 'ca' instead of 'ca-ES')
  const langCode = language.split('-')[0]?.toLowerCase() || '';
  if (langCode && titleJsonb[langCode]) {
    if (import.meta.dev) {
      console.log(
        `[getTitleInLanguage] Using legacy format for language ${language}, found key: ${langCode}`
      );
    }
    return titleJsonb[langCode];
  }

  // Fallback to Spanish (ISO format)
  if (titleJsonb['es-ES']) {
    return titleJsonb['es-ES'];
  }

  // Fallback to Spanish (legacy format)
  if (titleJsonb['es']) {
    return titleJsonb['es'];
  }

  // Fallback to any Spanish variant
  const spanishKey = Object.keys(titleJsonb).find((k) => k.startsWith('es'));
  if (spanishKey) {
    return titleJsonb[spanishKey];
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
 * If title is missing, fetches from TMDB and inserts into database
 * If language is missing, fetches from TMDB and updates the database
 * @param tmdbIds Array of TMDB IDs
 * @param language Language code in ISO/TMDB format (e.g., 'es-ES', 'ca-ES', 'eu-ES', 'gl-ES', 'en-US'). Defaults to 'es-ES'
 * @param userRegion Optional user region to detect unexpected characters and fallback to primary language
 * @param titleTypes Optional map of tmdb_id to type ('movie' | 'tv') for titles that don't exist in database
 */
export async function getTitlesByTmdbIds(
  tmdbIds: number[],
  language: string = 'es-ES',
  userRegion?: string | null,
  titleTypes?: Map<number, 'movie' | 'tv'>
) {
  const supabase = useSupabaseClient();

  if (import.meta.dev) {
    console.log(
      '[getTitlesByTmdbIds] Fetching titles for tmdbIds:',
      tmdbIds,
      'with language:',
      language
    );
  }

  const result = await supabase
    .from(TABLES.TITLES)
    .select('id, title, type, poster_path, tmdb_id, overview, genres')
    .in(TITLES_FIELDS.TMDB_ID, tmdbIds);

  let { data } = result;
  const { error } = result;

  if (error) {
    console.error('[getTitlesByTmdbIds] Error fetching titles:', error);
    return { data: null, error };
  }

  // Initialize data as empty array if null
  if (!data) {
    data = [];
  }

  const foundTmdbIds = new Set(data.map((t) => t.tmdb_id));
  const missingTmdbIds = tmdbIds.filter((id) => !foundTmdbIds.has(id));

  // If there are missing titles and we have type information, fetch them from TMDB
  if (missingTmdbIds.length > 0 && titleTypes) {
    if (import.meta.dev) {
      console.log(
        '[getTitlesByTmdbIds] Missing titles, fetching from TMDB:',
        missingTmdbIds
      );
    }

    // Fetch missing titles from TMDB in parallel
    const fetchPromises = missingTmdbIds.map(async (tmdbId) => {
      const type = titleTypes.get(tmdbId);
      if (!type) {
        console.warn(
          `[getTitlesByTmdbIds] No type found for tmdb_id ${tmdbId}, skipping`
        );
        return null;
      }

      try {
        // Use the TMDB API endpoints which automatically insert into database
        const endpoint = type === 'movie' ? 'movies' : 'tvshows';
        await $fetch(`/api/tmdb/${endpoint}/${tmdbId}`, {
          query: {
            language,
          },
        });
        if (import.meta.dev) {
          console.log(
            `[getTitlesByTmdbIds] Successfully fetched and inserted title ${tmdbId} from TMDB`
          );
        }
        return tmdbId;
      } catch (err) {
        console.error(
          `[getTitlesByTmdbIds] Error fetching title ${tmdbId} from TMDB:`,
          err
        );
        return null;
      }
    });

    await Promise.all(fetchPromises);

    // Reload titles from database after fetching from TMDB
    const { data: reloadedData, error: reloadError } = await supabase
      .from(TABLES.TITLES)
      .select('id, title, type, poster_path, tmdb_id, overview, genres')
      .in(TITLES_FIELDS.TMDB_ID, tmdbIds);

    if (reloadError) {
      console.error(
        '[getTitlesByTmdbIds] Error reloading titles after TMDB fetch:',
        reloadError
      );
    } else if (reloadedData) {
      // Use reloaded data which includes the newly fetched titles
      data = reloadedData;
      if (import.meta.dev) {
        console.log(
          `[getTitlesByTmdbIds] Reloaded ${data.length} titles from database after TMDB fetch`
        );
      }
    }
  }

  if (!data || data.length === 0) {
    if (import.meta.dev) {
      console.warn(
        '[getTitlesByTmdbIds] No titles found in database for tmdbIds:',
        tmdbIds
      );
    }
    return { data: [], error: null };
  }

  if (import.meta.dev) {
    console.log(
      '[getTitlesByTmdbIds] Found',
      data.length,
      'titles in database'
    );
    // Check what language keys exist in the first title
    if (data.length > 0) {
      const firstTitle = data[0];
      const titleJsonb = firstTitle.title as MultiLanguageText;
      if (titleJsonb && typeof titleJsonb === 'object') {
        console.log(
          '[getTitlesByTmdbIds] Sample title language keys:',
          Object.keys(titleJsonb)
        );
        console.log(
          '[getTitlesByTmdbIds] Looking for language:',
          language,
          'exists:',
          !!titleJsonb[language]
        );
      }
    }
  }

  // Check which titles need language updates and fetch them in parallel
  const updatePromises: Array<
    Promise<{
      tmdb_id: number;
      title?: string;
      overview?: string;
      poster_path?: string;
    }>
  > = [];
  const titlesNeedingUpdate: Array<{
    title: Record<string, unknown>;
    titleJsonb: MultiLanguageText;
    overviewJsonb: MultiLanguageText | null;
    posterPathJsonb: MultiLanguageText | null;
    hasTitleLanguage: boolean;
    hasOverviewLanguage: boolean;
    hasPosterPathLanguage: boolean;
  }> = [];

  data.forEach((title) => {
    const titleJsonb = title.title as MultiLanguageText;
    const overviewJsonb = title.overview as MultiLanguageText | null;
    const posterPathJsonb = title.poster_path as MultiLanguageText | null;

    // Check if language is missing
    const hasTitleLanguage = Boolean(
      titleJsonb && typeof titleJsonb === 'object' && titleJsonb[language]
    );
    const hasOverviewLanguage = Boolean(
      overviewJsonb &&
      typeof overviewJsonb === 'object' &&
      overviewJsonb[language]
    );
    const hasPosterPathLanguage = Boolean(
      posterPathJsonb &&
      typeof posterPathJsonb === 'object' &&
      posterPathJsonb[language]
    );

    // If language is missing, fetch from TMDB and update
    if (!hasTitleLanguage || !hasOverviewLanguage || !hasPosterPathLanguage) {
      titlesNeedingUpdate.push({
        title,
        titleJsonb,
        overviewJsonb,
        posterPathJsonb,
        hasTitleLanguage,
        hasOverviewLanguage,
        hasPosterPathLanguage,
      });

      const updatePromise = $fetch<{
        success: boolean;
        title?: string;
        overview?: string;
        poster_path?: string;
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
          poster_path: response.poster_path,
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

    // After updating via API, reload the data from database to ensure we have the latest JSONB
    // This ensures the language codes in JSONB match the ISO/TMDB format (e.g., 'ca-ES', 'es-ES')
    const updatedTmdbIds = updateResults
      .filter((r) => r.title || r.overview || r.poster_path)
      .map((r) => r.tmdb_id);

    if (updatedTmdbIds.length > 0) {
      const { data: updatedData, error: reloadError } = await supabase
        .from(TABLES.TITLES)
        .select('id, title, type, poster_path, tmdb_id, overview, genres')
        .in(TITLES_FIELDS.TMDB_ID, updatedTmdbIds);

      if (!reloadError && updatedData) {
        // Update the data array with the reloaded data
        const updatedDataMap = new Map(updatedData.map((t) => [t.tmdb_id, t]));

        data.forEach((title, index) => {
          const updated = updatedDataMap.get(title.tmdb_id);
          if (updated) {
            // Replace with the updated data from database
            data[index] = updated;
          }
        });
      }
    }
  }

  // Extract language-specific text from JSONB fields (now with updated languages)
  const titlesWithLanguage = data.map((title) => ({
    ...title,
    title: getTitleInLanguage(
      title.title as MultiLanguageText,
      language,
      userRegion
    ),
    overview: getTitleInLanguage(
      title.overview as MultiLanguageText | null,
      language,
      userRegion
    ),
    poster_path: getTitleInLanguage(
      title.poster_path as MultiLanguageText | null,
      language,
      userRegion,
      true // isImagePath = true - don't check language for image paths
    ),
  }));

  return { data: titlesWithLanguage, error: null };
}

/**
 * Get title with specific language extracted
 * If language is missing, fetches from TMDB and updates the database
 * @param language Language code in ISO/TMDB format (e.g., 'es-ES', 'ca-ES', 'eu-ES', 'gl-ES', 'en-US'). Defaults to 'es-ES'
 */
export async function getTitleByTmdbIdWithLanguage(
  tmdbId: number,
  type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv,
  language: string = 'es-ES',
  userRegion?: string | null
) {
  const supabase = useSupabaseClient();
  const result = await supabase
    .from(TABLES.TITLES)
    .select('*')
    .eq(TITLES_FIELDS.TMDB_ID, tmdbId)
    .eq(TITLES_FIELDS.TYPE, type)
    .maybeSingle();

  let { data } = result;
  const { error } = result;

  if (error || !data) {
    return { data: null, error };
  }

  let titleJsonb = data.title as MultiLanguageText;
  let overviewJsonb = data.overview as MultiLanguageText | null;
  let posterPathJsonb = data.poster_path as MultiLanguageText | null;

  // Check if language is missing
  const hasTitleLanguage =
    titleJsonb && typeof titleJsonb === 'object' && titleJsonb[language];
  const hasOverviewLanguage =
    overviewJsonb &&
    typeof overviewJsonb === 'object' &&
    overviewJsonb[language];
  const hasPosterPathLanguage =
    posterPathJsonb &&
    typeof posterPathJsonb === 'object' &&
    posterPathJsonb[language];

  // If language is missing, fetch from TMDB and update
  if (!hasTitleLanguage || !hasOverviewLanguage || !hasPosterPathLanguage) {
    try {
      const response = await $fetch<{
        success: boolean;
        title?: string;
        overview?: string;
        poster_path?: string;
      }>('/api/titles/update-language', {
        method: 'POST',
        body: {
          tmdb_id: tmdbId,
          type: type,
        },
      });

      if (response.success) {
        // Reload data from database to ensure we have the latest JSONB with correct language codes
        // This ensures the language codes in JSONB match the ISO/TMDB format (e.g., 'ca-ES', 'es-ES')
        const { data: reloadedData, error: reloadError } = await supabase
          .from(TABLES.TITLES)
          .select('*')
          .eq(TITLES_FIELDS.TMDB_ID, tmdbId)
          .eq(TITLES_FIELDS.TYPE, type)
          .maybeSingle();

        if (!reloadError && reloadedData) {
          // Use the reloaded data which has the updated JSONB
          data = reloadedData;
          // Update references to the reloaded JSONB
          const reloadedTitleJsonb = reloadedData.title as MultiLanguageText;
          const reloadedOverviewJsonb =
            reloadedData.overview as MultiLanguageText | null;
          const reloadedPosterPathJsonb =
            reloadedData.poster_path as MultiLanguageText | null;

          // Update local references
          titleJsonb = reloadedTitleJsonb;
          overviewJsonb = reloadedOverviewJsonb;
          posterPathJsonb = reloadedPosterPathJsonb;
        } else {
          // Fallback: update local data if reload failed
          if (response.title && !hasTitleLanguage) {
            titleJsonb[language] = response.title;
          }
          if (response.overview && !hasOverviewLanguage) {
            if (!overviewJsonb) {
              data.overview = { [language]: response.overview };
              overviewJsonb = data.overview as MultiLanguageText;
            } else {
              overviewJsonb[language] = response.overview;
            }
          }
          if (response.poster_path && !hasPosterPathLanguage) {
            if (!posterPathJsonb) {
              data.poster_path = { [language]: response.poster_path };
              posterPathJsonb = data.poster_path as MultiLanguageText;
            } else {
              posterPathJsonb[language] = response.poster_path;
            }
          }
        }
      }
    } catch (err) {
      console.error(`Error updating language for title ${tmdbId}:`, err);
      // Continue with fallback language
    }
  }

  // Extract language-specific text
  const titleText = getTitleInLanguage(titleJsonb, language, userRegion);
  const posterPathText = getTitleInLanguage(
    posterPathJsonb,
    language,
    userRegion,
    true // isImagePath = true - don't check language for image paths
  );
  const overviewText = getTitleInLanguage(overviewJsonb, language, userRegion);

  return {
    data: {
      ...data,
      title: titleText,
      overview: overviewText,
      poster_path: posterPathText,
    },
    error: null,
  };
}
