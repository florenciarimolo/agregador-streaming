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

  // If user is authenticated, fetch profile
  if (user.value) {
    userStore.setUser(user.value);
    await userStore.fetchProfile();

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
