/**
 * Middleware to set i18n_redirected cookie when user explicitly accesses /:lang route
 *
 * Rules:
 * - Only runs when user accesses a route with language prefix (/:lang)
 * - Sets i18n_redirected cookie with the i18n code (e.g., 'es-ES') from the URL lang param
 * - No redirect, just sets the cookie for future visits
 */

import { getI18nCodeFromUrlCode } from '@/composables/useLangFromUrl';

export default defineNuxtRouteMiddleware((to) => {
  // Only run on server side to set cookie
  if (!import.meta.server) {
    return;
  }

  // Only process routes with language prefix
  const langFromUrl = to.params?.lang as string | undefined;
  if (!langFromUrl) {
    return;
  }

  // Map URL code to i18n code
  const i18nCode = getI18nCodeFromUrlCode(langFromUrl);
  if (!i18nCode) {
    return;
  }

  // Set i18n_redirected cookie with i18n code (e.g., 'es-ES')
  const languageCookie = useCookie('i18n_redirected', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  // Only set if different from current value to avoid unnecessary cookie updates
  if (languageCookie.value !== i18nCode) {
    languageCookie.value = i18nCode;
  }
});
