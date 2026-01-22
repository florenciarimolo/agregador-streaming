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
import { extractLangFromPath } from '@/composables/useRouteWithLang';

/**
 * Get language from route params or path
 * @param route - Route object
 * @returns Language URL code (e.g., 'es', 'en') or DEFAULT_LANGUAGE_URL_CODE as default
 */
const getLangFromRoute = (route: { params?: { lang?: string }; path?: string }): string => {
  const langParam = route.params?.lang as string | undefined;
  if (langParam) {
    return langParam.toLowerCase();
  }
  // Fallback: try to extract from path if params.lang is not available
  if (route.path) {
    const langFromPath = extractLangFromPath(route.path);
    if (langFromPath) {
      return langFromPath;
    }
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
    const supabase = useSupabaseClient();

    // Get language from URL
    const lang = getLangFromRoute(to);

    // Development-only logging removed

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
      if (import.meta.dev) {
        // Development-only logging removed
      }
      return;
    }

    // CRITICAL: Wait for auth to initialize before checking user
    // During F5/refresh, user.value might be null temporarily while session loads
    // We need to wait for the session to be checked before redirecting
    if (!userStore.authInitialized) {
      if (import.meta.dev) {
        // Development-only logging removed
      }

      // Try to get session if not initialized yet
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          userStore.setUser(sessionData.session.user);
          // Only mark as initialized if we found a user
          // This ensures initAuth() in app.vue can still run and set it properly
          if (!userStore.authInitialized) {
            userStore.setAuthInitialized(true);
          }
        } else {
          // No session found - but don't mark as initialized yet
          // Let initAuth() in app.vue handle the initialization
          // This prevents premature redirects during F5/refresh
          if (import.meta.dev) {
            // Development-only logging removed
          }
          // Allow navigation to proceed - initAuth() will set authInitialized
          return;
        }
      } catch {
        // If session check fails, don't mark as initialized
        // Let initAuth() handle it to avoid blocking or premature redirects
        if (import.meta.dev) {
          // Development-only logging removed
        }
        // Allow navigation to proceed - initAuth() will set authInitialized
        return;
      }
    }

    // Re-check user after waiting for initialization
    const currentUser = user.value;

    // Protect routes: redirect unauthenticated users to home (with language)
    // Only redirect if auth is initialized AND there's no user
    // CRITICAL: Only redirect if we're certain there's no user (authInitialized is true from initAuth)
    if (!currentUser && userStore.authInitialized) {
      if (import.meta.dev) {
        // Development-only logging removed
      }
      return navigateTo(`/${lang}/`);
    }

    // If auth not initialized yet and no user, allow navigation to proceed
    // The auth initialization will happen and user will be set if session exists
    if (!currentUser && !userStore.authInitialized) {
      if (import.meta.dev) {
        // Development-only logging removed
      }
      // Don't redirect - let the page load and auth will initialize
      return;
    }

    // If user exists but profile is not loaded, wait for it to load
    if (!userStore.profile) {
      if (import.meta.dev) {
        // Development-only logging removed
      }
      await userStore.ensureProfile();
      // Development-only logging removed
    }

    // Now we can safely check onboarding status
    const profile = userStore.profile;
    const hasCompletedOnboarding = profile
      ? (profile.onboarding_completed ?? false)
      : false;

    // Type guard to ensure profile is not null
    if (!profile) {
      if (import.meta.dev) {
        // Development-only logging removed
      }
      return navigateTo(`/${lang}/`);
    }

    // Handle onboarding redirects (with language)
    // Allow access to /my-account regardless of onboarding status
    if (
      !hasCompletedOnboarding &&
      to.path !== `/${lang}/onboarding` &&
      to.path !== `/${lang}/my-account` &&
      !to.path.startsWith(`/${lang}/auth/callback`)
    ) {
      return navigateTo(`/${lang}/onboarding`, { replace: true });
    }

    if (hasCompletedOnboarding && to.path === `/${lang}/onboarding`) {
      if (import.meta.dev) {
        // Development-only logging removed
      }
      return navigateTo(`/${lang}/`, { replace: true });
    }

    if (import.meta.dev) {
      // Development-only logging removed
    }
  }
);
