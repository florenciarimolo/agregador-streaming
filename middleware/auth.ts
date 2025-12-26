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

    // Redirect to onboarding if not completed
    if (
      !userStore.hasCompletedOnboarding &&
      to.path !== '/onboarding' &&
      to.path !== '/auth/callback'
    ) {
      return navigateTo('/onboarding');
    }

    // Redirect away from auth pages if already authenticated and onboarded
    if (userStore.hasCompletedOnboarding && to.path === '/onboarding') {
      return navigateTo('/');
    }
  }
});
