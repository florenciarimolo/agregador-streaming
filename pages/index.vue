<script setup lang="ts">
import { useUserStore } from '../stores/user';

// Type for Supabase user that may have either 'id' or 'sub' as identifier
type SupabaseUserWithSub = {
  id?: string;
  sub?: string;
  [key: string]: unknown;
};

// Helper function to safely get user ID from Supabase user object
function getUserId(
  user: SupabaseUserWithSub | null | undefined
): string | undefined {
  return user?.id || user?.sub;
}

// Homepage is public - no auth required
// Note: All composables (useHead, useSeoMeta, ref, watch, etc.) are auto-imported by Nuxt at runtime
// TypeScript linter errors for these are false positives - they are available at runtime via .nuxt/imports.d.ts
definePageMeta({
  middleware: [],
});

useHead({
  title: 'UpNext - ¿No sabes qué ver ahora?',
});

useSeoMeta({
  title: 'UpNext - ¿No sabes qué ver ahora?',
  description:
    'UpNext te recomienda películas y series según tu momento, tu energía y el tiempo que tienes. Menos decidir, más ver.',
  ogTitle: 'UpNext - ¿No sabes qué ver ahora?',
  ogDescription:
    'UpNext te recomienda películas y series según tu momento, tu energía y el tiempo que tienes. Menos decidir, más ver.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
});

// Auth state
// Note: These are auto-imported by Nuxt - see types/vue-shims.d.ts
const user = useSupabaseUser();
const userStore = useUserStore();
const supabase = useSupabaseClient();

// Note: Pinia stores are reactive by default, so we can use userStore directly in templates

// Track if initial profile load is complete
const initialProfileLoaded = ref(false);

// Form state
const showAuthForm = ref(false);

// Recommendations state
interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

interface Recommendation {
  id: string;
  tmdb_id: number;
  title: string;
  type: 'movie' | 'tv';
  poster_path: string | null;
  overview: string | null;
  vote_average: number | null;
  genres: number[] | null;
  release_date: string | null;
  first_air_date: string | null;
  explanation: string;
  providers?: Provider[];
}

const loadingRecommendations = ref(false);

const recommendations = ref<{
  recommended: Recommendation[];
  easyToWatch: Recommendation[];
  basedOnLikes: Recommendation[];
}>({
  recommended: [],
  easyToWatch: [],
  basedOnLikes: [],
});

// Fetch recommendations when user has completed onboarding
// This watch depends on the user watch above to fetch the profile first
watch(
  [() => userStore.hasCompletedOnboarding, () => userStore.profile],
  async ([hasCompleted, profile]) => {
    const currentUser = user.value;
    const userId = getUserId(currentUser);

    if (currentUser && userId && hasCompleted && profile) {
      // Fetch recommendations if user has completed onboarding
      await fetchRecommendations();
    }
  },
  { immediate: true }
);

const fetchRecommendations = async () => {
  console.log('Frontend: fetchRecommendations called', {
    hasUser: !!user.value,
    hasCompletedOnboarding: userStore.hasCompletedOnboarding,
    profile: !!userStore.profile,
  });

  if (!user.value || !userStore.hasCompletedOnboarding) {
    console.log('Frontend: fetchRecommendations early return');
    return;
  }

  loadingRecommendations.value = true;
  try {
    // Get the session token from Supabase client
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      console.error('No session available');
      // Set empty recommendations to show empty state
      recommendations.value = {
        recommended: [],
        easyToWatch: [],
        basedOnLikes: [],
      };
      return;
    }

    // Use $fetch with the session token in headers
    const data = await $fetch<{
      recommended: Recommendation[];
      easyToWatch: Recommendation[];
      basedOnLikes: Recommendation[];
    }>('/api/recommendations', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      credentials: 'include', // Include cookies for session
    });

    console.log('Frontend: Received recommendations data:', {
      recommended: data.recommended?.length || 0,
      easyToWatch: data.easyToWatch?.length || 0,
      basedOnLikes: data.basedOnLikes?.length || 0,
      fullData: data,
    });

    // Ensure we're assigning arrays, not undefined
    const recommendedArray = Array.isArray(data.recommended)
      ? data.recommended
      : [];
    const easyToWatchArray = Array.isArray(data.easyToWatch)
      ? data.easyToWatch
      : [];
    const basedOnLikesArray = Array.isArray(data.basedOnLikes)
      ? data.basedOnLikes
      : [];

    recommendations.value = {
      recommended: recommendedArray,
      easyToWatch: easyToWatchArray,
      basedOnLikes: basedOnLikesArray,
    };

    console.log('Frontend: recommendations.value after assignment:', {
      recommended: recommendations.value.recommended.length,
      easyToWatch: recommendations.value.easyToWatch.length,
      basedOnLikes: recommendations.value.basedOnLikes.length,
      recommendedData: recommendations.value.recommended.slice(0, 2),
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    // Set empty recommendations to show empty state even on error
    recommendations.value = {
      recommended: [],
      easyToWatch: [],
      basedOnLikes: [],
    };
  } finally {
    loadingRecommendations.value = false;
  }
};

