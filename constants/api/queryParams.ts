/**
 * API query parameter names
 * Centralized to avoid hardcoding query param names in multiple places
 */

export const QUERY_PARAMS = {
  /**
   * User mood filter
   * Values: mood enum values
   */
  MOOD: 'mood',
  
  /**
   * User attention level filter
   * Values: attention enum values
   */
  ATTENTION: 'attention',
  
  /**
   * Content type filter
   * Values: 'movie' | 'tv' | 'all'
   */
  TYPE: 'type',
  
  /**
   * Tab selector (for lists page)
   * Values: tab identifiers
   */
  TAB: 'tab',
} as const;

