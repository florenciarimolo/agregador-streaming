import { defineStore } from 'pinia';
import type { User } from '@supabase/supabase-js';
// useSupabaseClient is auto-imported by Nuxt - no manual import needed

interface Profile {
  id: string;
  email: string | null;
  created_at: string;
  updated_at: string;
  onboarding_completed: boolean;
}

interface UserState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  likesCount: number | null;
  authInitialized: boolean; // Track if auth has been initialized
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    user: null,
    profile: null,
    loading: false,
    likesCount: null,
    authInitialized: false, // Start as false, set to true after plugin initializes
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    // hasLikes is calculated based on whether user has records in user_likes table
    hasLikes: (state) => (state.likesCount ?? 0) > 0,
    // hasCompletedOnboarding checks the onboarding_completed flag in profiles table
    hasCompletedOnboarding: (state) =>
      state.profile?.onboarding_completed ?? false,
  },

  actions: {
    setUser(user: User | null) {
      this.user = user;
    },

    setProfile(profile: Profile | null) {
      this.profile = profile;
    },

    setLoading(loading: boolean) {
      this.loading = loading;
    },

    async fetchProfile() {
      // Supabase user can have either 'id' or 'sub' as the identifier
      const userId = this.user?.id || (this.user as { sub?: string })?.sub;

      if (!this.user || !userId) {
        this.profile = null;
        this.likesCount = null;
        this.loading = false;
        return;
      }

      try {
        const supabase = useSupabaseClient();

        // Fetch profile and likes count in PARALLEL for faster loading
        const [profileResult, likesResult] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          supabase
            .from('user_title_status')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('liked', true),
        ]);

        const { data: profileData, error: profileError } = profileResult;
        const { count, error: likesError } = likesResult;

        // Handle profile
        if (profileError) {
          // If profile doesn't exist, try to create it
          if (profileError.code === 'PGRST116') {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                email:
                  (this.user as { email?: string }).email || this.user.email,
                onboarding_completed: false,
              })
              .select()
              .single();

            if (createError) {
              console.error('Error creating profile:', createError);
              throw createError;
            }

            this.profile = newProfile;
          } else {
            console.error(
              'Error fetching profile from Supabase:',
              profileError
            );
            throw profileError;
          }
        } else {
          this.profile = profileData;
        }

        // Handle likes count
        if (likesError) {
          console.error('Error fetching likes count:', likesError);
          this.likesCount = 0;
        } else {
          this.likesCount = count ?? 0;
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        this.profile = null;
        this.likesCount = null;
        this.loading = false;
      } finally {
        // Ensure loading is set to false after fetch completes
        this.loading = false;
      }
    },

    async ensureProfile() {
      // Only fetch if profile is missing
      if (!this.profile && this.user) {
        await this.fetchProfile();
      }
    },

    reset() {
      this.user = null;
      this.profile = null;
      this.loading = false;
      this.likesCount = null;
      // Don't reset authInitialized on reset - it should stay true once initialized
    },

    setAuthInitialized(initialized: boolean) {
      this.authInitialized = initialized;
    },
  },
});
