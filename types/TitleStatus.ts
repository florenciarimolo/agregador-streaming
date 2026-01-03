/**
 * Enum for user title status values
 * Titles must have a single active status: watchlist / seen / not_interested
 *
 * IMPORTANT: Product Decision - Liked Dependency
 * ==============================================
 * `liked` is NOT an independent status. It is an ATTRIBUTE of the `seen` status.
 *
 * Rules:
 * - `liked: true` can ONLY exist when `status === 'seen'`
 * - `liked` cannot exist without `seen`
 * - When `seen` is removed, the entire `user_title_status` record is deleted
 *   (including `liked: true` if it was present)
 * - Do NOT attempt to maintain `liked` when removing `seen`
 *
 * This is a product decision to maintain data consistency and avoid orphaned states.
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
