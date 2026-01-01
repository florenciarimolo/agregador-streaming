/**
 * Auth middleware
 * Protects routes that require authentication
 *
 * NOTE: Recovery detection runs FIRST (00-recovery-detection.ts)
 * This middleware should never see recovery sessions, but we check as a safety measure
 *
 * IMPORTANT: This middleware is DETERMINISTIC - it only reads already-resolved state.
 * It does NOT fetch profiles, wait, or retry. Profile loading happens in post-login flows.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  console.log('[Auth Middleware] Starting, path:', to.path);
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

  // If user is authenticated, check onboarding status
  // Profile should already be loaded by post-login flows (AuthForm, callback, etc.)
  // We only read the state, we don't fetch or wait
  if (user.value) {
    console.log('[Auth Middleware] User authenticated:', {
      userId: user.value.id || (user.value as { sub?: string })?.sub,
      path: to.path,
      hasProfile: !!userStore.profile,
      profileOnboarding: userStore.profile?.onboarding_completed,
    });

    // Read onboarding status from store (already loaded by post-login flows)
    const hasCompletedOnboarding = userStore.hasCompletedOnboarding;

    console.log('[Auth Middleware] Onboarding check:', {
      hasCompletedOnboarding,
      path: to.path,
      shouldRedirect:
        !hasCompletedOnboarding &&
        to.path !== '/onboarding' &&
        to.path !== '/auth/callback',
    });

    // Only redirect to onboarding if user hasn't completed onboarding AND not already on onboarding page
    // AND not on auth callback (which handles its own flow)
    // Homepage should redirect to onboarding if user hasn't completed it
    if (
      !hasCompletedOnboarding &&
      to.path !== '/onboarding' &&
      to.path !== '/auth/callback'
    ) {
      console.log('[Auth Middleware] Redirecting to /onboarding');
      return navigateTo('/onboarding', { replace: true });
    }

    // Redirect away from onboarding if user already completed onboarding
    // This ensures users with completed onboarding see their recommendations on homepage
    if (hasCompletedOnboarding && to.path === '/onboarding') {
      console.log(
        '[Auth Middleware] User completed onboarding, redirecting to /'
      );
      return navigateTo('/', { replace: true });
    }
  } else {
    console.log('[Auth Middleware] No user authenticated, path:', to.path);
  }
});
