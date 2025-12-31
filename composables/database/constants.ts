/**
 * Database table names
 */
export const TABLES = {
  PROFILES: 'profiles',
  TITLES: 'titles',
  USER_TITLE_STATUS: 'user_title_status',
} as const;

/**
 * Field names for profiles table
 */
export const PROFILES_FIELDS = {
  ID: 'id',
  EMAIL: 'email',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  ONBOARDING_COMPLETED: 'onboarding_completed',
} as const;

/**
 * Field names for titles table
 */
export const TITLES_FIELDS = {
  ID: 'id',
  TMDB_ID: 'tmdb_id',
  TITLE: 'title',
  TYPE: 'type',
  POSTER_PATH: 'poster_path',
  BACKDROP_PATH: 'backdrop_path',
  OVERVIEW: 'overview',
  RELEASE_DATE: 'release_date',
  FIRST_AIR_DATE: 'first_air_date',
  GENRES: 'genres',
  VOTE_AVERAGE: 'vote_average',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
} as const;

/**
 * Field names for user_title_status table
 */
export const USER_TITLE_STATUS_FIELDS = {
  ID: 'id',
  USER_ID: 'user_id',
  TMDB_ID: 'tmdb_id',
  STATUS: 'status',
  LIKED: 'liked',
  CREATED_AT: 'created_at',
} as const;
