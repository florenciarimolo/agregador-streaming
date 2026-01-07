import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { TmdbGenreId } from '@/types/enums/TmdbGenreId';
import { WatchProviderType } from '@/types/enums/WatchProviderType';
import type { Mood } from '@/constants/domain/mood';
import type { Attention } from '@/constants/domain/attention';
import {
  BOOST_WEIGHTS,
  PROTECTION_FACTOR,
  ATTENTION_BOOSTS,
  MOOD_BOOSTS,
  ATTENUATION,
  RATING_THRESHOLDS,
  DURATION_THRESHOLDS,
} from '@/constants/recommendations';
import { ATTENTION } from '@/constants/domain/attention';
import { MOOD } from '@/constants/domain/mood';
import type { TitleData } from '@/services/recommendationPool';
import type { MultiLanguageText } from '@/services/titles';
import { getTitleInLanguage } from '@/services/titles';
import { TABLES } from '@/constants/db/tables';
import { TITLES_COLUMNS } from '@/constants/db/columns';
import { safeError } from '@/server/utils/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Calculate mood and attention boost factors for a recommendation
 * Returns multiplicative factors (e.g., 0.1 = +10%, -0.15 = -15%)
 * Priority: Attention > Mood (weighted combination)
 * Uses constants from '@/constants/recommendations for all boost values
 *
 * @returns { attentionFactor: number, moodFactor: number }
 */
