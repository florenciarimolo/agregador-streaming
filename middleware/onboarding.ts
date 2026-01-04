/**
 * Onboarding middleware
 * Handles authentication and onboarding checks for the home page (/)
 *
 * Rules:
 * - If NO session → allow access to /
 * - If HAS session:
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

  // If session exists, ensure profile is loaded
  if (!userStore.profile) {
    await userStore.ensureProfile();
  }

  // Check onboarding status
  const hasCompletedOnboarding = userStore.hasCompletedOnboarding;

  // If onboarding not completed, redirect to onboarding
  if (!hasCompletedOnboarding) {
    return navigateTo('/onboarding', { replace: true });
  }

  // Onboarding completed, allow access
  return;
});
