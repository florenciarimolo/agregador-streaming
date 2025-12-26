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
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    user: null,
    profile: null,
    loading: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
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
      if (!this.user) {
        this.profile = null;
        return;
      }

      this.loading = true;
      try {
        const supabase = useSupabaseClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', this.user.id)
          .single();

        if (error) throw error;
        this.profile = data;
      } catch (error) {
        console.error('Error fetching profile:', error);
        this.profile = null;
      } finally {
        this.loading = false;
      }
    },

    async markOnboardingComplete() {
      if (!this.user) return;

      try {
        const supabase = useSupabaseClient();
        const { error } = await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', this.user.id);

        if (error) throw error;
        await this.fetchProfile();
      } catch (error) {
        console.error('Error updating onboarding status:', error);
        throw error;
      }
    },

    reset() {
      this.user = null;
      this.profile = null;
      this.loading = false;
    },
  },
});