export function calculateBoostFactors(
  genreIds: number[],
  voteAverage: number | null,
  runtime: number | null, // For movies
  episodeCount: number | null, // For TV shows
  type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV,
  mood?: Mood,
  attention?: Attention
): { attentionFactor: number; moodFactor: number } {
  let attentionFactor = 0;
  let moodFactor = 0;

  // Attention boost factors (priority)
  if (attention === ATTENTION.LOW) {
    // Short runtime/single episode boosts
    if (
      type === MEDIA_TYPE.MOVIE &&
      runtime &&
      runtime < DURATION_THRESHOLDS.SHORT_MOVIE_MINUTES
    ) {
      attentionFactor += ATTENTION_BOOSTS.LOW.SHORT_RUNTIME;
    } else if (
      type === MEDIA_TYPE.TV &&
      episodeCount &&
      episodeCount <= DURATION_THRESHOLDS.SINGLE_EPISODE
    ) {
      attentionFactor += ATTENTION_BOOSTS.LOW.SINGLE_EPISODE;
    }
    // Penalize complex genres (attenuated if baseScore is lower)
    if (
      genreIds.includes(TmdbGenreId.THRILLER) ||
      genreIds.includes(TmdbGenreId.MYSTERY) ||
      genreIds.includes(TmdbGenreId.SCI_FI)
    ) {
      // Attenuate penalty for lower-rated titles (they're already filtered by 6.5 minimum)
      const attenuationFactor =
        voteAverage && voteAverage < ATTENUATION.THRESHOLD
          ? ATTENUATION.FACTOR
          : 1.0;
      attentionFactor +=
        ATTENTION_BOOSTS.LOW.COMPLEX_GENRES_PENALTY * attenuationFactor;
    }
  } else if (attention === ATTENTION.HIGH) {
    // Complex genres boost
    if (
      genreIds.includes(TmdbGenreId.DRAMA) ||
      genreIds.includes(TmdbGenreId.THRILLER) ||
      genreIds.includes(TmdbGenreId.SCI_FI)
    ) {
      // Attenuate boost for lower-rated titles
      const attenuationFactor =
        voteAverage && voteAverage < ATTENUATION.THRESHOLD
          ? ATTENUATION.FACTOR
          : 1.0;
      attentionFactor +=
        ATTENTION_BOOSTS.HIGH.COMPLEX_GENRES * attenuationFactor;
    }
    // Boost complex narratives
    if (
      genreIds.includes(TmdbGenreId.MYSTERY) ||
      genreIds.includes(TmdbGenreId.THRILLER)
    ) {
      attentionFactor += ATTENTION_BOOSTS.HIGH.COMPLEX_NARRATIVES;
    }
    // Penalize trivial content (attenuated)
    if (
      genreIds.includes(TmdbGenreId.COMEDY) ||
      genreIds.includes(TmdbGenreId.ANIMATION)
    ) {
      const attenuationFactor =
        voteAverage && voteAverage < ATTENUATION.THRESHOLD
          ? ATTENUATION.FACTOR
          : 1.0;
      attentionFactor +=
        ATTENTION_BOOSTS.HIGH.TRIVIAL_CONTENT_PENALTY * attenuationFactor;
    }
  } else if (attention === ATTENTION.MEDIUM) {
    // Family genres boost
    if (
      genreIds.includes(TmdbGenreId.FAMILY) ||
      genreIds.includes(TmdbGenreId.COMEDY)
    ) {
      attentionFactor += ATTENTION_BOOSTS.MEDIUM.FAMILY_GENRES;
    }
  }

  // Mood boost factors (applied after attention)
  if (mood === MOOD.RELAX) {
    // Comedy, animation, family boosts
    if (
      genreIds.includes(TmdbGenreId.COMEDY) ||
      genreIds.includes(TmdbGenreId.ANIMATION)
    ) {
      moodFactor += MOOD_BOOSTS.RELAX.COMEDY_ANIMATION;
    }
    if (genreIds.includes(TmdbGenreId.FAMILY)) {
      moodFactor += MOOD_BOOSTS.RELAX.FAMILY;
    }
    // Thriller/horror penalty (attenuated)
    if (
      genreIds.includes(TmdbGenreId.THRILLER) ||
      genreIds.includes(TmdbGenreId.HORROR)
    ) {
      const attenuationFactor =
        voteAverage && voteAverage < ATTENUATION.THRESHOLD
          ? ATTENUATION.FACTOR
          : 1.0;
      moodFactor +=
        MOOD_BOOSTS.RELAX.THRILLER_HORROR_PENALTY * attenuationFactor;
    }
    // Dense drama penalty (attenuated)
    if (
      genreIds.includes(TmdbGenreId.DRAMA) &&
      voteAverage &&
      voteAverage < RATING_THRESHOLDS.DENSE_DRAMA
    ) {
      moodFactor += MOOD_BOOSTS.RELAX.DENSE_DRAMA_PENALTY * ATTENUATION.FACTOR;
    }
  } else if (mood === MOOD.LIGERO) {
    // Comedy boost
    if (genreIds.includes(TmdbGenreId.COMEDY)) {
      moodFactor += MOOD_BOOSTS.LIGERO.COMEDY;
    }
    // Adventure, family boost
    if (
      genreIds.includes(TmdbGenreId.ADVENTURE) ||
      genreIds.includes(TmdbGenreId.FAMILY)
    ) {
      moodFactor += MOOD_BOOSTS.LIGERO.ADVENTURE_FAMILY;
    }
    // Heavy drama penalty (attenuated)
    if (
      genreIds.includes(TmdbGenreId.DRAMA) &&
      voteAverage &&
      voteAverage < RATING_THRESHOLDS.HEAVY_DRAMA
    ) {
      moodFactor += MOOD_BOOSTS.LIGERO.HEAVY_DRAMA_PENALTY * ATTENUATION.FACTOR;
    }
  } else if (mood === MOOD.INTENSO) {
    // Thriller, action, crime boost
    if (
      genreIds.includes(TmdbGenreId.THRILLER) ||
      genreIds.includes(TmdbGenreId.ACTION) ||
      genreIds.includes(TmdbGenreId.CRIME)
    ) {
      moodFactor += MOOD_BOOSTS.INTENSO.THRILLER_ACTION_CRIME;
    }
    // High rating boost
    if (voteAverage && voteAverage >= RATING_THRESHOLDS.HIGH_RATING) {
      moodFactor += MOOD_BOOSTS.INTENSO.HIGH_RATING;
    }
    // Child animation penalty (attenuated)
    if (
      genreIds.includes(TmdbGenreId.ANIMATION) &&
      voteAverage &&
      voteAverage < RATING_THRESHOLDS.CHILD_ANIMATION
    ) {
      moodFactor +=
        MOOD_BOOSTS.INTENSO.CHILD_ANIMATION_PENALTY * ATTENUATION.FACTOR;
    }
  } else if (mood === MOOD.EMOCIONAL) {
    // Drama, romance boost
    if (
      genreIds.includes(TmdbGenreId.DRAMA) ||
      genreIds.includes(TmdbGenreId.ROMANCE)
    ) {
      moodFactor += MOOD_BOOSTS.EMOCIONAL.DRAMA_ROMANCE;
    }
    // Human stories boost
    if (genreIds.includes(TmdbGenreId.DRAMA)) {
      moodFactor += MOOD_BOOSTS.EMOCIONAL.HUMAN_STORIES;
    }
    // Empty action penalty (attenuated)
    if (
      genreIds.includes(TmdbGenreId.ACTION) &&
      (!voteAverage || voteAverage < RATING_THRESHOLDS.EMPTY_ACTION)
    ) {
      moodFactor +=
        MOOD_BOOSTS.EMOCIONAL.EMPTY_ACTION_PENALTY * ATTENUATION.FACTOR;
    }
  } else if (mood === MOOD.REFLEXIVO) {
    // Sci-Fi, mystery boost
    if (
      genreIds.includes(TmdbGenreId.SCI_FI) ||
      genreIds.includes(TmdbGenreId.MYSTERY)
    ) {
      moodFactor += MOOD_BOOSTS.REFLEXIVO.SCI_FI_MYSTERY;
    }
    // Documentary boost
    if (genreIds.includes(TmdbGenreId.DOCUMENTARY)) {
      moodFactor += MOOD_BOOSTS.REFLEXIVO.DOCUMENTARY;
    }
    // Simple comedy penalty (attenuated)
    if (
      genreIds.includes(TmdbGenreId.COMEDY) &&
      (!voteAverage || voteAverage < RATING_THRESHOLDS.SIMPLE_COMEDY)
    ) {
      moodFactor +=
        MOOD_BOOSTS.REFLEXIVO.SIMPLE_COMEDY_PENALTY * ATTENUATION.FACTOR;
    }
  }

  return { attentionFactor, moodFactor };
}

