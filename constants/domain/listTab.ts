/**
 * List tab values
 * Domain constants for list page tabs
 */

export const LIST_TAB = {
  LIKED: 'liked',
  SEEN: 'seen',
  NOT_INTERESTED: 'not-interested',
} as const;

/**
 * Type for list tab values
 */
export type ListTab = (typeof LIST_TAB)[keyof typeof LIST_TAB];

