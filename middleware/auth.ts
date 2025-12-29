/**
 * Auth middleware
 * Protects routes that require authentication
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser();
  const userStore = useUserStore();

  // If user is not authenticated and trying to access protected route
  // Homepage (/) is public, so exclude it
  if (
    !user.value &&
    to.path !== '/' &&
    to.path !== '/auth/login' &&
    to.path !== '/auth/callback'
  ) {
    return navigateTo('/');
  }

  // If user is authenticated, ensure user is set in store
  // Profile is already fetched by the supabase.client.ts plugin, so we just ensure it's loaded
  if (user.value) {
    // Only set user if different (avoid unnecessary updates)
    const userId = user.value.id || (user.value as { sub?: string })?.sub;
    const currentUserId =
      userStore.user?.id || (userStore.user as { sub?: string })?.sub;

    if (!userStore.user || currentUserId !== userId) {
      userStore.setUser(user.value);
      // Only fetch profile if not already loaded (plugin may have already done it)
      await userStore.ensureProfile();
    }

    // Check if user has completed onboarding
    const hasCompletedOnboarding = userStore.hasCompletedOnboarding;

    // Only redirect to onboarding if user hasn't completed onboarding AND not already on onboarding page
    // AND not on the homepage (homepage can show recommendations if onboarding is complete)
    if (
      !hasCompletedOnboarding &&
      to.path !== '/onboarding' &&
      to.path !== '/auth/callback' &&
      to.path !== '/'
    ) {
      return navigateTo('/onboarding');
    }

    // Redirect away from onboarding if user already completed onboarding
    // This ensures users with completed onboarding see their recommendations on homepage
    if (hasCompletedOnboarding && to.path === '/onboarding') {
      return navigateTo('/');
    }
  }
});
