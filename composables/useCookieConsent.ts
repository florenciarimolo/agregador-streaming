import { ref, computed, readonly } from 'vue';

import { STORAGE_KEYS } from '@/constants/storage/keys';

export type CookieConsentStatus = 'accepted' | 'rejected' | 'unset';

/**
 * Composable to manage cookie consent
 * Uses localStorage to persist consent status
 */
export function useCookieConsent() {
  // Initialize from localStorage
  const getStoredConsent = (): CookieConsentStatus => {
    if (import.meta.client) {
      const stored = localStorage.getItem(STORAGE_KEYS.COOKIE_CONSENT);
      if (stored === 'accepted' || stored === 'rejected') {
        return stored as CookieConsentStatus;
      }
    }
    return 'unset';
  };

  const consentStatus = ref<CookieConsentStatus>(getStoredConsent());

  /**
   * Save consent status to localStorage
   */
  const saveConsent = (status: 'accepted' | 'rejected') => {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEYS.COOKIE_CONSENT, status);
      consentStatus.value = status;
    }
  };

  /**
   * Accept cookies
   */
  const acceptCookies = () => {
    saveConsent('accepted');
  };

  /**
   * Reject cookies
   */
  const rejectCookies = () => {
    saveConsent('rejected');
  };

  /**
   * Check if consent has been given
   */
  const hasConsent = computed(() => consentStatus.value === 'accepted');

  /**
   * Check if consent has been rejected
   */
  const hasRejected = computed(() => consentStatus.value === 'rejected');

  /**
   * Check if consent is unset (banner should be shown)
   */
  const isUnset = computed(() => consentStatus.value === 'unset');

  return {
    consentStatus: readonly(consentStatus),
    acceptCookies,
    rejectCookies,
    hasConsent,
    hasRejected,
    isUnset,
  };
}

