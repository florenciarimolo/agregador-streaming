import { ref, computed, readonly } from 'vue';

import { STORAGE_KEYS } from '@/constants/storage/keys';
import { CookieConsentStatus } from '@/types/enums/CookieConsentStatus';

/**
 * Composable to manage cookie consent
 * Uses localStorage to persist consent status
 */
export function useCookieConsent() {
  // Initialize from localStorage
  const getStoredConsent = (): CookieConsentStatus => {
    if (import.meta.client) {
      const stored = localStorage.getItem(STORAGE_KEYS.COOKIE_CONSENT);
      if (
        stored === CookieConsentStatus.ACCEPTED ||
        stored === CookieConsentStatus.REJECTED
      ) {
        return stored as CookieConsentStatus;
      }
    }
    return CookieConsentStatus.UNSET;
  };

  const consentStatus = ref<CookieConsentStatus>(getStoredConsent());

  /**
   * Save consent status to localStorage
   */
  const saveConsent = (
    status: CookieConsentStatus.ACCEPTED | CookieConsentStatus.REJECTED
  ) => {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEYS.COOKIE_CONSENT, status);
      consentStatus.value = status;
    }
  };

  /**
   * Accept cookies
   */
  const acceptCookies = () => {
    saveConsent(CookieConsentStatus.ACCEPTED);
  };

  /**
   * Reject cookies (only optional/preference cookies)
   * Essential cookies (like consent status itself) are always kept
   */
  const rejectCookies = () => {
    if (import.meta.client) {
      // Remove optional/preference cookies
      // Theme preferences
      localStorage.removeItem(STORAGE_KEYS.THEME);
      localStorage.removeItem(STORAGE_KEYS.THEME_MANUAL);

      // Note: Essential cookies are kept:
      // - COOKIE_CONSENT (needed to remember user's choice)
      // - Supabase session cookies (handled by Supabase, essential for auth)
      // - YouTube cookies (handled by YouTube, essential for video playback)

      // Save rejection status (this is an essential cookie)
      saveConsent(CookieConsentStatus.REJECTED);
    }
  };

  /**
   * Check if consent has been given
   */
  const hasConsent = computed(
    () => consentStatus.value === CookieConsentStatus.ACCEPTED
  );

  /**
   * Check if consent has been rejected
   */
  const hasRejected = computed(
    () => consentStatus.value === CookieConsentStatus.REJECTED
  );

  /**
   * Check if consent is unset (banner should be shown)
   */
  const isUnset = computed(
    () => consentStatus.value === CookieConsentStatus.UNSET
  );

  return {
    consentStatus: readonly(consentStatus),
    acceptCookies,
    rejectCookies,
    hasConsent,
    hasRejected,
    isUnset,
  };
}
