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
 */

import { getI18nCodeFromUrlCode } from '@/composables/useLangFromUrl';

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

    // Map URL code to i18n code
    const i18nCodeFromUrl = getI18nCodeFromUrlCode(langFromUrl);

    if (!i18nCodeFromUrl) {
      // Invalid language code - let other middleware handle 404
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[sync-lang] Invalid language code in URL: ${langFromUrl}`
        );
      }
      return;
    }

    // CRITICAL: Check if i18n.locale matches URL language
    // If not, synchronize it immediately
    if (locale.value !== i18nCodeFromUrl) {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[sync-lang] Synchronizing i18n.locale: ${locale.value} -> ${i18nCodeFromUrl} (from URL: /${langFromUrl}/...)`
        );
      }

      // Set locale to match URL (this is the source of truth)
      await setLocale(i18nCodeFromUrl);

      // Verify synchronization (safety check)
      if (locale.value !== i18nCodeFromUrl) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `[sync-lang] WARNING: Failed to synchronize locale. Expected: ${i18nCodeFromUrl}, Got: ${locale.value}`
          );
        }
      }
    }
  } catch (error) {
    // Don't block navigation if locale sync fails
    // Log error but continue
    if (process.env.NODE_ENV === 'development') {
      console.error('[sync-lang] Error synchronizing locale:', error);
    }
  }
});

