import { createClient } from '@supabase/supabase-js';
import { devLog, devError, safeError } from '@/server/utils/logger';
import { getTMDBConfig } from '@/server/utils/config';
import { syncSeasonsFromTVShow } from '@/server/utils/season-sync';
import { TABLES } from '@/constants/db/tables';
import { TITLES_COLUMNS } from '@/constants/db/columns';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { TmdbStatus } from '@/types/enums/TmdbStatus';
import type { MultiLanguageText } from '@/services/titles';
import { DEFAULT_LANGUAGE } from '@/constants/languages';
type TMDBTitleDetailsWithSeasons = {
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number | null;
  status?: string;
  runtime?: number;
  genres: Array<{ id: number; name: string }>;
  release_date?: string | null;
  first_air_date?: string | null;
  seasons?: Array<{
    id: number;
    name: string;
    season_number: number;
    overview: string;
    air_date: string | null;
    poster_path: string | null;
    vote_average: number;
    episode_count?: number;
  }>;
};

/**
 * Update unreleased titles (movies and TV shows) and their seasons from TMDB
 * Called by Vercel cron job daily at 3 AM UTC
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Verify this is a cron job request (optional security check)
  const authHeader = event.node.req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  // Create Supabase client with service role key
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    devError('[UpdateUnreleased] SUPABASE_SERVICE_ROLE_KEY not found');
    throw createError({
      statusCode: 500,
      message: 'Server configuration error',
    });
  }

  const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    // Find unreleased titles:
    // 1. release_date > CURRENT_DATE (movies)
    // 2. first_air_date > CURRENT_DATE (TV shows)
    // 3. status IN ('Rumored', 'Planned', 'In Production', 'Post Production')
    const today = new Date().toISOString().split('T')[0];
    const unreleasedStatuses = [
      TmdbStatus.RUMORED,
      TmdbStatus.PLANNED,
      TmdbStatus.IN_PRODUCTION,
      TmdbStatus.POST_PRODUCTION,
    ].join(',');

    const { data: unreleasedTitles, error: fetchError } = await supabase
      .from(TABLES.TITLES)
      .select(`${TITLES_COLUMNS.TMDB_ID}, ${TITLES_COLUMNS.TYPE}, ${TITLES_COLUMNS.RELEASE_DATE}, ${TITLES_COLUMNS.FIRST_AIR_DATE}, ${TITLES_COLUMNS.STATUS}`)
      .or(`release_date.gt.${today},first_air_date.gt.${today},status.in.(${unreleasedStatuses})`)
      .limit(100); // Limit to 100 titles per run to avoid timeout

    if (fetchError) {
      devError('[UpdateUnreleased] Error fetching unreleased titles:', fetchError);
      throw fetchError;
    }

    if (!unreleasedTitles || unreleasedTitles.length === 0) {
      devLog('[UpdateUnreleased] No unreleased titles found');
      return { success: true, processed: 0, updated: 0, errors: 0 };
    }

    devLog(`[UpdateUnreleased] Found ${unreleasedTitles.length} unreleased titles to update`);

    const tmdbConfig = getTMDBConfig(DEFAULT_LANGUAGE, 'ES');
    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // Process each title
    for (const title of unreleasedTitles) {
      const { tmdb_id: tmdbId, type } = title;

      try {
        processedCount++;

        // Fetch full title details from TMDB
        const endpoint =
          type === MEDIA_TYPE.MOVIE ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;

        const fullResponse = await $fetch<TMDBTitleDetailsWithSeasons>(
          `${tmdbConfig.baseUrl}${endpoint}`,
          {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              region: tmdbConfig.region,
            },
          }
        );

        if (!fullResponse) {
          devError(`[UpdateUnreleased] No response from TMDB for ${type} ${tmdbId}`);
          errorCount++;
          continue;
        }

        // Get existing title data to preserve all language keys
        const { data: existingTitle } = await supabase
          .from(TABLES.TITLES)
          .select('*')
          .eq(TITLES_COLUMNS.TMDB_ID, tmdbId)
          .eq(TITLES_COLUMNS.TYPE, type)
          .maybeSingle();

        // Merge title, overview, and poster_path with existing data
        const existingTitleJsonb: MultiLanguageText = existingTitle?.title
          ? { ...(existingTitle.title as MultiLanguageText) }
          : {};
        const existingOverviewJsonb: MultiLanguageText = existingTitle?.overview
          ? { ...(existingTitle.overview as MultiLanguageText) }
          : {};
        const existingPosterPathJsonb: MultiLanguageText = existingTitle?.poster_path
          ? { ...(existingTitle.poster_path as MultiLanguageText) }
          : {};

        // Update with new data from TMDB
        if (fullResponse.title || fullResponse.name) {
          existingTitleJsonb[tmdbConfig.language] =
            fullResponse.title || fullResponse.name || '';
        }
        if (fullResponse.overview) {
          existingOverviewJsonb[tmdbConfig.language] = fullResponse.overview;
        }
        if (fullResponse.poster_path) {
          existingPosterPathJsonb[tmdbConfig.language] = fullResponse.poster_path;
        }

        // Prepare update data
        const updateData: Record<string, unknown> = {
          [TITLES_COLUMNS.TITLE]: existingTitleJsonb,
          [TITLES_COLUMNS.OVERVIEW]:
            Object.keys(existingOverviewJsonb).length > 0
              ? existingOverviewJsonb
              : null,
          [TITLES_COLUMNS.POSTER_PATH]:
            Object.keys(existingPosterPathJsonb).length > 0
              ? existingPosterPathJsonb
              : null,
          [TITLES_COLUMNS.GENRES]:
            (fullResponse.genres || []).length > 0
              ? fullResponse.genres
              : existingTitle?.genres || null,
          [TITLES_COLUMNS.BACKDROP_PATH]:
            fullResponse.backdrop_path ||
            existingTitle?.backdrop_path ||
            null,
          [TITLES_COLUMNS.VOTE_AVERAGE]:
            fullResponse.vote_average ?? existingTitle?.vote_average ?? null,
          [TITLES_COLUMNS.STATUS]: fullResponse.status || existingTitle?.status || null,
        };

        // Update date fields based on type
        if (type === MEDIA_TYPE.MOVIE) {
          updateData[TITLES_COLUMNS.RELEASE_DATE] =
            fullResponse.release_date ||
            existingTitle?.release_date ||
            null;
          updateData[TITLES_COLUMNS.RUNTIME] =
            fullResponse.runtime ?? existingTitle?.runtime ?? null;
        } else {
          updateData[TITLES_COLUMNS.FIRST_AIR_DATE] =
            fullResponse.first_air_date ||
            existingTitle?.first_air_date ||
            null;
        }

        // Update title in database
        const { error: updateError } = await supabase
          .from(TABLES.TITLES)
          .update(updateData)
          .eq(TITLES_COLUMNS.TMDB_ID, tmdbId)
          .eq(TITLES_COLUMNS.TYPE, type);

        if (updateError) {
          devError(
            `[UpdateUnreleased] Error updating title ${tmdbId}:`,
            updateError
          );
          errorCount++;
          continue;
        }

        updatedCount++;
        devLog(
          `[UpdateUnreleased] Updated ${type} ${tmdbId} (${fullResponse.title || fullResponse.name})`
        );

        // For TV shows, also update seasons
        if (type === MEDIA_TYPE.TV && fullResponse.seasons) {
          try {
            await syncSeasonsFromTVShow(
              tmdbId,
              fullResponse.seasons.map((s) => ({
                id: s.id,
                name: s.name,
                season_number: s.season_number,
                overview: s.overview,
                air_date: s.air_date || null,
                poster_path: s.poster_path,
                vote_average: s.vote_average || 0,
                episode_count: s.episode_count,
              })),
              supabase,
              tmdbConfig
            );
            devLog(`[UpdateUnreleased] Synced seasons for TV show ${tmdbId}`);
          } catch (seasonError) {
            safeError(
              `[UpdateUnreleased] Error syncing seasons for TV show ${tmdbId}`,
              seasonError
            );
            // Don't increment errorCount for season sync errors - title was updated successfully
          }
        }
      } catch (titleError) {
        safeError(
          `[UpdateUnreleased] Error processing ${type} ${tmdbId}`,
          titleError
        );
        errorCount++;
        // Continue with next title
      }
    }

    return {
      success: true,
      processed: processedCount,
      updated: updatedCount,
      errors: errorCount,
    };
  } catch (error) {
    devError('[UpdateUnreleased] Error:', error);
    throw createError({
      statusCode: 500,
      message: 'Error updating unreleased titles',
    });
  }
});
