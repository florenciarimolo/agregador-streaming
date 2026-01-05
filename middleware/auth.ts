/**
 * Auth middleware
 * Handles authentication and onboarding checks for protected routes
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser();
  const userStore = useUserStore();

  console.log('[AUTH TRACE] middleware executing', {
    path: to.path,
    hasUser: !!user.value,
    userId: user.value?.id || user.value?.sub,
    hasProfile: userStore.profile !== null,
    onboardingCompleted: userStore.profile?.onboarding_completed,
  });

  // Public routes
  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/callback',
    '/auth/reset-password',
  ];
  if (publicRoutes.includes(to.path)) {
    console.log('[AUTH TRACE] middleware allowing public route', to.path);
    return;
  }

  // Protect routes: redirect unauthenticated users to home
  if (!user.value) {
    console.log('[AUTH TRACE] middleware redirecting to / (no user)', to.path);
    return navigateTo('/');
  }

  // If user exists but profile is not loaded, wait for it to load
  if (!userStore.profile) {
    console.log('[AUTH TRACE] middleware waiting for profile to load...', to.path);
    await userStore.ensureProfile();
    console.log('[AUTH TRACE] middleware profile loaded', {
      hasProfile: userStore.profile !== null,
      onboardingCompleted: userStore.profile?.onboarding_completed,
    });
  }

  // Now we can safely check onboarding status
  const profile = userStore.profile;
  const hasCompletedOnboarding = profile
    ? (profile.onboarding_completed ?? false)
    : false;

  // Handle onboarding redirects
  if (!hasCompletedOnboarding && to.path !== '/onboarding' && to.path !== '/auth/callback') {
    console.log(
      '[AUTH TRACE] middleware redirecting to /onboarding (onboarding not completed)',
      to.path
    );
    return navigateTo('/onboarding', { replace: true });
  }

  if (hasCompletedOnboarding && to.path === '/onboarding') {
    console.log(
      '[AUTH TRACE] middleware redirecting to / (onboarding completed but on /onboarding)',
      to.path
    );
    return navigateTo('/', { replace: true });
  }

  console.log('[AUTH TRACE] middleware allowing navigation', to.path);
});