// Password validation
// Password validation moved to AuthForm component

// Initialize user store if user is logged in
// This watch ensures the profile is loaded when user changes
watch(
  user,
  async (newUser, oldUser) => {
    console.log('User watch triggered:', {
      hasNewUser: !!newUser,
      hasOldUser: !!oldUser,
      currentProfile: !!userStore.profile,
      currentLoading: userStore.loading,
    });

    // Supabase user can have either 'id' or 'sub' as the identifier
    const userId = getUserId(newUser);
    const oldUserId = getUserId(oldUser);

    // Only fetch if user changed or if we don't have a profile yet
    if (newUser && userId) {
      // Set user first if not already set
      const currentUserId = getUserId(userStore.user);
      if (!userStore.user || currentUserId !== userId) {
        console.log('Setting user in store');
        userStore.setUser(newUser);
      }

      // Only fetch profile if we don't have one or if user changed
      if (!userStore.profile || (oldUser && oldUserId !== userId)) {
        console.log('Fetching profile...');
        await userStore.fetchProfile();
        // Force reactivity update by accessing the store directly after fetch
        await nextTick();
        console.log('Profile fetched:', {
          hasProfile: !!userStore.profile,
          onboardingCompleted: userStore.hasCompletedOnboarding,
          loading: userStore.loading,
        });

        // If onboarding is complete, fetch recommendations immediately
        if (userStore.hasCompletedOnboarding) {
          console.log('Onboarding complete, fetching recommendations...');
          await fetchRecommendations();
        }
      } else {
        console.log('Profile already exists, skipping fetch');
        // If profile already exists and onboarding is complete, fetch recommendations
        if (userStore.hasCompletedOnboarding) {
          console.log(
            'Profile exists and onboarding complete, fetching recommendations...'
          );
          await fetchRecommendations();
        }
      }
      // Always set initialProfileLoaded to true after checking/fetching profile
      initialProfileLoaded.value = true;
    } else if (!newUser && oldUser) {
      // Clear store when user logs out (only if there was a previous user)
      console.log('Clearing user store - user logged out');
      userStore.reset();
      initialProfileLoaded.value = false;
    }
  },
  { immediate: true }
);

// Also reload profile when page is mounted (useful when navigating back from onboarding)
onMounted(async () => {
  // Supabase user can have either 'id' or 'sub' as the identifier
  const userId = getUserId(user.value);
  if (user.value && userId) {
    // If profile is not loaded yet, fetch it
    if (!userStore.profile) {
      await userStore.fetchProfile();
    }
    // Always set initialProfileLoaded to true after checking
    initialProfileLoaded.value = true;
  }
});

