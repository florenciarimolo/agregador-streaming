/**
 * Onboarding middleware
 * Handles authentication and onboarding checks for the home page (/)
 *
 * Rules:
 * - If NO session → allow access to /
 * - If HAS session:
 *   - Wait for auth to be initialized
 *   - Load profile
 *   - If onboarding_completed === false → redirect to /onboarding
 *   - If onboarding_completed === true → allow access to /
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Only apply to home page
  if (to.path !== '/') {
    return;
  }

  const user = useSupabaseUser();
  const userStore = useUserStore();

  // If no session, allow access (public page)
  if (!user.value) {
    return;
  }

  // CRITICAL: Wait for auth to be initialized AND profile to be loaded
  // This prevents race conditions where middleware runs before profile is loaded
  // We need both conditions because:
  // 1. authInitialized ensures the plugin has finished initializing
  // 2. profile !== null ensures the profile is actually loaded
  let attempts = 0;
  const maxAttempts = 50; // 5 seconds max (50 * 100ms)
  
  while (
    (!userStore.authInitialized || !userStore.profile) &&
    attempts < maxAttempts
  ) {
    // If auth is initialized but profile is missing, try to load it
    if (userStore.authInitialized && !userStore.profile) {
      await userStore.ensureProfile();
    }
    
    // Wait a bit before checking again
    await new Promise((resolve) => setTimeout(resolve, 100));
    attempts++;
  }
  
  // If auth still not initialized after timeout, allow access to avoid blocking
  if (!userStore.authInitialized) {
    console.warn('[onboarding middleware] Auth not initialized after timeout, allowing access');
    return;
  }

  // If profile is still null after waiting, try one more time
  if (!userStore.profile) {
    await userStore.ensureProfile();
  }

  // Double-check: if profile is still null after ensureProfile, something went wrong
  // In this case, allow access to avoid redirect loops
  if (!userStore.profile) {
    console.warn('[onboarding middleware] Profile is null after ensureProfile, allowing access');
    return;
  }

  // Check onboarding status directly from profile to avoid getter issues
  // Only redirect if we're absolutely sure onboarding is not completed
  const profile = userStore.profile;
  const hasCompletedOnboarding = profile?.onboarding_completed ?? false;

  // If onboarding not completed, redirect to onboarding
  if (!hasCompletedOnboarding) {
    return navigateTo('/onboarding', { replace: true });
  }

  // Onboarding completed, allow access
  return;
});