/**
 * Fetch watch providers for a title from TMDB
 * When filtering by providers, only returns flatrate providers
 */
export async function fetchWatchProviders(
  tmdbId: number,
  type: 'movie' | 'tv',
  region: string,
  tmdbConfig: { baseUrl: string; apiKey: string },
  onlyFlatrate: boolean = false,
  errorPrefix: string = '[Recommendations]'
): Promise<number[]> {
  try {
    const endpoint =
      type === MEDIA_TYPE.MOVIE
        ? `/movie/${tmdbId}/watch/providers`
        : `/tv/${tmdbId}/watch/providers`;
    const response = await $fetch<{
      results?: {
        [key: string]: {
          flatrate?: Array<{ provider_id: number }>;
          buy?: Array<{ provider_id: number }>;
          rent?: Array<{ provider_id: number }>;
        };
      };
    }>(`${tmdbConfig.baseUrl}${endpoint}`, {
      query: {
        api_key: tmdbConfig.apiKey,
      },
    });

    if (!response?.results) return [];

    // Get providers from the region
    const regionLower = region.toLowerCase();
    const regionUpper = region.toUpperCase();
    const regionData =
      response.results[regionLower] || response.results[regionUpper] || {};
    const providers: number[] = [];

    // When filtering by providers, only consider flatrate
    if (onlyFlatrate) {
      if (regionData[WatchProviderType.FLATRATE]) {
        providers.push(
          ...regionData[WatchProviderType.FLATRATE]!.map((p) => p.provider_id)
        );
      }
    } else {
      // Combine all provider types (for non-filtering scenarios)
      if (regionData[WatchProviderType.FLATRATE]) {
        providers.push(
          ...regionData[WatchProviderType.FLATRATE]!.map((p) => p.provider_id)
        );
      }
      if (regionData[WatchProviderType.BUY]) {
        providers.push(
          ...regionData[WatchProviderType.BUY]!.map((p) => p.provider_id)
        );
      }
      if (regionData[WatchProviderType.RENT]) {
        providers.push(
          ...regionData[WatchProviderType.RENT]!.map((p) => p.provider_id)
        );
      }
    }

    return providers;
  } catch (error) {
    safeError(`${errorPrefix} Error fetching providers for ${tmdbId}`, error);
    return [];
  }
}

/**
 * Filter entries by providers (flatrate only)
 * Only includes titles that have the selected providers in flatrate
 * Excludes titles that don't have the provider in flatrate
 */
