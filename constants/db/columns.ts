/**
 * Database column/field names
 * Centralized to avoid hardcoding column names in multiple places
 */

/**
 * Field names for profiles table
 */
export const PROFILES_COLUMNS = {
  ID: 'id',
  EMAIL: 'email',
  DISPLAY_NAME: 'display_name',
  AVATAR_URL: 'avatar_url',
  SETTINGS: 'settings',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  ONBOARDING_COMPLETED: 'onboarding_completed',
} as const;

/**
 * Field names for titles table
 */
export const TITLES_COLUMNS = {
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
export const USER_TITLE_STATUS_COLUMNS = {
  ID: 'id',
  USER_ID: 'user_id',
  TMDB_ID: 'tmdb_id',
  TYPE: 'type',
  STATUS: 'status',
  LIKED: 'liked',
  CREATED_AT: 'created_at',
} as const;

/**
 * Field names for user_preferences table
 */
export const USER_PREFERENCES_COLUMNS = {
  ID: 'id',
  USER_ID: 'user_id',
  FAVORITE_GENRES: 'favorite_genres',
  INCLUDED_PROVIDERS: 'included_providers',
  REGION: 'region',
  EXPLORATION_MODE: 'exploration_mode',
  PRIORITIZE_CONTENT: 'prioritize_content',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
} as const;

/**
 * Field names for recommendation_pool table
 */
export const RECOMMENDATION_POOL_COLUMNS = {
  ID: 'id',
  USER_ID: 'user_id',
  TMDB_ID: 'tmdb_id',
  TYPE: 'type',
  SOURCE: 'source',
  SCORE: 'score',
  EXPLANATION_CODE: 'explanation_code',
  CREATED_AT: 'created_at',
  LAST_SHOWN_AT: 'last_shown_at',
} as const;

