/**
 * Auth middleware
 * Protects routes that require authentication
 *
 * NOTE: Recovery detection runs FIRST (00-recovery-detection.ts)
 * This middleware should never see recovery sessions, but we check as a safety measure
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser();
  const userStore = useUserStore();

  // If user is not authenticated and trying to access protected route
  // Homepage (/) is public, so exclude it
  // Also exclude reset-password page (handles its own auth flow)
  if (
    !user.value &&
    to.path !== '/' &&
    to.path !== '/auth/login' &&
    to.path !== '/auth/callback' &&
    to.path !== '/auth/reset-password'
  ) {
    return navigateTo('/');
  }

  // If user is on reset-password page, don't redirect them away
  // They need to complete the password reset flow first
  // Also, don't load profile or trigger any auth-related actions
  if (to.path === '/auth/reset-password') {
    return; // Allow access to reset-password page regardless of auth state
  }

  // SAFETY CHECK: If this is a recovery session, redirect immediately
  // (This should never happen if 00-recovery-detection.ts runs first, but safety first)
  // Only redirect if on homepage to avoid interrupting normal navigation
  if (user.value && process.client && to.path === '/') {
    try {
      const supabase = useSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.recovery_sent_at) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[Auth Middleware] Recovery session detected (should have been caught by recovery-detection middleware)'
          );
        }
        return navigateTo('/auth/reset-password', { replace: true });
      }
    } catch {
      // Silently continue if check fails
    }
  }

  // If user is authenticated, ensure user is set in store
  // Profile is already fetched by the supabase.client.ts plugin, so we just ensure it's loaded
  // BUT NOT on reset-password page (handled above)
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
    // AND not on auth callback (which handles its own flow)
    // Homepage should redirect to onboarding if user hasn't completed it
    if (
      !hasCompletedOnboarding &&
      to.path !== '/onboarding' &&
      to.path !== '/auth/callback'
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