const scrollToHowItWorks = () => {
  if (typeof window !== 'undefined') {
    const element = document.getElementById('como-funciona');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};

// Auth handlers moved to AuthForm component
const handleAuthSuccess = async () => {
  // Wait for user state to update
  await new Promise((resolve) => setTimeout(resolve, 100));
  const currentUser = useSupabaseUser();
  const userId = getUserId(currentUser.value);
  if (currentUser.value && userId) {
    userStore.setUser(currentUser.value);
    await userStore.fetchProfile();
    // Redirect based on whether user has likes (records in user_likes table)
    if (userStore.hasLikes) {
      await navigateTo('/');
    } else {
      await navigateTo('/onboarding');
    }
  }
};

const handleSignupSuccess = () => {
  // Signup success is handled in AuthForm component
  // This can be used for any additional logic if needed
};

const handleGetStarted = async () => {
  if (user.value) {
    // User is logged in, check onboarding status
    const userId = getUserId(user.value);
    if (userId) {
      // Ensure user is set in store before fetching profile
      const currentUserId = getUserId(userStore.user);
      if (!userStore.user || currentUserId !== userId) {
        userStore.setUser(user.value);
      }
      await userStore.fetchProfile(); // Ensure profile is up to date
      // Check if user has completed onboarding
      if (userStore.hasCompletedOnboarding) {
        await navigateTo('/');
      } else {
        await navigateTo('/onboarding');
      }
    }
  } else {
    // Show auth form (it's inside HeroSection now)
    showAuthForm.value = true;
    // Scroll to form
    await nextTick();
    const element = document.getElementById('auth-form');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};

// translateAuthError moved to AuthForm component
</script>

<template>
  <div class="w-full">
    <!-- Hero Section (only show if user is not logged in or hasn't completed onboarding) -->
    <!-- Wait for profile to load before showing/hiding hero -->
    <HeroSection
      v-if="
        !user || (initialProfileLoaded && !userStore.hasCompletedOnboarding)
      "
      :button-text="!user ? 'Descubrir qué ver' : 'Ver recomendaciones'"
      :show-auth-form="showAuthForm"
      :is-authenticated="!!user"
      :initial-profile-loaded="initialProfileLoaded"
      :has-completed-onboarding="userStore.hasCompletedOnboarding"
      @get-started="handleGetStarted"
      @scroll-to-how-it-works="scrollToHowItWorks"
      @auth-success="handleAuthSuccess"
      @signup-success="handleSignupSuccess"
    />

    <!-- Personalized Recommendations (for authenticated users who completed onboarding) -->
    <!-- Only show if user is authenticated (we'll show loading/empty states inside) -->
    <section v-if="user" class="py-12 md:py-16 px-4">
      <div class="container mx-auto max-w-7xl">
        <!-- Debug info (remove in production) -->
        <div
          class="mb-4 text-xs text-gray-500 dark:text-gray-400 p-2 bg-gray-100 dark:bg-gray-800 rounded"
        >
          Debug: user={{ !!user }}, profile={{ !!userStore.profile }},
          hasCompleted={{ userStore.hasCompletedOnboarding }},
          loadingRecommendations={{ loadingRecommendations }}, storeLoading={{
            userStore.loading
          }}, recs={{ recommendations.recommended.length }}, easy={{
            recommendations.easyToWatch.length
          }}, based={{ recommendations.basedOnLikes.length }}<br />
          Recommendations:
          {{
            JSON.stringify({
              recs: recommendations.recommended.length,
              easy: recommendations.easyToWatch.length,
              based: recommendations.basedOnLikes.length,
            })
          }}
        </div>

        <!-- Show loading state while profile is being fetched -->
        <div
          v-if="userStore.loading && !userStore.profile"
          class="text-center py-12"
        >
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
          ></div>
          <p class="text-gray-600 dark:text-gray-400">Cargando perfil...</p>
        </div>

        <!-- Show content when profile is loaded -->
        <template v-else-if="!userStore.loading || userStore.profile">
          <!-- Welcome message for logged-in users -->
          <div class="mb-8 text-center">
            <h1
              class="text-3xl md:text-4xl font-bold dark:text-white text-gray-900 mb-2 font-heading"
            >
              Tus recomendaciones
            </h1>
            <p class="text-gray-600 dark:text-gray-300">
              Basadas en lo que te gusta
            </p>
          </div>
          <!-- Loading State for Recommendations -->
          <div v-if="loadingRecommendations" class="text-center py-12">
            <div
              class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
            ></div>
            <p class="text-gray-600 dark:text-gray-400">
              Cargando recomendaciones...
            </p>
          </div>

          <!-- Empty State - Show when not loading and no recommendations -->
          <div
            v-else-if="
              recommendations.recommended.length === 0 &&
              recommendations.easyToWatch.length === 0 &&
              recommendations.basedOnLikes.length === 0
            "
            class="text-center py-12"
          >
            <div class="max-w-md mx-auto">
              <svg
                class="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <h3
                class="text-xl font-semibold dark:text-white text-gray-900 mb-2 font-heading"
              >
                Aún no hay recomendaciones
              </h3>
              <p class="text-gray-600 dark:text-gray-400 mb-6">
                Para recibir recomendaciones personalizadas, primero necesitas
                agregar películas y series que te gusten. Esto nos ayuda a
                conocerte mejor y sugerirte contenido que realmente disfrutarás.
              </p>
              <nuxt-link
                to="/onboarding"
                class="inline-block px-6 py-3 bg-gradient-to-r from-primary via-accent to-secondary hover:from-secondary hover:via-pink-500 hover:to-primary text-white rounded-lg font-medium transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-xl"
              >
                Agregar favoritos
              </nuxt-link>
            </div>
          </div>

          <!-- Recommendations Sections - Show when not loading and there are recommendations -->
          <div v-else>
            <RecommendationSection
              v-if="recommendations.recommended.length > 0"
              title="Recomendado para ti"
              :recommendations="recommendations.recommended"
            />

            <RecommendationSection
              v-if="recommendations.easyToWatch.length > 0"
              title="Fácil de ver / Baja atención"
              :recommendations="recommendations.easyToWatch"
            />

            <RecommendationSection
              v-if="recommendations.basedOnLikes.length > 0"
              title="Basado en lo que te gusta"
              :recommendations="recommendations.basedOnLikes"
            />
          </div>
        </template>
      </div>
    </section>

    <!-- How It Works Section -->
    <!-- How it Works Section (only show if user hasn't completed onboarding) -->
    <section
      v-if="
        !user || (initialProfileLoaded && !userStore.hasCompletedOnboarding)
      "
      id="como-funciona"
      class="py-16 md:py-24 px-4 dark:bg-gray-900/50 bg-gray-50/50"
    >
      <div class="container mx-auto max-w-6xl">
        <h2
          class="text-3xl md:text-4xl font-bold text-center mb-12 dark:text-white text-gray-900 font-heading"
        >
          Cómo funciona
        </h2>
        <div
          class="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-5xl mx-auto"
        >
          <!-- Step 1 -->
          <div class="text-center">
            <div
              class="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg"
            >
              1
            </div>
            <h3
              class="text-xl font-semibold mb-3 dark:text-white text-gray-900 font-heading"
            >
              Dinos qué te gusta
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              Selecciona hasta 10 películas o series que disfrutas. Así
              conocemos tus gustos.
            </p>
          </div>

          <!-- Step 2 -->
          <div class="text-center">
            <div
              class="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-pink-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg"
            >
              2
            </div>
            <h3
              class="text-xl font-semibold mb-3 dark:text-white text-gray-900 font-heading"
            >
              Cuéntanos tu momento
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              Indica cómo te sientes, tu nivel de energía y cuánto tiempo
              tienes.
            </p>
          </div>

          <!-- Step 3 -->
          <div class="text-center">
            <div
              class="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-secondary flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg"
            >
              3
            </div>
            <h3
              class="text-xl font-semibold mb-3 dark:text-white text-gray-900 font-heading"
            >
              Te decimos qué ver ahora
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              Recibe una recomendación perfecta para este momento, sin tener que
              decidir.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Value Proposition Section (only show if user is not logged in) -->
    <section v-if="!user" class="py-16 md:py-24 px-4">
      <div class="container mx-auto max-w-3xl">
        <p
          class="text-center text-2xl md:text-3xl lg:text-4xl font-semibold dark:text-white text-gray-900 mb-4 font-heading"
        >
          No es otra lista más.
        </p>
        <p
          class="text-center text-2xl md:text-3xl lg:text-4xl font-semibold text-primary dark:text-primary-400 font-heading"
        >
          Es una decisión hecha por ti, pero sin pensar.
        </p>
      </div>
    </section>
  </div>
</template>