export async function filterByProviders(
  entries: Array<{ tmdb_id: number; type: string }>,
  includedProviders: number[],
  region: string,
  tmdbConfig: { baseUrl: string; apiKey: string },
  errorPrefix: string = '[Recommendations]'
): Promise<Array<{ tmdb_id: number; type: string }>> {
  if (includedProviders.length === 0) {
    return entries;
  }

  const entriesWithProviders = await Promise.all(
    entries.map(async (entry) => {
      // Only fetch flatrate providers when filtering
      const titleFlatrateProviders = await fetchWatchProviders(
        entry.tmdb_id,
        entry.type as 'movie' | 'tv',
        region,
        tmdbConfig,
        true // onlyFlatrate = true
      );

      // If no flatrate provider data, exclude the title
      // (strict filtering: only include if we have data and it matches)
      if (titleFlatrateProviders.length === 0) {
        return null; // Exclude if no flatrate data
      }

      // Check if any of the title's flatrate providers match user's included providers
      const hasMatchingFlatrateProvider = titleFlatrateProviders.some(
        (providerId) => includedProviders.includes(providerId)
      );

      // Only include if there's a matching flatrate provider
      if (!hasMatchingFlatrateProvider) {
        return null; // Exclude if no matching flatrate provider
      }

      return entry;
    })
  );

  // Filter out null entries (excluded titles)
  return entriesWithProviders.filter(
    (entry): entry is NonNullable<typeof entry> => entry !== null
  );
}

/**
 * Get title data from titles table or TMDB if missing
 * IMPORTANT: title_data has been removed from recommendation_pool, all data comes from titles table
 */
