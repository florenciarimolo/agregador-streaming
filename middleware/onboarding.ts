/**
 * Onboarding middleware
 * Handles authentication and onboarding checks for the home page (/:lang/)
 *
 * Rules:
 * - If NO session → allow access to /:lang/
 * - If HAS session:
 *   - Wait for auth to be initialized
 *   - Load profile
 *   - If onboarding_completed === false → redirect to /:lang/onboarding
 *   - If onboarding_completed === true → allow access to /:lang/
 *
 * Architecture: This middleware runs on client-side only and accesses Pinia stores.
 * Stores are initialized in app.vue via useAuthInit(), so they should be available
 * when this middleware runs.
 */
import { useUserStore } from '@/stores/user';

import { DEFAULT_LANGUAGE_URL_CODE } from '@/constants/urlLanguageCodes';

/**
 * Get language from route params
 * @param route - Route object
 * @returns Language URL code (e.g., 'es', 'en') or DEFAULT_LANGUAGE_URL_CODE as default
 */
const getLangFromRoute = (route: { params?: { lang?: string } }): string => {
  const langParam = route.params?.lang as string | undefined;
  if (langParam) {
    return langParam.toLowerCase();
  }
  // Default to DEFAULT_LANGUAGE_URL_CODE if no lang param
  return DEFAULT_LANGUAGE_URL_CODE;
};

export default defineNuxtRouteMiddleware(
  async (to: { path: string; params?: { lang?: string } }) => {
    // Get language from URL
    const lang = getLangFromRoute(to);

    // Only apply to home page (with language prefix)
    const homePath = `/${lang}/`;
    if (to.path !== homePath && to.path !== `/${lang}`) {
      return;
    }

    // Only run on client side (Pinia is client-only)
    if (import.meta.server) {
      return;
    }

    const user = useSupabaseUser();
    const userStore = useUserStore();

    // If no session, allow access (public page)
    if (!user.value) {
      return;
    }

    // Wait for auth to be initialized
    // Auth is initialized in app.vue via useAuthInit(), but we need to wait for it
    if (!userStore.authInitialized) {
      // If auth is not initialized yet, allow access to avoid blocking
      // The middleware will run again on next navigation
      return;
    }

    // If profile is not loaded, try to load it
    if (!userStore.profile) {
      await userStore.ensureProfile();
    }

    // Check onboarding status
    const profile = userStore.profile;
    const hasCompletedOnboarding = profile?.onboarding_completed ?? false;

    // If onboarding not completed, redirect to onboarding (with language)
    if (!hasCompletedOnboarding) {
      return navigateTo(`/${lang}/onboarding`, { replace: true });
    }

    // Onboarding completed, allow access
    return;
  }
);
