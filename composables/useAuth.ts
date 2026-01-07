import { readonly } from 'vue';
import { validatePassword } from '@/utils/passwordValidation';
import { STORAGE_KEYS } from '@/constants/storage/keys';
import { DEFAULT_LANGUAGE_URL_CODE } from '@/constants/urlLanguageCodes';

/**
 * Authentication composable for UpNext
 * Handles email/password and magic link authentication via Supabase
 */
export const useAuth = () => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();
  const router = useRouter();
  const route = useRoute();
  const config = useRuntimeConfig();

  /**
   * Get language from current route
   * @returns Language URL code (e.g., 'es', 'en') or DEFAULT_LANGUAGE_URL_CODE as default
   */
  const getCurrentLang = (): string => {
    const langParam = route.params?.lang as string | undefined;
    if (langParam) {
      return langParam.toLowerCase();
    }
    // Default to DEFAULT_LANGUAGE_URL_CODE if no lang param
    return DEFAULT_LANGUAGE_URL_CODE;
  };

  /**
   * Get auth redirect URL with language
   * @param lang - Language URL code (e.g., 'es', 'en')
   * @returns Full redirect URL with language prefix
   */
  const getAuthRedirectUrl = (lang: string): string => {
    // CRITICAL: Remove trailing slash from baseUrl to prevent // when concatenating
    // Result: baseUrl (no trailing /) + "/" + lang + "/auth/callback" = clean URL
    // Example: "https://example.com" + "/es/auth/callback" = "https://example.com/es/auth/callback" ✅
    const baseUrl = config.public.baseUrl.replace(/\/$/, '');
    return `${baseUrl}/${lang}/auth/callback`;
  };

  /**
   * Sign up with email and password
   * Validates password on server side before sending to Supabase
   */
  const signUp = async (
    email: string,
    password: string,
    displayName?: string | null
  ) => {
    try {
      // Validate password on server side
      const validation = validatePassword(password);
      if (!validation.isValid) {
        const error = new Error(validation.errors.join('. '));
        error.name = 'PasswordValidationError';
        throw error;
      }

      // Get current language from URL
      const lang = getCurrentLang();
      const redirectUrl = getAuthRedirectUrl(lang);

      if (process.env.NODE_ENV === 'development') {
        console.log('[useAuth] SignUp redirectTo:', redirectUrl);
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName || null,
          },
        },
      });

      if (error) throw error;

      // If user is created and displayName is provided, update profile
      if (data.user && displayName) {
        // Wait a bit for the trigger to create the profile
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Update profile with display_name
        const userId = data.user.id || (data.user as { sub?: string }).sub;
        if (userId) {
          const { updateProfile } = await import('@/services/profiles');
          await updateProfile(userId, {
            display_name: displayName,
          });
        }
      }

      return { data, error: null };
    } catch (error: unknown) {
      console.error('Sign up error:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  };

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error: unknown) {
      console.error('Sign in error:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  };

  /**
   * Sign in with magic link (passwordless)
   */
  const signInWithMagicLink = async (email: string) => {
    try {
      // Get current language from URL
      const lang = getCurrentLang();
      const redirectUrl = getAuthRedirectUrl(lang);

      if (process.env.NODE_ENV === 'development') {
        console.log('[useAuth] MagicLink redirectTo:', redirectUrl);
      }

      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error: unknown) {
      console.error('Magic link error:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  };

  /**
   * Reset password (forgot password)
   */
  const resetPassword = async (email: string) => {
    // Get current language from URL
    const lang = getCurrentLang();
    // Redirect to callback with next parameter so callback can handle recovery flow
    // CRITICAL: Remove trailing slash from baseUrl to prevent // when concatenating
    // Result: baseUrl (no trailing /) + "/" + lang + "/auth/callback?next=..." = clean URL
    const baseUrl = config.public.baseUrl.replace(/\/$/, '');
    const redirectUrl = `${baseUrl}/${lang}/auth/callback?next=/${lang}/auth/reset-password`;

    if (process.env.NODE_ENV === 'development') {
      console.log('[useAuth] ResetPassword redirectTo:', redirectUrl);
    }

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      // Set recovery flag in localStorage to detect recovery flow in callback
      // Flag includes timestamp to prevent indefinite persistence if user abandons flow
      if (!error && typeof window !== 'undefined') {
        localStorage.setItem(
          STORAGE_KEYS.AUTH_RECOVERY,
          JSON.stringify({ value: 1, ts: Date.now() })
        );
      }

      if (error) {
        console.error('[Server] Reset password error:', error);

        // Handle rate limit error specifically
        if (
          error.code === 'over_email_send_rate_limit' ||
          error.message?.includes('rate_limit')
        ) {
          // Extract wait time from error message
          // Message format: "For security purposes, you can only request this after X seconds."
          const waitTimeMatch = error.message.match(/(\d+)\s*seconds?/i);
          const waitTime = waitTimeMatch
            ? parseInt(waitTimeMatch[1], 10)
            : null;

          const rateLimitError = new Error(
            waitTime
              ? `Por seguridad, debes esperar ${waitTime} segundo${waitTime !== 1 ? 's' : ''} antes de solicitar otro enlace de recuperación.`
              : 'Has solicitado demasiados enlaces de recuperación. Por favor, espera unos momentos antes de intentar de nuevo.'
          ) as Error & { code?: string; waitTime?: number | null };
          rateLimitError.name = 'RateLimitError';
          rateLimitError.code = error.code;
          rateLimitError.waitTime = waitTime;

          return {
            data: null,
            error: rateLimitError,
          };
        }

        throw error;
      }

      return { data, error: null };
    } catch (error: unknown) {
      console.error('[Server] Reset password error:', error);

      // If it's already a RateLimitError, return it as is
      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'RateLimitError'
      ) {
        return {
          data: null,
          error: error as Error,
        };
      }

      return {
        data: null,
        error: error instanceof Error ? error : new Error('Error desconocido'),
      };
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Reset user store immediately to ensure clean state
      // The auth listener will also reset it, but doing it here ensures it happens synchronously
      if (import.meta.client) {
        try {
          const { useUserStore } = await import('@/stores/user');
          const userStore = useUserStore();
          userStore.reset();
        } catch (storeError) {
          // Store might not be available, but that's okay - the listener will handle it
          if (process.env.NODE_ENV === 'development') {
            console.warn(
              '[useAuth] Could not reset store during signOut:',
              storeError
            );
          }
        }
      }

      // Get current language from URL and redirect to homepage with language
      const lang = getCurrentLang();
      await router.push(`/${lang}/`);
      return { error: null };
    } catch (error: unknown) {
      console.error('Sign out error:', error);
      return {
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  };

  /**
   * Get user profile from profiles table
   */
  const getUserProfile = async () => {
    if (!user.value) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error: unknown) {
      console.error('Get profile error:', error);
      return null;
    }
  };

  return {
    user: readonly(user),
    signUp,
    signIn,
    signInWithMagicLink,
    resetPassword,
    signOut,
    getUserProfile,
  };
};
