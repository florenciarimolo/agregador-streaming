/**
 * Authentication composable for UpNext
 * Handles email/password and magic link authentication via Supabase
 */
export const useAuth = () => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();
  const router = useRouter();

  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { data: null, error };
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
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { data: null, error };
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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error: any) {
      console.error('Magic link error:', error);
      return { data: null, error };
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
    } catch (error: any) {
      console.error('Sign out error:', error);
      return { error };
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
    } catch (error: any) {
      console.error('Get profile error:', error);
      return null;
    }
  };

  /**
   * Check if user has completed onboarding
   */
  const hasCompletedOnboarding = async (): Promise<boolean> => {
    const profile = await getUserProfile();
    return profile?.onboarding_completed ?? false;
  };

  return {
    user: readonly(user),
    signUp,
    signIn,
    signInWithMagicLink,
    signOut,
    getUserProfile,
    hasCompletedOnboarding,
  };
};
