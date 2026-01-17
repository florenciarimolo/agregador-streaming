/**
 * TV Show Status Utility
 * 
 * Helper functions to check TV show status from the database
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/constants/db/tables';
import { TITLES_COLUMNS } from '@/constants/db/columns';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { TmdbStatus } from '@/types/enums/TmdbStatus';
import { logError } from '@/server/utils/logger';

/**
 * Check if a TV show status indicates the show is still ongoing
 * 
 * A TV show is considered "still ongoing" if its status is NOT:
 * - "Ended"
 * - "Canceled"
 * 
 * This is a pure function that checks the status value directly.
 * Use this when you already have the status string.
 * 
 * @param status TV show status string (from TMDB or database)
 * @returns true if the show is still ongoing, false if ended/cancelled
 */
export function isTVShowStatusOngoing(status: string | null | undefined): boolean {
  if (!status) {
    // Status not available - assume ongoing to be safe (don't unfollow)
    return true;
  }

  // Show is still ongoing if status is NOT "Ended" or "Canceled"
  return status !== TmdbStatus.ENDED && status !== TmdbStatus.CANCELED;
}

/**
 * Check if a TV show is still ongoing (not ended or cancelled)
 * 
 * Fetches the status from the database and checks if the show is ongoing.
 * 
 * @param tmdbSeriesId TV series TMDB ID
 * @param supabase Supabase client
 * @returns true if the show is still ongoing, false if ended/cancelled, null if status is unknown
 */
export async function isTVShowStillOngoing(
  tmdbSeriesId: number,
  supabase: SupabaseClient
): Promise<boolean | null> {
  try {
    const { data: title, error } = await supabase
      .from(TABLES.TITLES)
      .select(TITLES_COLUMNS.STATUS)
      .eq(TITLES_COLUMNS.TMDB_ID, tmdbSeriesId)
      .eq(TITLES_COLUMNS.TYPE, MEDIA_TYPE.TV)
      .maybeSingle();

    if (error) {
      logError('[TVShowStatus] Error fetching TV show status', error as Error, {
        tmdbSeriesId,
      });
      return null; // Unknown status
    }

    // Use the extracted common function
    return isTVShowStatusOngoing(title?.status);
  } catch (error) {
    logError('[TVShowStatus] Unexpected error checking TV show status', error as Error, {
      tmdbSeriesId,
    });
    return null; // Unknown status
  }
}
