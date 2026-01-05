/**
 * Supabase client plugin
 * Initializes user store on app load
 * Must run early to ensure auth state is ready before components mount
 */
// Nuxt auto-imports: defineNuxtPlugin, useSupabaseClient, useUserStore
// Types are generated in .nuxt/types/imports.d.ts
import type { Session } from '@supabase/supabase-js';

export default defineNuxtPlugin(async () => {
  const supabase = useSupabaseClient();
  const userStore = useUserStore();
  let authInitialized = false;

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

  // Listen to auth state changes
  supabase.auth.onAuthStateChange(
    async (_event: string, session: Session | null) => {
      try {
        // Don't process auth state changes if we're on reset-password page
        // This prevents loading profile and triggering redirects during password recovery
        if (
          typeof window !== 'undefined' &&
          window.location.pathname === '/auth/reset-password'
        ) {
          if (process.env.NODE_ENV === 'development') {
            console.log(
              '[supabase.client.ts] Skipping auth state change on reset-password page'
            );
          }
          return;
        }

        if (session?.user) {
          userStore.setUser(session.user);
          // Mark auth as initialized when we get a session
          if (!authInitialized) {
            userStore.setAuthInitialized(true);
            authInitialized = true;
          }
          // Fetch profile - await to ensure it completes before navigation
          // The store uses a mutex pattern to avoid race conditions
          try {
            await userStore.fetchProfile();
          } catch (error) {
            // Only log non-refresh-token errors
            if (!isRefreshTokenError(error)) {
              if (process.env.NODE_ENV === 'development') {
                console.error(
                  '[supabase.client.ts] Error fetching profile:',
                  error
                );
              }
            }
          }
        } else {
          userStore.reset();
        }
      } catch (error) {
        // Silently handle refresh token errors - they're expected when tokens are invalid
        if (
          !isRefreshTokenError(error) &&
          process.env.NODE_ENV === 'development'
        ) {
          console.error('[supabase.client.ts] Auth state change error:', error);
        }
      }
    }
  );

  // Initialize user on app load
  try {
    // Don't load profile if we're on reset-password page
    // This prevents loading profile and triggering redirects during password recovery
    const isResetPasswordPage =
      typeof window !== 'undefined' &&
      window.location.pathname === '/auth/reset-password';

    const result = await supabase.auth.getSession();
    const session = result.data?.session || null;

    if (session?.user) {
      userStore.setUser(session.user);
    }

    // Fetch profile if we have a user, but NOT on reset-password page
    // IMPORTANT: We await this to ensure profile is loaded before middleware runs
    // This makes the onboarding flow deterministic as per documentation
    if (session?.user && !isResetPasswordPage) {
      try {
        await userStore.fetchProfile();
      } catch (error) {
        // Only log non-refresh-token errors
        if (!isRefreshTokenError(error)) {
          if (process.env.NODE_ENV === 'development') {
            console.error(
              '[supabase.client.ts] Error fetching profile:',
              error
            );
          }
        }
      }
    }

    // Mark auth as initialized after profile is loaded (or after session check if no user)
    if (!authInitialized) {
      userStore.setAuthInitialized(true);
      authInitialized = true;
    }
  } catch (error) {
    // Silently handle refresh token errors - they're expected when tokens are invalid/expired
    if (!isRefreshTokenError(error)) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[supabase.client.ts] Error getting session:', error);
      }
    }
    // Mark as initialized even if there's an error, so components can proceed
    if (!authInitialized) {
      userStore.setAuthInitialized(true);
      authInitialized = true;
    }
  }
});
