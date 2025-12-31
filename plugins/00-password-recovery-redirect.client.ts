/**
 * Client-side plugin to handle Supabase auth redirects
 * Supabase sometimes redirects to Site URL root with query params or hash
 * This plugin detects and redirects to the appropriate auth pages
 */
export default defineNuxtPlugin({
  name: 'auth-redirect',
  setup() {
    // Only run on client-side
    if (process.server) return;

    const route = useRoute();
    const supabase = useSupabaseClient();

    // Helper function to parse hash params
    const parseHashParams = (): Record<string, string> => {
      const params: Record<string, string> = {};
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.substring(1); // Remove #
        try {
          const hashParams = new URLSearchParams(hash);
          hashParams.forEach((value, key) => {
            params[key] = decodeURIComponent(value);
          });
        } catch (e) {
          console.error('[Auth Redirect Plugin] Error parsing hash:', e);
        }
      }
      return params;
    };

    // Check immediately and also on nextTick to catch both cases
    const checkAndRedirect = () => {
      // Get hash params
      const hashParams = parseHashParams();

      // Merge query params and hash params (query params take precedence)
      const allParams = { ...hashParams, ...route.query };

      // NOTE: We NO LONGER detect recovery here
      // Recovery detection happens in middleware using session.user.recovery_sent_at
      // All codes (including recovery) go to /auth/callback first
      // The callback exchanges the code, then middleware detects recovery

      // Only handle other redirects on the homepage
      if (route.path !== '/') return false;

      // Debug logging (only in development)
      if (
        process.env.NODE_ENV === 'development' &&
        (hashParams.error || route.query.error)
      ) {
        console.log('[Auth Redirect Plugin] Detected error params:', {
          hashParams,
          queryParams: route.query,
          allParams,
        });
      }

      // Handle Supabase errors (error, error_code, error_description)
      if (
        allParams.error ||
        allParams.error_code ||
        allParams.error_description
      ) {
        const redirectPath = '/auth/callback';
        const queryParams: Record<string, string> = {};

        // Preserve all error-related params
        if (allParams.error) {
          queryParams.error = allParams.error as string;
        }
        if (allParams.error_code) {
          queryParams.error_code = allParams.error_code as string;
        }
        if (allParams.error_description) {
          queryParams.error_description = allParams.error_description as string;
        }

        if (process.env.NODE_ENV === 'development') {
          console.log(
            '[Auth Redirect Plugin] Redirecting to callback with error params:',
            queryParams
          );
        }

        // Use window.location to avoid hydration issues
        const queryString = new URLSearchParams(queryParams).toString();
        const redirectUrl = `${redirectPath}${queryString ? `?${queryString}` : ''}`;
        window.location.replace(redirectUrl);
        return true; // Indicate redirect happened
      }

      // Handle magic link redirects (code without type)
      // All codes go to /auth/callback - recovery detection happens in middleware
      if (route.query.code && !route.query.type) {
        const code = route.query.code as string;
        const errorMessage = route.query.error_message as string;

        // If we have access_token and refresh_token, Supabase already processed it
        // Just redirect immediately to callback
        if (route.query.access_token && route.query.refresh_token) {
          const redirectPath = '/auth/callback';
          const queryParams: Record<string, string> = {};

          if (code) {
            queryParams.code = code;
          }

          if (errorMessage) {
            queryParams.error_message = errorMessage;
          }

          queryParams.access_token = route.query.access_token as string;
          queryParams.refresh_token = route.query.refresh_token as string;

          const queryString = new URLSearchParams(queryParams).toString();
          const redirectUrl = `${redirectPath}${queryString ? `?${queryString}` : ''}`;
          window.location.replace(redirectUrl);
          return true;
        }

        // If we only have a code, wait a bit for Supabase to process it
        // This prevents showing error messages before the session is established
        setTimeout(async () => {
          // Check if session was already established
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session) {
              // Session already established, redirect to callback to complete flow
              const redirectPath = '/auth/callback';
              const queryParams: Record<string, string> = { code };
              if (errorMessage) {
                queryParams.error_message = errorMessage;
              }
              const queryString = new URLSearchParams(queryParams).toString();
              const redirectUrl = `${redirectPath}${queryString ? `?${queryString}` : ''}`;
              window.location.replace(redirectUrl);
              return;
            }
          } catch (e) {
            console.error('[Auth Redirect Plugin] Error checking session:', e);
          }

          // No session yet, redirect to callback to process the code
          const redirectPath = '/auth/callback';
          const queryParams: Record<string, string> = {};

          if (code) {
            queryParams.code = code;
          }

          if (errorMessage) {
            queryParams.error_message = errorMessage;
          }

          const queryString = new URLSearchParams(queryParams).toString();
          const redirectUrl = `${redirectPath}${queryString ? `?${queryString}` : ''}`;
          window.location.replace(redirectUrl);
        }, 500); // Wait 500ms for Supabase to process the code

        return true;
      }

      return false; // No redirect
    };

    // Check immediately - using window.location.replace avoids hydration issues
    // because it's a full page navigation, not a Vue Router navigation
    if (process.client) {
      // Use a small delay to ensure we're not interfering with initial render
      setTimeout(() => {
        checkAndRedirect();
      }, 0);
    }
  },
});
