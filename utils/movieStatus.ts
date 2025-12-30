/**
 * Determines if a movie is currently in theaters based on release date
 * A movie is considered "in theaters" if it was released within the last 12 weeks
 * or if it's scheduled to be released in the near future (within 2 weeks)
 */
export function isMovieInTheaters(
  releaseDate: string | null | undefined
): boolean {
  if (!releaseDate) return false;

  try {
    const release = new Date(releaseDate);
    const now = new Date();
    const diffTime = now.getTime() - release.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Movie is in theaters if:
    // 1. Released within the last 12 weeks (84 days)
    // 2. Or scheduled to be released within the next 2 weeks (future release)
    return diffDays >= -14 && diffDays <= 84;
  } catch {
    return false;
  }
}
