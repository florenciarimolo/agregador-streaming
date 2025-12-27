import { defineStore } from 'pinia';
import type { User } from '@supabase/supabase-js';

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
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    user: null,
    profile: null,
    loading: false,
    likesCount: null,
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
      const userId = this.user?.id || (this.user as any)?.sub;

      if (!this.user || !userId) {
        this.profile = null;
        this.likesCount = null;
        return;
      }

      this.loading = true;
      try {
        const supabase = useSupabaseClient();

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) {
          // If profile doesn't exist, try to create it
          if (profileError.code === 'PGRST116') {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                email: (this.user as any).email || this.user.email,
                onboarding_completed: false,
              })
              .select()
              .single();

            if (createError) {
              console.error('Error creating profile:', createError);
              throw createError;
            }

            this.profile = newProfile;
            console.log('Store: Profile created and set:', !!this.profile);
          } else {
            console.error(
              'Error fetching profile from Supabase:',
              profileError
            );
            throw profileError;
          }
        } else {
          this.profile = profileData;
          console.log('Store: Profile fetched and set:', !!this.profile);
        }

        // Check if user has likes (completed onboarding)
        const { count, error: likesError } = await supabase
          .from('user_likes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

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
      } finally {
        console.log('Store: Setting loading to false');
        this.loading = false;
        console.log('Store: loading is now:', this.loading);
        console.log('Store: profile is now:', !!this.profile);
      }
    },

    reset() {
      this.user = null;
      this.profile = null;
      this.loading = false;
      this.likesCount = null;
    },
  },
});
