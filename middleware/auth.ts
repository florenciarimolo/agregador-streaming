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
  const hasCompletedOnboarding = userStore.hasCompletedOnboarding;

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
});
