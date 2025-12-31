/**
 * Enum for user title status values
 * Titles must have a single active status: watchlist / seen / not_interested
 */
export enum TitleStatus {
  WATCHLIST = 'watchlist',
  SEEN = 'seen',
  NOT_INTERESTED = 'not_interested',
}

/**
 * Type for title status values
 */
export type TitleStatusType =
  | TitleStatus.WATCHLIST
  | TitleStatus.SEEN
  | TitleStatus.NOT_INTERESTED;
