/**
 * Title status values
 * Domain constants for user title status
 * 
 * IMPORTANT: Product Decision - Liked Dependency
 * ==============================================
 * `liked` is NOT an independent status. It is an ATTRIBUTE of the `seen` status.
 *
 * Rules:
 * - `liked: true` can ONLY exist when `status === TITLE_STATUS.SEEN`
 * - `liked` cannot exist without `seen`
 * - When `seen` is removed, the entire `user_title_status` record is deleted
 *   (including `liked: true` if it was present)
 * - Do NOT attempt to maintain `liked` when removing `seen`
 *
 * This is a product decision to maintain data consistency and avoid orphaned states.
 */

export const TITLE_STATUS = {
  WATCHLIST: 'watchlist',
  SEEN: 'seen',
  NOT_INTERESTED: 'not_interested',
} as const;

/**
 * Type for title status values
 */
export type TitleStatusType =
  | typeof TITLE_STATUS.WATCHLIST
  | typeof TITLE_STATUS.SEEN
  | typeof TITLE_STATUS.NOT_INTERESTED;

