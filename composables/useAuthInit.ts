/**
 * Auth initialization composable
 * Initializes user store from Supabase auth state
 *
 * This composable should be used in components (e.g., app.vue) within onMounted
 * to ensure Pinia is available before accessing stores.
 *
 * Rules:
 * - Only use in components, not in plugins or middlewares
 * - Must be called within onMounted or after component mount
 * - Pinia is client-only, so this will only run on client
 */
import { useUserStore } from '@/stores/user';
import type { Session } from '@supabase/supabase-js';

export const useAuthInit = () => {
  const supabase = useSupabaseClient();

  // Helper to check if error is a refresh token error (expected and can be ignored)
  const isRefreshTokenError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') return false;
    const errorMessage =
      (error as { message?: string }).message ||
      (error as { error_description?: string }).error_description ||
      '';
    return (
      errorMessage.includes('Refresh Token') ||
      errorMessage.includes('refresh_token') ||
      errorMessage.includes('Invalid Refresh Token')
    );
  };

  // Initialize auth state from current session
  const initAuth = async () => {
    // Lazy-load store only when needed (client-side only)
    if (process.server) {
      return;
    }

    const userStore = useUserStore();

    try {
      // Don't load profile if we're on reset-password page
      // This prevents loading profile and triggering redirects during password recovery
      const route = useRoute();
      const isResetPasswordPage = route.path === '/auth/reset-password';

      const result = await supabase.auth.getSession();
      const session = result.data?.session || null;

      if (session?.user) {
        userStore.setUser(session.user);
      }

      // Fetch profile if we have a user, but NOT on reset-password page
      if (session?.user && !isResetPasswordPage) {
        try {
          await userStore.fetchProfile();
          if (!userStore.authInitialized && userStore.profile !== null) {
            userStore.setAuthInitialized(true);
          }
        } catch (error) {
          // Only log non-refresh-token errors
          if (!isRefreshTokenError(error)) {
            if (process.env.NODE_ENV === 'development') {
              console.error('[useAuthInit] Error fetching profile:', error);
            }
          }
          // Even if profile fetch fails, mark as initialized to avoid blocking
          if (!userStore.authInitialized) {
            userStore.setAuthInitialized(true);
          }
        }
      } else {
        // No user or reset-password page: mark as initialized immediately
        if (!userStore.authInitialized) {
          userStore.setAuthInitialized(true);
        }
      }
    } catch (error) {
      // Silently handle refresh token errors - they're expected when tokens are invalid/expired
      if (!isRefreshTokenError(error)) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[useAuthInit] Error getting session:', error);
        }
      }
      // Mark as initialized even if there's an error, so components can proceed
      if (!userStore.authInitialized) {
        userStore.setAuthInitialized(true);
      }
    }
  };

  // Listen to auth state changes
  const setupAuthListener = () => {
    // Lazy-load store only when needed (client-side only)
    if (process.server) {
      return;
    }

    const userStore = useUserStore();

    supabase.auth.onAuthStateChange(
      async (_event: string, session: Session | null) => {
        try {
          // Don't process auth state changes if we're on reset-password page
          const route = useRoute();
          if (route.path === '/auth/reset-password') {
            if (process.env.NODE_ENV === 'development') {
              console.log(
                '[useAuthInit] Skipping auth state change on reset-password page'
              );
            }
            return;
          }

          if (session?.user) {
            userStore.setUser(session.user);
            // Fetch profile - await to ensure it completes before navigation
            try {
              await userStore.fetchProfile();
              if (!userStore.authInitialized && userStore.profile !== null) {
                userStore.setAuthInitialized(true);
              }
            } catch (error) {
              // Only log non-refresh-token errors
              if (!isRefreshTokenError(error)) {
                if (process.env.NODE_ENV === 'development') {
                  console.error('[useAuthInit] Error fetching profile:', error);
                }
              }
              // Even if profile fetch fails, mark as initialized to avoid blocking
              if (!userStore.authInitialized) {
                userStore.setAuthInitialized(true);
              }
            }
          } else {
            userStore.reset();
            // No user: mark as initialized immediately
            if (!userStore.authInitialized) {
              userStore.setAuthInitialized(true);
            }
          }
        } catch (error) {
          // Silently handle refresh token errors - they're expected when tokens are invalid
          if (
            !isRefreshTokenError(error) &&
            process.env.NODE_ENV === 'development'
          ) {
            console.error('[useAuthInit] Auth state change error:', error);
          }
        }
      }
    );
  };

  return {
    initAuth,
    setupAuthListener,
  };
};
