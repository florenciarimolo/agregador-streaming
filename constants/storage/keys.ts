/**
 * localStorage keys
 * Centralized to avoid hardcoding keys in multiple places
 */

export const STORAGE_KEYS = {
  /**
   * Authentication recovery flow flag
   * Format: { value: 1, ts: timestamp } or legacy '1'
   */
  AUTH_RECOVERY: 'auth:recovery',
  
  /**
   * Theme preference
   * Values: 'light' | 'dark'
   */
  THEME: 'theme',
  
  /**
   * Manual theme override flag
   * Values: 'true' | null
   */
  THEME_MANUAL: 'theme-manual',
  
  /**
   * Cookie consent status
   * Values: 'accepted' | 'rejected'
   */
  COOKIE_CONSENT: 'cookie_consent',
} as const;

