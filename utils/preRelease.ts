/**
 * Pre-release detection helper
 * Determines if a title (movie, TV show, or season) is in pre-release
 * 
 * Rules:
 * - Movies: release_date exists and release_date > now (UTC)
 * - TV shows: first_air_date exists and first_air_date > now (UTC)
 * - Seasons: air_date exists and air_date > now (UTC)
 * - Null/invalid dates → consider released
 * - Always compare in UTC
 */

type MovieOrTVShow = {
  release_date?: string | null;
  first_air_date?: string | null;
};

type Season = {
  air_date?: string | null;
};

export function isPreRelease(
  title: MovieOrTVShow | Season
): boolean {
  const now = new Date();
  const nowUTC = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );

  // Check for movie (release_date)
  if ('release_date' in title && title.release_date) {
    try {
      const releaseDate = new Date(title.release_date + 'T00:00:00Z');
      if (!isNaN(releaseDate.getTime())) {
        return releaseDate > nowUTC;
      }
    } catch {
      // Invalid date, consider released
      return false;
    }
  }

  // Check for TV show (first_air_date)
  if ('first_air_date' in title && title.first_air_date) {
    try {
      const airDate = new Date(title.first_air_date + 'T00:00:00Z');
      if (!isNaN(airDate.getTime())) {
        return airDate > nowUTC;
      }
    } catch {
      // Invalid date, consider released
      return false;
    }
  }

  // Check for season (air_date)
  if ('air_date' in title && title.air_date) {
    try {
      const airDate = new Date(title.air_date + 'T00:00:00Z');
      if (!isNaN(airDate.getTime())) {
        return airDate > nowUTC;
      }
    } catch {
      // Invalid date, consider released
      return false;
    }
  }

  // No valid date found or null → consider released
  return false;
}

