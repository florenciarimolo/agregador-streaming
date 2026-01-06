/**
 * TMDB status values for movies and TV shows
 * These represent the production/release status of a title
 */
export enum TmdbStatus {
  RUMORED = 'Rumored',
  PLANNED = 'Planned',
  PILOT = 'Pilot', // TV shows only
  IN_PRODUCTION = 'In Production',
  POST_PRODUCTION = 'Post Production',
  RELEASED = 'Released',
  CANCELED = 'Canceled',
  RETURNING_SERIES = 'Returning Series', // TV shows only
  ENDED = 'Ended', // TV shows only
}

/**
 * Type for TMDB status values
 */
export type TmdbStatusType = (typeof TmdbStatus)[keyof typeof TmdbStatus];

