/**
 * Recovery Detection Middleware
 * Detects recovery sessions using session.user.recovery_sent_at
 * This is the ONLY reliable way to detect recovery in PKCE flow
 *
 * This middleware runs globally and checks if the current session
 * is a recovery session. If so, redirects to reset-password page.
 *
 * IMPORTANT: This middleware should run AFTER the callback has exchanged
 * the code for a session. The callback redirects to /, and then this
 * middleware detects recovery and redirects to /auth/reset-password.
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
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData?.session) {
      return;
    }

    const session = sessionData.session;

    // Check if this is a recovery session
    // recovery_sent_at exists ONLY in recovery sessions
    // This is the official and reliable way to detect recovery
    if (session.user?.recovery_sent_at) {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          '[Recovery Detection] Detected recovery session, redirecting to reset-password'
        );
      }

      // Redirect to reset-password page
      return navigateTo('/auth/reset-password');
    }
  } catch (error) {
    // Silently fail - don't break the app if there's an error
    if (process.env.NODE_ENV === 'development') {
      console.error('[Recovery Detection] Error:', error);
    }
  }
});
