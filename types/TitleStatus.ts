/**
 * Enum for user title status values
 */
export enum TitleStatus {
  SEEN = 'seen',
  NOT_INTERESTED = 'not_interested',
  WATCH_LATER = 'watch_later',
}

/**
 * Type for title status values
 */
export type TitleStatusType =
  | TitleStatus.SEEN
  | TitleStatus.NOT_INTERESTED
  | TitleStatus.WATCH_LATER;
