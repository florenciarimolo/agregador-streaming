/**
 * Auth middleware
 * Deterministic: only reads already-resolved state (useSupabaseUser + store)
 * No Supabase calls, no waits, no retries, no safety checks
 */
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser();
  const userStore = useUserStore();

  // Public routes
  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/callback',
    '/auth/reset-password',
  ];
  if (publicRoutes.includes(to.path)) {
    return;
  }

  // Protect routes: redirect unauthenticated users to home
  if (!user.value) {
    return navigateTo('/');
  }

  // Onboarding redirects (only if profile is already loaded)
  // If profile is not loaded yet, don't redirect (let the page load first)
  const profile = userStore.profile;
  const hasCompletedOnboarding = profile
    ? (profile.onboarding_completed ?? false)
    : undefined;

  // Only redirect if we have profile data
  if (profile !== null && hasCompletedOnboarding !== undefined) {
    if (
      !hasCompletedOnboarding &&
      to.path !== '/onboarding' &&
      to.path !== '/auth/callback'
    ) {
      return navigateTo('/onboarding', { replace: true });
    }

    if (hasCompletedOnboarding && to.path === '/onboarding') {
      return navigateTo('/', { replace: true });
    }
  }
  // If profile is not loaded yet, allow navigation to proceed
  // The plugin will load the profile in the background
});
