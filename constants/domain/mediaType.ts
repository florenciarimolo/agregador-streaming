/**
 * Media type values
 * Domain constants for content types
 */

export const MEDIA_TYPE = {
  MOVIE: 'movie',
  TV: 'tv',
} as const;

/**
 * Type for media type values
 */
export type MediaType = (typeof MEDIA_TYPE)[keyof typeof MEDIA_TYPE];

