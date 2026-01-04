/**
 * Prioritize content values for recommendations
 * Domain constants for content prioritization preferences
 */

export const PRIORITIZE_CONTENT = {
  NEW: 'new',
  CLASSICS: 'classics',
  TOP_RATED: 'top_rated',
} as const;

/**
 * Type for prioritize content values
 */
export type PrioritizeContent = (typeof PRIORITIZE_CONTENT)[keyof typeof PRIORITIZE_CONTENT];

