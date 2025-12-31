import { validatePassword } from '../utils/passwordValidation';

/**
 * Authentication composable for UpNext
 * Handles email/password and magic link authentication via Supabase
 */
export const useAuth = () => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();
  const router = useRouter();
  const config = useRuntimeConfig();

  /**
   * Sign up with email and password
   * Validates password on server side before sending to Supabase
   */
  const signUp = async (email: string, password: string) => {
    try {
      // Validate password on server side
      const validation = validatePassword(password);
      if (!validation.isValid) {
        const error = new Error(validation.errors.join('. '));
        error.name = 'PasswordValidationError';
        throw error;
      }

      // Ensure baseUrl doesn't have trailing slash
      // Uses NUXT_PUBLIC_BASE_URL environment variable
      const baseUrl = config.public.baseUrl.replace(/\/$/, '');
      const redirectUrl = `${baseUrl}/auth/callback`;

      if (process.env.NODE_ENV === 'development') {
        console.log('[useAuth] SignUp redirectTo:', redirectUrl);
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) throw error;

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
      // Ensure baseUrl doesn't have trailing slash
      // Uses NUXT_PUBLIC_BASE_URL environment variable
      const baseUrl = config.public.baseUrl.replace(/\/$/, '');
      const redirectUrl = `${baseUrl}/auth/callback`;

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
    // Ensure baseUrl doesn't have trailing slash
    // Uses NUXT_PUBLIC_BASE_URL environment variable
    const baseUrl = config.public.baseUrl.replace(/\/$/, '');
    const redirectUrl = `${baseUrl}/auth/reset-password`;

    if (process.env.NODE_ENV === 'development') {
      console.log('[useAuth] ResetPassword redirectTo:', redirectUrl);
    }

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

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

      // Redirect to homepage after sign out
      await router.push('/');
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
