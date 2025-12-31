<script setup lang="ts">
import { useUserStore } from '../stores/user';
import { Recommendations, Recommendation } from '@/types/Recommendation';
import { TitleStatus } from '@/types/TitleStatus';
import { getSession } from '@/composables/database/auth';
import { useUndoToast } from '@/composables/useUndoToast';
import { nextTick, onMounted, computed } from 'vue';

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
const user = useSupabaseUser();
const userStore = useUserStore();

// Computed to get effective user (from composable or store during hydration)
const effectiveUser = computed(() => {
  // During hydration, useSupabaseUser() might not be ready yet
  // So we check both the composable and the store
  return user.value || userStore.user;
});

// Route
const route = useRoute();

// State
const initialProfileLoaded = ref(false);
const showAuthForm = ref(false);
const loadingRecommendations = ref(false);
const hasAttemptedLoad = ref(false); // Track if we've attempted to load recommendations at least once
const recommendations = ref<Recommendations>({
  recommended: [],
  easyToWatch: [],
  basedOnLikes: [],
});

// Fetch recommendations function
const fetchRecommendations = async (): Promise<Recommendations> => {
  if (!user.value || !userStore.hasCompletedOnboarding) {
    return {
      recommended: [],
      easyToWatch: [],
      basedOnLikes: [],
    };
  }

  loadingRecommendations.value = true;
  try {
    const {
      data: { session },
      error: sessionError,
    } = await getSession();

    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return {
        recommended: [],
        easyToWatch: [],
        basedOnLikes: [],
      };
    }

    if (!session || !session.access_token) {
      return {
        recommended: [],
        easyToWatch: [],
        basedOnLikes: [],
      };
    }

    const data = await $fetch<Recommendations>('/api/recommendations', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      credentials: 'include',
    });

    // Ensure arrays are not undefined
    return {
      recommended: Array.isArray(data.recommended) ? data.recommended : [],
      easyToWatch: Array.isArray(data.easyToWatch) ? data.easyToWatch : [],
      basedOnLikes: Array.isArray(data.basedOnLikes) ? data.basedOnLikes : [],
    };
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return {
      recommended: [],
      easyToWatch: [],
      basedOnLikes: [],
    };
  } finally {
    loadingRecommendations.value = false;
  }
};

// Handle user state changes
const handleUserStateChange = async () => {
  // During hydration, useSupabaseUser() might not be ready yet
  // So we check both the composable and the store
  const userId = getUserId(user.value) || getUserId(userStore.user);
  const effectiveUser = user.value || userStore.user;

  if (!effectiveUser || !userId) {
    // No user: reset state (only if auth is initialized to avoid clearing during hydration)
    // AND we're not in hydration phase (to avoid clearing during brief null state)
    if (userStore.authInitialized && !isHydrating.value) {
      userStore.reset();
      recommendations.value = {
        recommended: [],
        easyToWatch: [],
        basedOnLikes: [],
      };
      hasAttemptedLoad.value = false; // Reset flag when clearing state
    }
    initialProfileLoaded.value = true;
    return;
  }

  // Set user in store if different (use the one from useSupabaseUser if available, otherwise from store)
  if (!userStore.user || getUserId(userStore.user) !== userId) {
    userStore.setUser(effectiveUser);
  }

  initialProfileLoaded.value = true;
};

// Track if we're already fetching to prevent concurrent calls
const isFetchingProfile = ref(false);
const lastFetchedUserId = ref<string | null>(null);
const isHydrating = ref(true); // Track if we're still in hydration phase
const isMounted = ref(false); // Track if component is mounted

