/**
 * Auth middleware
 * Handles authentication and onboarding checks for protected routes
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
    // Only run on client side (Pinia is client-only)
    if (import.meta.server) {
      return;
    }

    const user = useSupabaseUser();
    const userStore = useUserStore();

    // Get language from URL
    const lang = getLangFromRoute(to);

    console.log('[AUTH TRACE] middleware executing', {
      path: to.path,
      lang,
      hasUser: !!user.value,
      userId: user.value?.id || user.value?.sub,
      hasProfile: userStore.profile !== null,
      onboardingCompleted: userStore.profile?.onboarding_completed,
    });

    // Public routes (with language prefix)
    const publicRoutes = [
      `/${lang}`,
      `/${lang}/`,
      `/${lang}/auth/login`,
      `/${lang}/auth/callback`,
      `/${lang}/auth/reset-password`,
    ];
    if (
      publicRoutes.includes(to.path) ||
      to.path.startsWith(`/${lang}/auth/`)
    ) {
      console.log('[AUTH TRACE] middleware allowing public route', to.path);
      return;
    }

    // Protect routes: redirect unauthenticated users to home (with language)
    if (!user.value) {
      console.log(
        '[AUTH TRACE] middleware redirecting to / (no user)',
        to.path
      );
      return navigateTo(`/${lang}/`);
    }

    // If user exists but profile is not loaded, wait for it to load
    if (!userStore.profile) {
      console.log(
        '[AUTH TRACE] middleware waiting for profile to load...',
        to.path
      );
      await userStore.ensureProfile();
      const profileAfterLoad = userStore.profile;
      console.log('[AUTH TRACE] middleware profile loaded', {
        hasProfile: profileAfterLoad !== null,
        onboardingCompleted:
          profileAfterLoad !== null
            ? ((profileAfterLoad as { onboarding_completed?: boolean })
                .onboarding_completed ?? false)
            : false,
      });
    }

    // Now we can safely check onboarding status
    const profile = userStore.profile;
    const hasCompletedOnboarding = profile
      ? (profile.onboarding_completed ?? false)
      : false;

    // Type guard to ensure profile is not null
    if (!profile) {
      console.log(
        '[AUTH TRACE] middleware no profile after ensureProfile',
        to.path
      );
      return navigateTo(`/${lang}/`);
    }

    // Handle onboarding redirects (with language)
    if (
      !hasCompletedOnboarding &&
      to.path !== `/${lang}/onboarding` &&
      !to.path.startsWith(`/${lang}/auth/callback`)
    ) {
      console.log(
        '[AUTH TRACE] middleware redirecting to /onboarding (onboarding not completed)',
        to.path
      );
      return navigateTo(`/${lang}/onboarding`, { replace: true });
    }

    if (hasCompletedOnboarding && to.path === `/${lang}/onboarding`) {
      console.log(
        '[AUTH TRACE] middleware redirecting to / (onboarding completed but on /onboarding)',
        to.path
      );
      return navigateTo(`/${lang}/`, { replace: true });
    }

    console.log('[AUTH TRACE] middleware allowing navigation', to.path);
  }
);
