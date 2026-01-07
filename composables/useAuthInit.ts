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
import { STORAGE_KEYS } from '@/constants/storage/keys';
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
    if (import.meta.server) {
      return;
    }

    // ⛔️ IGNORAR COMPLETAMENTE recovery flow
    const isRecoveryFlow =
      typeof window !== 'undefined' &&
      localStorage.getItem(STORAGE_KEYS.AUTH_RECOVERY);

    if (isRecoveryFlow) {
      return;
    }

    const userStore = useUserStore();

    try {
      const result = await supabase.auth.getSession();
      const session = result.data?.session || null;

      if (session?.user) {
        userStore.setUser(session.user);
      }

      // Fetch profile if we have a user
      if (session?.user) {
        try {
          await userStore.fetchProfile();
          // Mark as initialized after fetch completes, regardless of profile result
          // Profile can be null if it doesn't exist, but auth is still initialized
          if (!userStore.authInitialized) {
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
        // No user: mark as initialized immediately
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
    if (import.meta.server) {
      return;
    }

    // ⛔️ IGNORAR COMPLETAMENTE recovery flow
    const isRecoveryFlow =
      typeof window !== 'undefined' &&
      localStorage.getItem(STORAGE_KEYS.AUTH_RECOVERY);

    if (isRecoveryFlow) {
      return;
    }

    const userStore = useUserStore();

    supabase.auth.onAuthStateChange(
      async (_event: string, session: Session | null) => {
        try {
          // ⛔️ IGNORAR COMPLETAMENTE recovery flow en cada evento
          const isRecoveryFlow =
            typeof window !== 'undefined' &&
            localStorage.getItem(STORAGE_KEYS.AUTH_RECOVERY);

          if (isRecoveryFlow) {
            return;
          }

          if (session?.user) {
            userStore.setUser(session.user);
            // Fetch profile - await to ensure it completes before navigation
            // This is critical for SIGNED_IN events after login
            try {
              await userStore.fetchProfile();
              // Mark as initialized after fetch completes, regardless of profile result
              // Profile can be null if it doesn't exist, but auth is still initialized
              if (!userStore.authInitialized) {
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