// Single reactive watcher as the single source of truth
// CRITICAL: Only watch after auth is initialized to avoid race conditions on refresh
watch(
  () => ({
    authInitialized: userStore.authInitialized,
    userId: user.value?.id || (user.value as { sub?: string })?.sub || null,
    storeUserId:
      userStore.user?.id || (userStore.user as { sub?: string })?.sub || null,
  }),
  async ({ authInitialized, userId, storeUserId }) => {
    // CRITICAL: Don't execute watcher until auth is initialized
    // This prevents clearing recommendations during page refresh before auth hydrates
    if (!authInitialized) {
      return;
    }

    // During hydration, useSupabaseUser() might not be ready yet
    // So we check both the composable and the store
    const effectiveUserId = userId || storeUserId;

    // Skip if we're already fetching
    if (isFetchingProfile.value) {
      return;
    }

    // Handle user state changes first
    await handleUserStateChange();

    // If no user after checking both sources, clear recommendations
    // BUT only if we're not in hydration phase or if we're sure there's no user
    if (!effectiveUserId) {
      // During hydration, don't clear recommendations if store has a user
      // This prevents clearing during the brief moment when useSupabaseUser() is null
      // but the store still has the user from the plugin
      if (isHydrating.value && storeUserId) {
        // Still hydrating and store has user, wait for useSupabaseUser() to catch up
        return;
      }

      // Only clear if we're sure there's no user (not hydrating or no user in store either)
      recommendations.value = {
        recommended: [],
        easyToWatch: [],
        basedOnLikes: [],
      };
      lastFetchedUserId.value = null;
      hasAttemptedLoad.value = false; // Reset flag when clearing recommendations
      return;
    }

    // Skip if we already fetched for this user
    if (
      lastFetchedUserId.value === effectiveUserId &&
      recommendations.value.recommended.length > 0
    ) {
      return;
    }

    isFetchingProfile.value = true;
    loadingRecommendations.value = true;
    try {
      // Ensure profile is loaded
      await userStore.ensureProfile();

      // Check onboarding status AFTER profile is loaded
      if (!userStore.hasCompletedOnboarding) {
        recommendations.value = {
          recommended: [],
          easyToWatch: [],
          basedOnLikes: [],
        };
        hasAttemptedLoad.value = true; // Mark as attempted even if no onboarding
        return;
      }

      // Fetch recommendations
      const fetched = await fetchRecommendations();
      recommendations.value = fetched;
      lastFetchedUserId.value = effectiveUserId;
      hasAttemptedLoad.value = true; // Mark as attempted after successful fetch
    } catch (error) {
      console.error('[index.vue] Error fetching recommendations:', error);
      hasAttemptedLoad.value = true; // Mark as attempted even on error
    } finally {
      isFetchingProfile.value = false;
      loadingRecommendations.value = false;
    }
  },
  { immediate: true }
);

// Undo toast for not_interested actions
const { showToast } = useUndoToast();

// Handle marking a title with different statuses
// New logic: Single active status (watchlist/seen/not_interested)
// - Liking implies seen and removes from watchlist
// - Marking seen or liked removes from watchlist
// - Marking not_interested removes from all other states
const handleTitleStatus = async (
  title: Recommendation,
  status: TitleStatus,
  liked: boolean = false
) => {
  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      return;
    }

    // Update status in backend
    const response = await $fetch('/api/user-title-status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        tmdb_id: title.tmdb_id,
        type: title.type,
        status,
        liked,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[handleTitleStatus] Success:', { status, response });
    }

    // Show toast with appropriate message and action based on status
    if (status === TitleStatus.NOT_INTERESTED) {
      showToast(
        `"${title.title}" marcado como no me interesa`,
        {
          label: 'Deshacer',
          action: async () => {
            // Undo: delete the not_interested status
            await $fetch('/api/user-title-status', {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              query: {
                tmdb_id: title.tmdb_id,
              },
            });
            // Re-fetch recommendations to update UI
            await fetchRecommendations();
          },
        },
        7000
      );
    } else if (status === TitleStatus.SEEN) {
      showToast(
        `"${title.title}" marcado como visto`,
        {
          label: 'Ver vistos',
          action: async () => {
            await navigateTo('/seen');
          },
        },
        5000
      );
    } else if (status === TitleStatus.WATCHLIST) {
      showToast(
        `"${title.title}" guardado para ver más tarde`,
        {
          label: 'Ver lista',
          action: async () => {
            await navigateTo('/watchlist');
          },
        },
        5000
      );
    }

    // Optimistically remove from UI (except watchlist which stays)
    if (status !== TitleStatus.WATCHLIST) {
      recommendations.value = {
        recommended: recommendations.value.recommended.filter(
          (r) => r.tmdb_id !== title.tmdb_id
        ),
        easyToWatch: recommendations.value.easyToWatch.filter(
          (r) => r.tmdb_id !== title.tmdb_id
        ),
        basedOnLikes: recommendations.value.basedOnLikes.filter(
          (r) => r.tmdb_id !== title.tmdb_id
        ),
      };
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[handleTitleStatus] Error:', error);
    }
    // Show error toast
    const errorMessage =
      status === TitleStatus.WATCHLIST
        ? `Error al guardar "${title.title}" para ver más tarde`
        : status === TitleStatus.SEEN
          ? `Error al marcar "${title.title}" como visto`
          : `Error al actualizar el estado de "${title.title}"`;
    showToast(errorMessage, null, 3000);
  }
};

