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
   * Values: Theme.LIGHT | Theme.DARK (from @/types/enums/Theme)
   */
  THEME: 'theme',
  
  /**
   * Manual theme override flag
   * Values: 'true' | null
   */
  THEME_MANUAL: 'theme-manual',
  
  /**
   * Cookie consent status
   * Values: CookieConsentStatus.ACCEPTED | CookieConsentStatus.REJECTED (from @/types/enums/CookieConsentStatus)
   */
  COOKIE_CONSENT: 'cookie_consent',
} as const;

