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
 *
 * Architecture: This middleware runs on client-side only and accesses Pinia stores.
 * Stores are initialized in app.vue via useAuthInit(), so they should be available
 * when this middleware runs.
 */
import { useUserStore } from '@/stores/user';

export default defineNuxtRouteMiddleware(async (to) => {
  // Only apply to home page
  if (to.path !== '/') {
    return;
  }

  // Only run on client side (Pinia is client-only)
  if (process.server) {
    return;
  }

  const user = useSupabaseUser();
  const userStore = useUserStore();

  // If no session, allow access (public page)
  if (!user.value) {
    return;
  }

  // Wait for auth to be initialized
  // Auth is initialized in app.vue via useAuthInit(), but we need to wait for it
  if (!userStore.authInitialized) {
    // If auth is not initialized yet, allow access to avoid blocking
    // The middleware will run again on next navigation
    return;
  }

  // If profile is not loaded, try to load it
  if (!userStore.profile) {
    await userStore.ensureProfile();
  }

  // Check onboarding status
  const profile = userStore.profile;
  const hasCompletedOnboarding = profile?.onboarding_completed ?? false;

  // If onboarding not completed, redirect to onboarding
  if (!hasCompletedOnboarding) {
    return navigateTo('/onboarding', { replace: true });
  }

  // Onboarding completed, allow access
  return;
});