// Handle marking as liked (implies seen, removes from watchlist)
const handleMarkLiked = async (title: Recommendation) => {
  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[handleMarkLiked] No session available');
      }
      return;
    }

    // Update or insert with liked=true and status=seen
    // This automatically removes from watchlist (single active status)
    const response = await $fetch('/api/user-title-status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        tmdb_id: title.tmdb_id,
        type: title.type,
        status: TitleStatus.SEEN, // Liked implies seen
        liked: true,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[handleMarkLiked] Success:', response);
    }

    // Show toast with link to see liked titles
    showToast(
      `"${title.title}" agregado a tus favoritos`,
      {
        label: 'Ver favoritos',
        action: async () => {
          await navigateTo('/profile');
        },
      },
      5000
    );

    // Optimistically remove from UI (liked titles are seen, not in recommendations)
    recommendations.value = {
      recommended: recommendations.value.recommended.filter(
        (r) => r.tmdb_id !== title.tmdb_id
      ),
      easyToWatch: recommendations.value.easyToWatch.filter(
        (r) => r.tmdb_id !== title.tmdb_id
      ),
      basedOnLikes: recommendations.value.basedOnLikes.filter(
        (r) => r.tmdb_id !== title.tmdb_id
      ),
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[handleMarkLiked] Error:', error);
    }
    // Show error toast
    showToast(`Error al agregar "${title.title}" a favoritos`, null, 3000);
  }
};

