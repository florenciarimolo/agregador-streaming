/**
 * Database table names
 * Centralized to avoid hardcoding table names in multiple places
 */

export const TABLES = {
  PROFILES: 'profiles',
  TITLES: 'titles',
  USER_TITLE_STATUS: 'user_title_status',
  USER_TITLE_FOLLOWING: 'user_title_following',
  USER_EPISODE_STATUS: 'user_episode_status',
  USER_PREFERENCES: 'user_preferences',
  RECOMMENDATION_POOL: 'recommendation_pool',
  DISCOVER_LISTS: 'discover_lists',
  DISCOVER_LIST_ITEMS: 'discover_list_items',
  SEASONS: 'seasons',
} as const;

