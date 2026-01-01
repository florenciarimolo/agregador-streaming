/**
 * Recovery Detection Middleware
 * PRIORITY: ABSOLUTE - This middleware MUST run FIRST
 *
 * Detects recovery sessions using session.user.recovery_sent_at
 * This is the ONLY reliable way to detect recovery in PKCE flow
 *
 * IMPORTANT: This middleware runs BEFORE all other middlewares (00- prefix ensures alphabetical priority)
 *
 * Flow:
 * 1. Callback exchanges code → session (with recovery_sent_at if recovery)
 * 2. Callback redirects to / (home)
 * 3. THIS middleware runs FIRST and detects recovery_sent_at
 * 4. Immediately redirects to /auth/reset-password
 * 5. User NEVER sees the home page
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Only run on client-side
  if (process.server) return;

  // Don't run on reset-password page (would cause redirect loop)
  if (to.path === '/auth/reset-password') return;

  // Don't run on callback page (session might not be ready yet)
  // Callback will exchange code and redirect to /, then this middleware runs
  if (to.path === '/auth/callback') return;

  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  // Only check if user is authenticated
  if (!user.value) return;

  try {
    // Get the current session
    // This is critical - we need the full session object to check recovery_sent_at
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData?.session) {
      return;
    }

    const session = sessionData.session;

    // Check if this is a recovery session
    // recovery_sent_at exists ONLY in recovery sessions
    // This is the official and reliable way to detect recovery in Supabase PKCE
    if (session.user?.recovery_sent_at) {
      // Only redirect if user is on homepage
      // This prevents redirecting users who are already using the app normally
      // If user is navigating to a protected route (like /profile), they likely
      // already completed recovery or are using a normal session, so don't interrupt them
      const isHomepage = to.path === '/';

      // Only redirect if on homepage (user likely just came from callback)
      // Don't redirect if user is navigating to other pages (they may have already completed recovery)
      if (isHomepage) {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            '[Recovery Detection] Detected recovery session on homepage, redirecting to reset-password',
            { recovery_sent_at: session.user.recovery_sent_at }
          );
        }

        // PRIORITY: Redirect IMMEDIATELY to reset-password
        // This prevents any other middleware from redirecting to home/onboarding
        return navigateTo('/auth/reset-password', { replace: true });
      } else {
        // User is navigating to a protected route but has recovery_sent_at
        // This might be a stale recovery session - don't interrupt normal navigation
        // The reset-password page will handle validation if user goes there directly
        if (process.env.NODE_ENV === 'development') {
          console.log(
            '[Recovery Detection] Recovery session detected but user is navigating to protected route, skipping redirect',
            { path: to.path }
          );
        }
      }
    }
  } catch (error) {
    // Silently fail - don't break the app if there's an error
    if (process.env.NODE_ENV === 'development') {
      console.error('[Recovery Detection] Error:', error);
    }
  }
});