const scrollToHowItWorks = () => {
  if (typeof window !== 'undefined') {
    const element = document.getElementById('como-funciona');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};

const handleAuthSuccess = async () => {
  // User will be updated by useSupabaseUser() and watch will trigger recommendations fetch
  // Just navigate based on current state
  if (userStore.hasLikes) {
    await navigateTo('/');
  } else {
    await navigateTo('/onboarding');
  }
};

const handleSignupSuccess = () => {
  // Signup success is handled in AuthForm component
};

const handleGetStarted = async () => {
  const currentUser = effectiveUser.value;
  if (currentUser) {
    const userId = getUserId(currentUser);
    if (userId) {
      const currentUserId = getUserId(userStore.user);
      if (!userStore.user || currentUserId !== userId) {
        userStore.setUser(currentUser);
      }
      userStore.setLoading(true);
      await userStore.fetchProfile();
      userStore.setLoading(false);
      if (userStore.hasCompletedOnboarding) {
        await navigateTo('/');
      } else {
        await navigateTo('/onboarding');
      }
    }
  } else {
    showAuthForm.value = true;
    await nextTick();
    const element = document.getElementById('auth-form');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};

// Check if auth query param is present to show auth form
onMounted(() => {
  if (route.query.auth === 'login' && !effectiveUser.value) {
    showAuthForm.value = true;
    nextTick(() => {
      const element = document.getElementById('auth-form');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // Mark hydration as complete after mount
  // Use nextTick to ensure all reactive updates have completed
  nextTick(() => {
    isHydrating.value = false;
    isMounted.value = true;
  });
});
</script>

<template>
  <div class="w-full">
    <!-- Hero Section -->
    <!-- Only show HeroSection when auth is initialized and there's no user, or user hasn't completed onboarding -->
    <ClientOnly>
      <HeroSection
        v-if="
          userStore.authInitialized &&
          (!effectiveUser ||
            (initialProfileLoaded && !userStore.hasCompletedOnboarding))
        "
        :button-text="
          !effectiveUser ? 'Descubrir qué ver' : 'Ver recomendaciones'
        "
        :show-auth-form="showAuthForm"
        :is-authenticated="!!effectiveUser"
        :initial-profile-loaded="initialProfileLoaded"
        :has-completed-onboarding="userStore.hasCompletedOnboarding"
        @get-started="handleGetStarted"
        @scroll-to-how-it-works="scrollToHowItWorks"
        @auth-success="handleAuthSuccess"
        @signup-success="handleSignupSuccess"
      />
      <template #fallback>
        <!-- Placeholder during SSR to maintain layout -->
        <section
          class="relative py-16 x-4 overflow-hidden min-h-[400px]"
        ></section>
      </template>
    </ClientOnly>

    <!-- Personalized Recommendations -->
    <ClientOnly>
      <section
        v-if="isMounted && userStore.authInitialized && effectiveUser"
        class="py-12 md:py-16 md:px-4"
      >
        <div class="container mx-auto max-w-7xl">
          <!-- Loading State -->
          <div v-if="loadingRecommendations" class="text-center py-12">
            <div
              class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
            ></div>
            <p class="text-gray-800 dark:text-gray-300">
              Cargando recomendaciones...
            </p>
          </div>

          <!-- Empty State -->
          <!-- Only show "no recommendations" message if we've attempted to load and there are none -->
          <div
            v-else-if="
              hasAttemptedLoad &&
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
                class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-2 font-heading"
              >
                Aún no hay recomendaciones
              </h3>
              <p class="text-gray-800 dark:text-gray-300 mb-6">
                Para recibir recomendaciones personalizadas, primero necesitas
                agregar películas y series que te gusten. Esto nos ayuda a
                conocerte mejor y sugerirte contenido que realmente disfrutarás.
              </p>
              <nuxt-link
                to="/onboarding"
                class="inline-block px-6 py-3 bg-primary-800 dark:bg-primary hover:bg-primary-900 dark:hover:bg-primary-600 text-white rounded-lg font-medium text-base transition-all duration-300 shadow-lg backdrop-blur-sm border border-primary-600/50"
              >
                Agregar favoritos
              </nuxt-link>
            </div>
          </div>

          <!-- Recommendations Sections -->
          <div v-else>
            <RecommendationSection
              v-if="
                recommendations.recommended &&
                recommendations.recommended.length > 0
              "
              :key="`rec-${recommendations.recommended.length}`"
              title="Recomendado para ti"
              description="Elegidas pensando en ti y en lo que sueles disfrutar."
              :recommendations="recommendations.recommended"
              @mark-seen="handleTitleStatus($event, TitleStatus.SEEN)"
              @mark-not-interested="
                handleTitleStatus($event, TitleStatus.NOT_INTERESTED)
              "
              @mark-liked="handleMarkLiked($event)"
              @mark-watchlist="handleTitleStatus($event, TitleStatus.WATCHLIST)"
            />

            <RecommendationSection
              v-if="
                recommendations.easyToWatch &&
                recommendations.easyToWatch.length > 0
              "
              :key="`easy-${recommendations.easyToWatch.length}`"
              title="Fácil de ver / Baja atención"
              description="Para esos momentos en los que quieres ver algo sin complicarte."
              :recommendations="recommendations.easyToWatch"
              @mark-seen="handleTitleStatus($event, TitleStatus.SEEN)"
              @mark-not-interested="
                handleTitleStatus($event, TitleStatus.NOT_INTERESTED)
              "
              @mark-liked="handleMarkLiked($event)"
              @mark-watchlist="handleTitleStatus($event, TitleStatus.WATCHLIST)"
            />

            <RecommendationSection
              v-if="
                recommendations.basedOnLikes &&
                recommendations.basedOnLikes.length > 0
              "
              :key="`based-${recommendations.basedOnLikes.length}`"
              title="Basado en lo que te gusta"
              description="Porque ya nos has dicho qué te funciona."
              :recommendations="recommendations.basedOnLikes"
              @mark-seen="handleTitleStatus($event, TitleStatus.SEEN)"
              @mark-not-interested="
                handleTitleStatus($event, TitleStatus.NOT_INTERESTED)
              "
              @mark-liked="handleMarkLiked($event)"
              @mark-watchlist="handleTitleStatus($event, TitleStatus.WATCHLIST)"
            />
          </div>
        </div>
      </section>
      <template #fallback>
        <!-- Empty fallback to prevent hydration mismatch -->
        <div></div>
      </template>
    </ClientOnly>

    <!-- How It Works Section -->
    <!-- Only show when auth is initialized and there's no user, or user hasn't completed onboarding -->
    <section
      v-if="
        userStore.authInitialized &&
        (!effectiveUser ||
          (initialProfileLoaded && !userStore.hasCompletedOnboarding))
      "
      id="como-funciona"
      class="pb-16 md:pt-16 md:px-4"
    >
      <div class="container mx-auto max-w-6xl">
        <h2
          class="text-3xl md:text-4xl font-bold text-center mb-16 dark:text-gray-300 text-gray-800 font-heading"
        >
          Cómo funciona
        </h2>
        <div class="grid md:grid-cols-3 gap-8">
          <div
            class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-300/50 dark:border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden group hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors flex flex-col text-center"
          >
            <div
              class="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <span class="text-2xl font-bold text-white">1</span>
            </div>
            <h3
              class="text-xl font-semibold mb-2 dark:text-gray-300 text-gray-800 font-heading"
            >
              Dinos qué te gusta
            </h3>
            <p class="text-gray-800 dark:text-gray-300">
              Selecciona hasta 10 películas y series que disfrutas. Esto nos
              ayuda a conocerte mejor.
            </p>
          </div>
          <div
            class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-300/50 dark:border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden group hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors flex flex-col text-center"
          >
            <div
              class="w-16 h-16 bg-gradient-to-r from-accent to-secondary rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <span class="text-2xl font-bold text-white">2</span>
            </div>
            <h3
              class="text-xl font-semibold mb-2 dark:text-gray-300 text-gray-800 font-heading"
            >
              Cuéntanos tu momento
            </h3>
            <p class="text-gray-800 dark:text-gray-300">
              Indica cómo te sientes, tu nivel de energía y el tiempo que tienes
              disponible.
            </p>
          </div>
          <div
            class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-300/50 dark:border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden group hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors flex flex-col text-center"
          >
            <div
              class="w-16 h-16 bg-gradient-to-r from-secondary to-pink rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <span class="text-2xl font-bold text-white">3</span>
            </div>
            <h3
              class="text-xl font-semibold mb-2 dark:text-gray-300 text-gray-800 font-heading"
            >
              Te decimos qué ver ahora
            </h3>
            <p class="text-gray-800 dark:text-gray-300">
              Recibe recomendaciones personalizadas basadas en tus gustos y tu
              momento actual.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Value Proposition Section -->
    <!-- Only show when auth is initialized and there's no user -->
    <section
      v-if="userStore.authInitialized && !effectiveUser"
      class="pb-16 md:pt-16 md:px-4"
    >
      <div class="container mx-auto max-w-4xl text-center">
        <p
          class="text-2xl md:text-3xl text-gray-800 dark:text-gray-300 leading-relaxed font-semibold mb-6"
        >
          No es otra lista más.
        </p>
        <p
          class="text-3xl md:text-5xl text-gray-800 dark:text-gray-300 leading-relaxed font-semibold"
        >
          Es una
          <span
            class="bg-gradient-to-r from-primary-700 via-primary-800 to-primary-900 dark:from-primary-400 dark:via-primary-500 dark:to-primary-600 bg-clip-text text-transparent"
            style="
              background-clip: text;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            "
            >decisión</span
          >
          hecha por ti, pero
          <span
            class="bg-gradient-to-r from-primary-700 via-primary-800 to-primary-900 dark:from-primary-400 dark:via-primary-500 dark:to-primary-600 bg-clip-text text-transparent"
            style="
              background-clip: text;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            "
            >sin pensar</span
          >.
        </p>
      </div>
    </section>
  </div>
</template>
