import { defineStore } from 'pinia';
import type { User } from '@supabase/supabase-js';
import { getProfile, insertProfile } from '@/services/profiles';
import { countUserLikedTitles } from '@/services/userTitleStatus';
import { isNotFoundError } from '@/constants/db/errorCodes';
// useSupabaseClient is auto-imported by Nuxt - no manual import needed

interface Profile {
  id: string;
  email: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  settings?: Record<string, unknown> | null;
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
  _fetchProfilePromise: Promise<void> | null; // Track pending profile fetch to avoid race conditions
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    user: null,
    profile: null,
    loading: false,
    likesCount: null,
    authInitialized: false, // Start as false, set to true after plugin initializes
    _fetchProfilePromise: null, // Track pending profile fetch to avoid race conditions
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    // hasLikes is calculated based on whether user has records in user_title_status with liked=true
    hasLikes: (state) => (state.likesCount ?? 0) > 0,
    // hasCompletedOnboarding checks the onboarding_completed flag in profiles table
    hasCompletedOnboarding: (state: UserState) => {
      const result = state.profile?.onboarding_completed ?? false;
      console.log('[UserStore] hasCompletedOnboarding getter:', {
        hasProfile: !!state.profile,
        onboarding_completed: state.profile?.onboarding_completed,
        result,
      });
      return result;
    },
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
      // If there's already a fetch in progress, wait for it instead of starting a new one
      // This prevents race conditions where multiple concurrent fetches could overwrite each other
      if (this._fetchProfilePromise) {
        console.log('[UserStore] fetchProfile: Already in progress, waiting...');
        await this._fetchProfilePromise;
        return;
      }

      // Supabase user can have either 'id' or 'sub' as the identifier
      const userId = this.user?.id || (this.user as { sub?: string })?.sub;

      if (!this.user || !userId) {
        this.profile = null;
        this.likesCount = null;
        this.loading = false;
        return;
      }

      // Create a promise to track this fetch operation
      this._fetchProfilePromise = this._doFetchProfile(userId);
      
      try {
        await this._fetchProfilePromise;
      } finally {
        this._fetchProfilePromise = null;
      }
    },

    async _doFetchProfile(userId: string) {
      try {
        // Fetch profile and likes count in PARALLEL for faster loading
        const [profileResult, likesResult] = await Promise.all([
          getProfile(userId),
          countUserLikedTitles(userId),
        ]);

        const { data: profileData, error: profileError } = profileResult;
        const { count, error: likesError } = likesResult;

        // Handle profile
        if (profileError) {
          // If profile doesn't exist, try to create it
          if (isNotFoundError(profileError)) {
            const userEmail =
              (this.user as { email?: string }).email || (this.user as { email?: string })?.email;
            const { data: newProfile, error: createError } =
              await insertProfile({
                id: userId,
                email: userEmail ?? null,
                onboarding_completed: false,
              });

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
        console.log('[UserStore] ensureProfile: Profile missing, fetching...');
        await this.fetchProfile();
        const onboardingStatus = this.profile
          ? (this.profile as Profile).onboarding_completed
          : undefined;
        console.log(
          '[UserStore] ensureProfile: Profile fetched, onboarding_completed:',
          onboardingStatus
        );
      } else {
        const onboardingStatus = this.profile
          ? (this.profile as Profile).onboarding_completed
          : undefined;
        console.log(
          '[UserStore] ensureProfile: Profile already exists, onboarding_completed:',
          onboardingStatus
        );
      }
    },

    reset() {
      this.user = null;
      this.profile = null;
      this.loading = false;
      this.likesCount = null;
      this._fetchProfilePromise = null;
      // Don't reset authInitialized on reset - it should stay true once initialized
    },

    setAuthInitialized(initialized: boolean) {
      this.authInitialized = initialized;
    },
  },
});
