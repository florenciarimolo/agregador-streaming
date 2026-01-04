/**
 * Supabase/PostgreSQL error codes
 * Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */

/**
 * PostgREST error codes
 */
export const POSTGREST_ERROR_CODES = {
  /**
   * No rows returned (not found)
   * Used when a query expects a single row but finds none
   */
  NOT_FOUND: 'PGRST116',
} as const;

/**
 * PostgreSQL error codes
 */
export const POSTGRES_ERROR_CODES = {
  /**
   * Unique violation
   * Used when trying to insert a duplicate value in a unique column
   */
  UNIQUE_VIOLATION: '23505',
} as const;

/**
 * Type for PostgREST error codes
 */
export type PostgRESTErrorCode =
  (typeof POSTGREST_ERROR_CODES)[keyof typeof POSTGREST_ERROR_CODES];

/**
 * Type for PostgreSQL error codes
 */
export type PostgresErrorCode =
  (typeof POSTGRES_ERROR_CODES)[keyof typeof POSTGRES_ERROR_CODES];

/**
 * Helper function to check if an error is a "not found" error
 */
export function isNotFoundError(
  error: { code?: string } | null | undefined
): boolean {
  return error?.code === POSTGREST_ERROR_CODES.NOT_FOUND;
}

/**
 * Helper function to check if an error is a unique violation error
 */
export function isUniqueViolationError(
  error: { code?: string } | null | undefined
): boolean {
  return error?.code === POSTGRES_ERROR_CODES.UNIQUE_VIOLATION;
}

