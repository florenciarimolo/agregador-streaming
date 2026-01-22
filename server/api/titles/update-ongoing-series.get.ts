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
 * Update ongoing TV series (Returning Series or In Production) from TMDB
 * Compares existing information with TMDB data and updates only what has changed
 * This helps detect new seasons, status changes (e.g., series ended), and other updates
 * Called by Vercel cron job daily at 4 AM UTC
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
    devError('[UpdateOngoingSeries] SUPABASE_SERVICE_ROLE_KEY not found');
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
    // Find ongoing TV series:
    // Status IN ('Returning Series', 'In Production')
    const { data: ongoingSeries, error: fetchError } = await supabase
      .from(TABLES.TITLES)
      .select(
        `${TITLES_COLUMNS.TMDB_ID}, ${TITLES_COLUMNS.TYPE}, ${TITLES_COLUMNS.STATUS}, ${TITLES_COLUMNS.FIRST_AIR_DATE}`
      )
      .eq(TITLES_COLUMNS.TYPE, MEDIA_TYPE.TV)
      .in(TITLES_COLUMNS.STATUS, [
        TmdbStatus.RETURNING_SERIES,
        TmdbStatus.IN_PRODUCTION,
      ])
      .limit(100); // Limit to 100 series per run to avoid timeout

    if (fetchError) {
      devError('[UpdateOngoingSeries] Error fetching ongoing series:', fetchError);
      throw fetchError;
    }

    if (!ongoingSeries || ongoingSeries.length === 0) {
      devLog('[UpdateOngoingSeries] No ongoing series found');
      return { success: true, processed: 0, updated: 0, errors: 0 };
    }

    devLog(
      `[UpdateOngoingSeries] Found ${ongoingSeries.length} ongoing series to update`
    );

    const tmdbConfig = getTMDBConfig(DEFAULT_LANGUAGE, 'ES');
    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // Process each series
    for (const series of ongoingSeries) {
      const { tmdb_id: tmdbId } = series;

      try {
        processedCount++;

        // Fetch full series details from TMDB
        const fullResponse = await $fetch<TMDBTitleDetailsWithSeasons>(
          `${tmdbConfig.baseUrl}/tv/${tmdbId}`,
          {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              region: tmdbConfig.region,
            },
          }
        );

        if (!fullResponse) {
          devError(`[UpdateOngoingSeries] No response from TMDB for TV ${tmdbId}`);
          errorCount++;
          continue;
        }

        // Get existing series data to preserve all language keys and compare changes
        const { data: existingSeries } = await supabase
          .from(TABLES.TITLES)
          .select('*')
          .eq(TITLES_COLUMNS.TMDB_ID, tmdbId)
          .eq(TITLES_COLUMNS.TYPE, MEDIA_TYPE.TV)
          .maybeSingle();

        if (!existingSeries) {
          devError(
            `[UpdateOngoingSeries] Series ${tmdbId} not found in database`
          );
          errorCount++;
          continue;
        }

        // Prepare update data - only include fields that have changed
        const updateData: Record<string, unknown> = {};

        // Check if status has changed
        if (fullResponse.status && fullResponse.status !== existingSeries.status) {
          updateData[TITLES_COLUMNS.STATUS] = fullResponse.status;
          devLog(
            `[UpdateOngoingSeries] Status changed for ${tmdbId}: ${existingSeries.status} -> ${fullResponse.status}`
          );
        }

        // Merge title, overview, and poster_path with existing data (preserve all languages)
        const existingTitleJsonb: MultiLanguageText = existingSeries.title
          ? { ...(existingSeries.title as MultiLanguageText) }
          : {};
        const existingOverviewJsonb: MultiLanguageText = existingSeries.overview
          ? { ...(existingSeries.overview as MultiLanguageText) }
          : {};
        const existingPosterPathJsonb: MultiLanguageText = existingSeries
          .poster_path
          ? { ...(existingSeries.poster_path as MultiLanguageText) }
          : {};

        // Update with new data from TMDB (only if different or missing in current language)
        let titleChanged = false;
        if (fullResponse.name) {
          const newTitle = fullResponse.name;
          const currentTitleInLanguage =
            existingTitleJsonb[tmdbConfig.language];
          if (currentTitleInLanguage !== newTitle) {
            existingTitleJsonb[tmdbConfig.language] = newTitle;
            titleChanged = true;
          }
        }

        let overviewChanged = false;
        if (fullResponse.overview) {
          const newOverview = fullResponse.overview;
          const currentOverviewInLanguage =
            existingOverviewJsonb[tmdbConfig.language];
          if (currentOverviewInLanguage !== newOverview) {
            existingOverviewJsonb[tmdbConfig.language] = newOverview;
            overviewChanged = true;
          }
        }

        let posterPathChanged = false;
        if (fullResponse.poster_path) {
          const newPosterPath = fullResponse.poster_path;
          const currentPosterPathInLanguage =
            existingPosterPathJsonb[tmdbConfig.language];
          if (currentPosterPathInLanguage !== newPosterPath) {
            existingPosterPathJsonb[tmdbConfig.language] = newPosterPath;
            posterPathChanged = true;
          }
        }

        // Only update if something changed
        if (titleChanged || overviewChanged || posterPathChanged) {
          if (titleChanged) {
            updateData[TITLES_COLUMNS.TITLE] = existingTitleJsonb;
          }
          if (overviewChanged) {
            updateData[TITLES_COLUMNS.OVERVIEW] =
              Object.keys(existingOverviewJsonb).length > 0
                ? existingOverviewJsonb
                : null;
          }
          if (posterPathChanged) {
            updateData[TITLES_COLUMNS.POSTER_PATH] =
              Object.keys(existingPosterPathJsonb).length > 0
                ? existingPosterPathJsonb
                : null;
          }
        }

        // Check other fields that might have changed
        if (
          fullResponse.backdrop_path &&
          fullResponse.backdrop_path !== existingSeries.backdrop_path
        ) {
          updateData[TITLES_COLUMNS.BACKDROP_PATH] = fullResponse.backdrop_path;
        }

        if (
          fullResponse.vote_average !== null &&
          fullResponse.vote_average !== undefined &&
          fullResponse.vote_average !== existingSeries.vote_average
        ) {
          updateData[TITLES_COLUMNS.VOTE_AVERAGE] = fullResponse.vote_average;
        }

        if (
          fullResponse.first_air_date &&
          fullResponse.first_air_date !== existingSeries.first_air_date
        ) {
          updateData[TITLES_COLUMNS.FIRST_AIR_DATE] =
            fullResponse.first_air_date;
        }

        if (
          fullResponse.genres &&
          fullResponse.genres.length > 0 &&
          JSON.stringify(fullResponse.genres) !==
            JSON.stringify(existingSeries.genres)
        ) {
          updateData[TITLES_COLUMNS.GENRES] = fullResponse.genres;
        }

        // Update series in database only if there are changes
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from(TABLES.TITLES)
            .update(updateData)
            .eq(TITLES_COLUMNS.TMDB_ID, tmdbId)
            .eq(TITLES_COLUMNS.TYPE, MEDIA_TYPE.TV);

          if (updateError) {
            devError(
              `[UpdateOngoingSeries] Error updating series ${tmdbId}:`,
              updateError
            );
            errorCount++;
            continue;
          }

          updatedCount++;
          devLog(
            `[UpdateOngoingSeries] Updated TV ${tmdbId} (${fullResponse.name})`
          );
        } else {
          devLog(
            `[UpdateOngoingSeries] No changes detected for TV ${tmdbId} (${fullResponse.name})`
          );
        }

        // Always sync seasons (this will detect new seasons and update existing ones)
        if (fullResponse.seasons) {
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
            devLog(`[UpdateOngoingSeries] Synced seasons for TV show ${tmdbId}`);
          } catch (seasonError) {
            safeError(
              `[UpdateOngoingSeries] Error syncing seasons for TV show ${tmdbId}`,
              seasonError
            );
            // Don't increment errorCount for season sync errors - series was updated successfully
          }
        }
      } catch (seriesError) {
        safeError(
          `[UpdateOngoingSeries] Error processing TV ${tmdbId}`,
          seriesError
        );
        errorCount++;
        // Continue with next series
      }
    }

    return {
      success: true,
      processed: processedCount,
      updated: updatedCount,
      errors: errorCount,
    };
  } catch (error) {
    devError('[UpdateOngoingSeries] Error:', error);
    throw createError({
      statusCode: 500,
      message: 'Error updating ongoing series',
    });
  }
});