export async function getTitleData(
  entry: { tmdb_id: number; type: string },
  language: string,
  region: string,
  supabase: SupabaseClient,
  tmdbConfig: { baseUrl: string; apiKey: string; language: string; region: string },
  errorPrefix: string = '[Recommendations]'
): Promise<TitleData | null> {
  // First try to get from titles table
  const { data: titleFromDb, error: dbError } = await supabase
    .from(TABLES.TITLES)
    .select('*')
    .eq(TITLES_COLUMNS.TMDB_ID, entry.tmdb_id)
    .eq(TITLES_COLUMNS.TYPE, entry.type)
    .maybeSingle();

  let titleJsonb: MultiLanguageText | null = null;
  let overviewJsonb: MultiLanguageText | null = null;
  let posterPathJsonb: MultiLanguageText | null = null;
  let genresFromDb: Array<{ id: number; name: string }> | null = null;

  // If found in DB, extract from JSONB
  if (titleFromDb && !dbError) {
    titleJsonb = titleFromDb.title as MultiLanguageText;
    overviewJsonb = titleFromDb.overview as MultiLanguageText | null;
    posterPathJsonb = titleFromDb.poster_path as MultiLanguageText | null;
    genresFromDb = titleFromDb.genres as Array<{
      id: number;
      name: string;
    }> | null;
  }

  // Check if the requested language exists in the JSONB (explicit check, no fallbacks)
  // IMPORTANT: We need to check if the exact language exists, not rely on getTitleInLanguage
  // which may return fallbacks. This ensures we fetch from TMDB when the language is missing.
  const hasExactLanguage =
    titleJsonb &&
    typeof titleJsonb === 'object' &&
    titleJsonb[language] !== undefined;
  const hasExactOverviewLanguage =
    overviewJsonb &&
    typeof overviewJsonb === 'object' &&
    overviewJsonb[language] !== undefined;

  if (import.meta.dev) {
    const availableLanguages = titleJsonb ? Object.keys(titleJsonb) : [];
    // eslint-disable-next-line no-console
    console.log(
      `${errorPrefix} For ${entry.tmdb_id}: requested language=${language}, available=${availableLanguages.join(', ')}, hasExactLanguage=${hasExactLanguage}`
    );
  }

  // Extract text in user's language from titles table (may return fallback if language missing)
  const extractedTitle = getTitleInLanguage(
    titleJsonb,
    language,
    region,
    false
  );
  const extractedOverview = getTitleInLanguage(
    overviewJsonb,
    language,
    region,
    false
  );
  const extractedPosterPath = getTitleInLanguage(
    posterPathJsonb,
    language,
    region,
    true
  );

  // Check if we need to fetch from TMDB
  // IMPORTANT: Check if exact language exists, not just if getTitleInLanguage returns something
  // (getTitleInLanguage may return fallbacks, which we don't want)
  const needsTitleFallback =
    !hasExactLanguage || !extractedTitle || extractedTitle.trim() === '';
  const needsOverviewFallback =
    !hasExactOverviewLanguage ||
    !extractedOverview ||
    extractedOverview.trim() === '';
  const needsFullFetch =
    !titleFromDb || needsTitleFallback || needsOverviewFallback;

  // If we have everything from titles table in the exact language, use it
  // IMPORTANT: Only use if we have the exact language (no fallbacks)
  if (
    !needsFullFetch &&
    hasExactLanguage &&
    hasExactOverviewLanguage &&
    extractedTitle &&
    extractedOverview
  ) {
    return {
      title: extractedTitle,
      overview: extractedOverview,
      poster_path: extractedPosterPath || null,
      backdrop_path: titleFromDb.backdrop_path || null,
      vote_average: titleFromDb.vote_average || null,
      genres: genresFromDb || [],
      release_date: titleFromDb.release_date || null,
      first_air_date: titleFromDb.first_air_date || null,
      language: language,
    };
  }

  // Fetch from TMDB if needed (missing in titles table or missing in language)
  try {
    const endpoint =
      entry.type === MEDIA_TYPE.MOVIE
        ? `/movie/${entry.tmdb_id}`
        : `/tv/${entry.tmdb_id}`;
    const tmdbResponse = await $fetch<{
      title?: string;
      name?: string;
      overview?: string;
      poster_path?: string | null;
      backdrop_path?: string | null;
      vote_average?: number | null;
      status?: string;
      genres?: Array<{ id: number; name: string }>;
      release_date?: string | null;
      first_air_date?: string | null;
    }>(`${tmdbConfig.baseUrl}${endpoint}`, {
      query: {
        api_key: tmdbConfig.apiKey,
        language: tmdbConfig.language,
        region: tmdbConfig.region,
      },
    });

    if (!tmdbResponse) return null;

    // Merge with existing DB data for titles table update
    // IMPORTANT: Preserve all existing language keys, only add/update the current language
    const mergedTitleJsonb: MultiLanguageText = { ...(titleJsonb || {}) };
    const mergedOverviewJsonb: MultiLanguageText = {
      ...(overviewJsonb || {}),
    };
    const mergedPosterPathJsonb: MultiLanguageText = {
      ...(posterPathJsonb || {}),
    };

    // Add TMDB data in ISO format (merge, don't overwrite existing languages)
    const titleText = tmdbResponse.title || tmdbResponse.name || '';
    let finalOverview = tmdbResponse.overview || '';
    
    if (titleText) {
      mergedTitleJsonb[language] = titleText;
    }
    if (tmdbResponse.overview) {
      mergedOverviewJsonb[language] = tmdbResponse.overview;
    }
    if (tmdbResponse.poster_path) {
      mergedPosterPathJsonb[language] = tmdbResponse.poster_path;
    }

    // If overview is still empty, try fetching with primary language of region as fallback
    if (needsOverviewFallback) {
      const { fetchOverviewWithPrimaryLanguageFallback } = await import('@/server/utils/title-extraction');
      finalOverview = await fetchOverviewWithPrimaryLanguageFallback(
        finalOverview,
        entry.tmdb_id,
        entry.type,
        language,
        region,
        endpoint,
        mergedOverviewJsonb,
        supabase
      );
    }

    // Update titles table with TMDB data
    // IMPORTANT: Use upsert to merge, preserving all existing language keys in JSONB
    // We do this synchronously to ensure data is saved before returning
    try {
      // First, get existing data to ensure we preserve all languages
      const { data: existingTitle } = await supabase
        .from(TABLES.TITLES)
        .select(
          `${TITLES_COLUMNS.TITLE}, ${TITLES_COLUMNS.OVERVIEW}, ${TITLES_COLUMNS.POSTER_PATH}, ${TITLES_COLUMNS.GENRES}, ${TITLES_COLUMNS.BACKDROP_PATH}, ${TITLES_COLUMNS.VOTE_AVERAGE}, ${TITLES_COLUMNS.RELEASE_DATE}, ${TITLES_COLUMNS.FIRST_AIR_DATE}`
        )
        .eq(TITLES_COLUMNS.TMDB_ID, entry.tmdb_id)
        .eq(TITLES_COLUMNS.TYPE, entry.type)
        .maybeSingle();

      // Merge with existing data to preserve all language keys
      const finalTitleJsonb: MultiLanguageText = existingTitle?.title
        ? {
            ...(existingTitle.title as MultiLanguageText),
            ...mergedTitleJsonb,
          }
        : mergedTitleJsonb;
      const finalOverviewJsonb: MultiLanguageText = existingTitle?.overview
        ? {
            ...(existingTitle.overview as MultiLanguageText),
            ...mergedOverviewJsonb,
          }
        : mergedOverviewJsonb;
      const finalPosterPathJsonb: MultiLanguageText =
        existingTitle?.poster_path
          ? {
              ...(existingTitle.poster_path as MultiLanguageText),
              ...mergedPosterPathJsonb,
            }
          : mergedPosterPathJsonb;

      if (import.meta.dev) {
        // eslint-disable-next-line no-console
        console.log(
          `${errorPrefix} Updating titles for ${entry.tmdb_id}: adding language ${language}, final languages=${Object.keys(finalTitleJsonb).join(', ')}`
        );
      }

      const { error: upsertError } = await supabase
        .from(TABLES.TITLES)
        .upsert(
          {
            [TITLES_COLUMNS.TMDB_ID]: entry.tmdb_id,
            [TITLES_COLUMNS.TYPE]: entry.type,
            [TITLES_COLUMNS.TITLE]: finalTitleJsonb,
            [TITLES_COLUMNS.OVERVIEW]:
              Object.keys(finalOverviewJsonb).length > 0
                ? finalOverviewJsonb
                : null,
            [TITLES_COLUMNS.POSTER_PATH]:
              Object.keys(finalPosterPathJsonb).length > 0
                ? finalPosterPathJsonb
                : null,
            [TITLES_COLUMNS.GENRES]:
              (tmdbResponse.genres || []).length > 0
                ? tmdbResponse.genres
                : existingTitle?.genres || null,
            [TITLES_COLUMNS.BACKDROP_PATH]:
              tmdbResponse.backdrop_path ||
              existingTitle?.backdrop_path ||
              null,
            [TITLES_COLUMNS.VOTE_AVERAGE]:
              tmdbResponse.vote_average ??
              existingTitle?.vote_average ??
              null,
            [TITLES_COLUMNS.RELEASE_DATE]:
              tmdbResponse.release_date ||
              existingTitle?.release_date ||
              null,
            [TITLES_COLUMNS.FIRST_AIR_DATE]:
              tmdbResponse.first_air_date ||
              existingTitle?.first_air_date ||
              null,
            [TITLES_COLUMNS.STATUS]:
              tmdbResponse.status ||
              existingTitle?.status ||
              null,
          },
          {
            onConflict: TITLES_COLUMNS.TMDB_ID,
          }
        );

      if (upsertError) {
        if (import.meta.dev) {
          // eslint-disable-next-line no-console
          console.error(
            `${errorPrefix} Error updating titles cache:`,
            upsertError
          );
        }
      } else if (import.meta.dev) {
        // eslint-disable-next-line no-console
        console.log(
          `${errorPrefix} Successfully updated titles for ${entry.tmdb_id} with language ${language}`
        );
      }
    } catch (error: unknown) {
      if (import.meta.dev) {
        // eslint-disable-next-line no-console
        console.error(`${errorPrefix} Error updating titles cache:`, error);
      }
    }

    // Return title data for this request
    // Use finalOverview which may include primary language fallback
    return {
      title: titleText,
      overview: finalOverview,
      poster_path: tmdbResponse.poster_path || null,
      backdrop_path: tmdbResponse.backdrop_path || null,
      vote_average: tmdbResponse.vote_average || null,
      genres: (tmdbResponse.genres || []).map((g) => ({
        id: g.id,
        name: g.name,
      })),
      release_date: tmdbResponse.release_date || null,
      first_air_date: tmdbResponse.first_air_date || null,
      language: language,
    };
  } catch (error) {
    safeError(
      `${errorPrefix} Error fetching title data for ${entry.tmdb_id}`,
      error
    );
    return null;
  }
}

