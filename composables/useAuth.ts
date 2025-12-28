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

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${config.public.baseUrl}/auth/callback`,
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
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${config.public.baseUrl}/auth/callback`,
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
    console.log(config.public.baseUrl);
    console.log(`${config.public.baseUrl}/auth/reset-password`);
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${config.public.baseUrl}/auth/reset-password`,
      });

      if (error) {
        console.error('[Server] Reset password error:', error);
        throw error;
      }

      return { data, error: null };
    } catch (error: unknown) {
      console.error('[Server] Reset password error:', error);
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
