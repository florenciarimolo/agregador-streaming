/**
 * Global middleware to synchronize i18n.locale with route.params.lang
 *
 * CRITICAL: The URL is the single source of truth for language.
 * This middleware ensures that i18n.locale is always synchronized with route.params.lang
 * on every route change.
 *
 * Rules:
 * - route.params.lang is the source of truth
 * - i18n.locale must always match the URL language
 * - This runs on every route change (client and server)
 * - No cookies, no stored state - only URL
 *
 * IMPORTANT: In Nuxt i18n with strategy: 'prefix', setLocale() expects the URL code
 * (e.g., 'es', 'en'), not the i18n code (e.g., 'es-ES', 'en-US').
 * Also, locale.value returns the URL code, not the i18n code.
 */

import { VALID_URL_CODES } from '@/constants/urlLanguageCodes';
import { useLogger } from '@/composables/useLogger';

export default defineNuxtRouteMiddleware(async (to) => {
  // Only run on client side (i18n is client-side only in this setup)
  if (import.meta.server) {
    return;
  }

  try {
    const route = to;
    const { locale, setLocale } = useI18n();

    // Get language from URL (source of truth)
    const langFromUrl = route.params?.lang as string | undefined;

    if (!langFromUrl) {
      // No language prefix - this is a legacy route
      // The legacy-redirect middleware will handle redirect
      // Don't change locale here, let the redirect happen first
      return;
    }

    // Normalize URL code (lowercase)
    const normalizedLangFromUrl = langFromUrl.toLowerCase();

    // Validate language code
    if (
      !VALID_URL_CODES.includes(
        normalizedLangFromUrl as (typeof VALID_URL_CODES)[number]
      )
    ) {
      // Invalid language code - let other middleware handle 404
      if (process.env.NODE_ENV === 'development') {
        const { logWarn } = useLogger();
        logWarn('[SyncLang] Invalid language code in URL', {
          langFromUrl,
        });
      }
      return;
    }

    // CRITICAL: Check if i18n.locale matches URL language
    // Both locale.value and langFromUrl are URL codes (e.g., 'es', 'en')
    // NOT i18n codes (e.g., 'es-ES', 'en-US')
    // With skipSettingLocaleOnNavigate: false, Nuxt i18n should sync automatically,
    // but we verify and sync explicitly as a backup to ensure translations are always correct
    if (locale.value !== normalizedLangFromUrl) {
      // Development-only logging removed

      // Set locale to match URL (this is the source of truth)
      // IMPORTANT: setLocale() expects URL code, not i18n code
      // This ensures translations are loaded for the correct language
      await setLocale(
        normalizedLangFromUrl as (typeof VALID_URL_CODES)[number]
      );

      // Verify synchronization (safety check)
      if (
        locale.value !== normalizedLangFromUrl &&
        process.env.NODE_ENV === 'development'
      ) {
        const { logWarn } = useLogger();
        logWarn('[SyncLang] Failed to synchronize locale', {
          expected: normalizedLangFromUrl,
          got: locale.value,
        });
      }
    }
  } catch (error) {
    // Don't block navigation if locale sync fails
    // Log error but continue
    if (process.env.NODE_ENV === 'development') {
      const { logError } = useLogger();
      logError('[SyncLang] Error synchronizing locale', error as Error);
    }
  }
});
