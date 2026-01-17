/**
 * Title action values
 * Domain constants for title actions (liked, follow, etc.)
 */

export const TITLE_ACTION = {
  LIKED: 'liked',
  REMOVE_LIKED: 'remove-liked',
  FOLLOW: 'follow',
  UNFOLLOW: 'unfollow',
} as const;

/**
 * Type for title action values
 */
export type TitleActionType =
  | typeof TITLE_ACTION.LIKED
  | typeof TITLE_ACTION.REMOVE_LIKED
  | typeof TITLE_ACTION.FOLLOW
  | typeof TITLE_ACTION.UNFOLLOW;
