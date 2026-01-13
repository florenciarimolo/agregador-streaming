<script setup lang="ts">
import { computed, watchEffect, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useRecommendations } from '@/composables/useRecommendations';
import { useTitleActions } from '@/composables/useTitleActions';
import { TITLE_STATUS } from '@/constants/domain/titleStatus';
import { QUERY_PARAMS } from '@/constants/api/queryParams';
import type { Mood } from '@/constants/domain/mood';
import type { Attention } from '@/constants/domain/attention';
import { useHreflang } from '@/composables/useHreflang';
import { useCanonical } from '@/composables/useCanonical';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Section from '@/components/layout/Section.vue';
import SectionTitle from '@/components/layout/SectionTitle.vue';
import Button from '@/components/ui/Button.vue';
import IconFilter from '@/components/icons/IconFilter.vue';
import FilterCards from '@/components/home/FilterCards.vue';
import ProblemSection from '@/components/home/ProblemSection.vue';
import ProductFlowSection from '@/components/home/ProductFlowSection.vue';
import DifferentiationSection from '@/components/home/DifferentiationSection.vue';
import DiscoverSection from '@/components/home/DiscoverSection.vue';
import ProductValueSection from '@/components/home/ProductValueSection.vue';
import FaqSection from '@/components/home/FaqSection.vue';
import FinalCtaSection from '@/components/home/FinalCtaSection.vue';
import AnimatedBackground from '@/components/AnimatedBackground.vue';
import RecommendationSection from '@/components/RecommendationSection.vue';
import ViewModeSelector from '@/components/ViewModeSelector.vue';
import { useViewMode } from '@/composables/useViewMode';
import { VIEW_MODE } from '@/constants/domain/viewMode';
import { getSession } from '@/services/auth';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';

// Middleware handles onboarding check - if user has session, onboarding is completed
definePageMeta({
  middleware: ['onboarding'],
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const user = useSupabaseUser();

// Get language from URL (this page is /:lang/ with strategy: 'prefix')
// Use useRouteWithLang for reactive route building
const { routeWithLang } = useRouteWithLang();

// Computed routes with language prefix
// CRITICAL: routeWithLang() accesses route.params.lang directly, ensuring reactivity
// These computed will automatically re-evaluate when route.params.lang changes
const preferencesRoute = computed(() => routeWithLang('/preferences'));
const listsRoute = computed(() => routeWithLang('/lists?tab=liked'));

// Safely get userStore - it may not be available immediately after Pinia initialization
// Use a computed to lazy-load the store, but only on client side
const userStore = computed(() => {
  // Only try to get store on client side
  if (import.meta.server) {
    return {
      profile: null,
      authInitialized: false,
      hasCompletedOnboarding: false,
      likesCount: 0,
      hasLikes: false,
    };
  }

  try {
    return useUserStore();
  } catch (error) {
    // If store is not available, return a fallback object
    if (process.env.NODE_ENV === 'development') {
      console.warn('[pages/index.vue] useUserStore not available:', error);
    }
    return {
      profile: null,
      authInitialized: false,
      hasCompletedOnboarding: false,
      likesCount: 0,
      hasLikes: false,
    };
  }
});

// SEO: hreflang and canonical (only for public pages)
const { hreflangLinks } = useHreflang();
const { canonicalUrl } = useCanonical();

watchEffect(() => {
  const isAuthenticated = !!user.value;

  // Only add hreflang and canonical for public (non-authenticated) pages
  // hreflangLinks is a computed, so we need to use .value
  const seoLinks = isAuthenticated
    ? []
    : [
        ...(hreflangLinks.value || []),
        {
          rel: 'canonical',
          href: canonicalUrl,
        },
      ];

  useHead({
    title: isAuthenticated ? t('seo.defaultTitle') : t('seo.homeTitlePublic'),
    titleTemplate: isAuthenticated ? '%s' : undefined,
    meta: [
      {
        name: 'robots',
        content: isAuthenticated ? 'noindex, nofollow' : 'index, follow',
      },
    ],
    link: seoLinks,
    htmlAttrs: {},
    bodyAttrs: {},
  });

  useSeoMeta({
    title: isAuthenticated ? t('seo.defaultTitle') : t('seo.homeTitlePublic'),
    description: isAuthenticated
      ? t('seo.homeDescription')
      : t('seo.homeDescriptionPublic'),
    ogTitle: isAuthenticated ? t('seo.defaultTitle') : t('seo.homeTitlePublic'),
    ogDescription: isAuthenticated
      ? t('seo.homeDescription')
      : t('seo.homeDescriptionPublic'),
    ogType: 'website',
    ogUrl: canonicalUrl,
    twitterCard: 'summary_large_image',
    robots: isAuthenticated ? 'noindex, nofollow' : 'index, follow',
  });
});

// Use recommendations composable
const {
  recommendations,
  allRecommendations,
  loading,
  showSkeleton,
  selectedContentType,
  hasAttemptedLoad,
  fetchRecommendations,
  filterRecommendationsByType,
} = useRecommendations();

// Local pending content type (not applied until "Aplicar" is clicked)
// Initialize to 'all' - content type is not stored in query params, so always start fresh
const pendingContentType = ref<'all' | 'movie' | 'tv'>('all');

// Use title actions composable
const {
  loadingTitles,
  fetchingReplacement,
  handleTitleStatus,
  handleMarkLiked,
  handleRemoveLiked,
} = useTitleActions(
  recommendations,
  allRecommendations,
  filterRecommendationsByType
);

// User region (will be set from preferences)
const userRegion = ref<string | null>(null);
const preferencesPending = ref(false);
const regionLoadAttempted = ref(false);

// Filter state
const showFilterCards = ref(false);
const selectedGenres = ref<Array<{ id: number; name: string }>>([]);
const selectedProviders = ref<
  Array<{
    provider_id: number;
    provider_name: string;
    logo_path: string | null;
  }>
>([]);
const filtersLoading = ref(false);
// Local state for mood and attention (not applied until "Aplicar" is clicked)
const selectedMood = ref<Mood | null>(
  (route.query[QUERY_PARAMS.MOOD] as Mood) || null
);
const selectedAttention = ref<Attention | null>(
  (route.query[QUERY_PARAMS.ATTENTION] as Attention) || null
);

// Genres data - only loaded when user is logged in
// Genres are only needed for filters, which are only shown to authenticated users
const genresData = ref<{
  movie: { genres: Array<{ id: number; name: string }> };
  tv: { genres: Array<{ id: number; name: string }> };
} | null>(null);

// Only fetch genres when user is logged in
watch(
  user,
  async (newUser) => {
    // Only fetch if user exists and genres haven't been loaded yet
    if (newUser && !genresData.value) {
      try {
        const [movieResponse, tvResponse] = await Promise.all([
          $fetch<{ genres: Array<{ id: number; name: string }> }>(
            `/api/tmdb/genres?type=${MEDIA_TYPE.MOVIE}`
          ),
          $fetch<{ genres: Array<{ id: number; name: string }> }>(
            `/api/tmdb/genres?type=${MEDIA_TYPE.TV}`
          ),
        ]);
        genresData.value = { movie: movieResponse, tv: tvResponse };
      } catch (error) {
        console.error('Error fetching genres:', error);
        genresData.value = { movie: { genres: [] }, tv: { genres: [] } };
      }
    } else if (!newUser) {
      // Clear genres when user logs out
      genresData.value = null;
    }
  },
  { immediate: false } // Don't execute immediately - wait for user to be available
);

const availableGenres = computed(() => {
  if (!genresData.value) return [];
  const allGenres: Array<{
    id: number;
    name: string;
    type?: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
  }> = [];
  const movieGenres = genresData.value.movie?.genres || [];
  movieGenres.forEach((g: { id: number; name: string }) => {
    if (g.name) {
      allGenres.push({ id: g.id, name: g.name, type: MEDIA_TYPE.MOVIE });
    }
  });
  const tvGenres = genresData.value.tv?.genres || [];
  tvGenres.forEach((g: { id: number; name: string }) => {
    if (g.name) {
      allGenres.push({ id: g.id, name: g.name, type: MEDIA_TYPE.TV });
    }
  });
  return allGenres
    .filter((genre) => genre.name)
    .sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === MEDIA_TYPE.MOVIE ? -1 : 1;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
});

// Load providers based on user region
const providersData = ref<{
  results: Array<{
    provider_id: number;
    provider_name: string;
    logo_path: string | null;
  }>;
} | null>(null);

const loadProvidersForRegion = async (region: string) => {
  try {
    const response = await $fetch<{
      results: Array<{
        provider_id: number;
        provider_name: string;
        logo_path: string | null;
      }>;
    }>('/api/tmdb/watch-providers', {
      query: { region },
    });
    providersData.value = response;
  } catch (error) {
    console.error('Error loading providers for region:', error);
    providersData.value = { results: [] };
  }
};

const availableProviders = computed(() => {
  if (!providersData.value) return [];
  if (!providersData.value.results) return [];
  if (!Array.isArray(providersData.value.results)) return [];
  return providersData.value.results.map((p) => ({
    provider_id: p.provider_id,
    provider_name: p.provider_name,
    logo_path: p.logo_path,
  }));
});

// Store preferences data to map genres/providers when they become available
const userPreferencesData = ref<{
  favorite_genres?: number[];
  included_providers?: number[];
  region?: string | null;
} | null>(null);

// Fetch user preferences (genres and providers) - only called once when user is available
const fetchUserPreferences = async () => {
  if (!user.value) return;

  filtersLoading.value = true;
  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      return;
    }

    const response = await $fetch<{
      success: boolean;
      preferences: {
        favorite_genres?: number[];
        included_providers?: number[];
        region?: string | null;
      } | null;
    }>('/api/users/preferences', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (import.meta.dev) {
      console.log('[pages/index.vue] Raw API response:', {
        success: response.success,
        hasPreferences: !!response.preferences,
        region: response.preferences?.region,
        regionType: typeof response.preferences?.region,
        regionIsNull: response.preferences?.region === null,
        regionIsUndefined: response.preferences?.region === undefined,
        fullResponse: JSON.stringify(response, null, 2),
      });
    }

    if (response.success && response.preferences) {
      // Store preferences data for reactive mapping
      userPreferencesData.value = response.preferences;

      // Set userRegion from preferences (single source of truth)
      // Check for null explicitly since it can come from database
      const regionValue = response.preferences.region;
      if (
        regionValue !== null &&
        regionValue !== undefined &&
        typeof regionValue === 'string' &&
        regionValue.length > 0
      ) {
        if (userRegion.value !== regionValue) {
          if (import.meta.dev) {
            console.log(
              '[pages/index.vue] Setting userRegion from preferences:',
              regionValue
            );
          }
          userRegion.value = regionValue;
        }
      } else {
        // Explicitly set to null if region is not available
        if (userRegion.value !== null) {
          if (import.meta.dev) {
            console.warn(
              '[pages/index.vue] Region is null/undefined/empty in preferences, clearing userRegion. Value:',
              regionValue,
              'Type:',
              typeof regionValue
            );
          }
          userRegion.value = null;
        }
      }

      // Load providers for region if region is available
      if (response.preferences.region) {
        await loadProvidersForRegion(response.preferences.region);
      }

      // Map genres and providers immediately if available
      mapPreferencesToSelections();
    }
  } catch (error) {
    console.error('Error fetching user preferences:', error);
  } finally {
    filtersLoading.value = false;
  }
};

// Map preferences to selected genres/providers (called reactively when data becomes available)
const mapPreferencesToSelections = () => {
  if (!userPreferencesData.value) return;

  // Map genres
  if (
    userPreferencesData.value.favorite_genres &&
    userPreferencesData.value.favorite_genres.length > 0
  ) {
    if (availableGenres.value.length > 0) {
      selectedGenres.value = availableGenres.value.filter((g) =>
        userPreferencesData.value?.favorite_genres?.includes(g.id)
      );
    }
  } else {
    selectedGenres.value = [];
  }

  // Map providers
  if (
    userPreferencesData.value.included_providers &&
    userPreferencesData.value.included_providers.length > 0
  ) {
    if (availableProviders.value.length > 0) {
      selectedProviders.value = availableProviders.value.filter((p) =>
        userPreferencesData.value?.included_providers?.includes(p.provider_id)
      );
    }
  } else {
    selectedProviders.value = [];
  }
};

// Watch for genres/providers to become available and map preferences reactively
// This avoids duplicate API calls - we fetch preferences once, then map when data is ready
watch(
  [availableGenres, availableProviders],
  () => {
    if (userPreferencesData.value) {
      mapPreferencesToSelections();
    }
  },
  { immediate: false }
);

// Fetch user preferences (including region) once when user is available
watch(
  user,
  async (newUser) => {
    if (!newUser) {
      userRegion.value = null;
      preferencesPending.value = false;
      regionLoadAttempted.value = false;
      userPreferencesData.value = null;
      return;
    }

    preferencesPending.value = true;
    regionLoadAttempted.value = false;
    try {
      // Fetch all preferences in a single call (includes region, genres, providers)
      await fetchUserPreferences();
      if (import.meta.dev) {
        console.log(
          '[pages/index.vue] User preferences loaded, region:',
          userRegion.value
        );
      }
      // Load providers for region (already done in fetchUserPreferences if region exists)
      if (userRegion.value && availableProviders.value.length === 0) {
        await loadProvidersForRegion(userRegion.value);
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      userRegion.value = null;
    } finally {
      preferencesPending.value = false;
      regionLoadAttempted.value = true;
    }
  },
  { immediate: true }
);

// Computed for userPreferences to match existing API
const userPreferences = computed(() => {
  if (!userRegion.value) return null;
  return { region: userRegion.value };
});

// Computed: Check if auth is fully initialized
const isAuthReady = computed(() => {
  return userStore.value.authInitialized;
});

// Computed: Check if user profile is ready (if user exists, profile must be loaded)
const isProfileReady = computed(() => {
  // If no user, profile is ready (no profile needed)
  if (!user.value) return true;
  // If user exists, profile must be loaded (not null)
  return userStore.value.profile !== null;
});

// Computed: Check if preferences are ready (if user exists, preferences must be loaded)
const isPreferencesReady = computed(() => {
  // If no user, preferences are ready (no preferences needed)
  if (!user.value) return true;
  // If user exists, we must have attempted to load region and finished loading
  // This ensures we don't show empty states prematurely during hydration
  return regionLoadAttempted.value && !preferencesPending.value;
});

// Computed: Check if all state is ready
const isStateReady = computed(() => {
  return isAuthReady.value && isProfileReady.value && isPreferencesReady.value;
});

// Computed: Check if user has region
const hasRegion = computed(() => {
  return !!userPreferences.value?.region;
});

// Computed: Show hero section (no user)
// Only show when state is ready and there's no user
const showHero = computed(() => isStateReady.value && !user.value);

// View mode for recommendations (default: list)
const { viewMode } = useViewMode('home', VIEW_MODE.LIST);

// Computed: Show recommendations section (user exists)
// Only show when state is ready and user exists
const showRecommendations = computed(() => isStateReady.value && !!user.value);

// Computed: Can show content (user exists, profile loaded, and preferences loaded)
const canShowContent = computed(
  () => isStateReady.value && showRecommendations.value
);

// Computed: Empty states
const showNoRegion = computed(() => canShowContent.value && !hasRegion.value);

const showNoLikes = computed(
  () => canShowContent.value && hasRegion.value && !userStore.value.hasLikes
);

const showNoResultsWithFilters = computed(
  () =>
    canShowContent.value &&
    hasRegion.value &&
    userStore.value.hasLikes &&
    hasAttemptedLoad.value &&
    recommendations.value.length === 0 &&
    !loading.value &&
    (route.query[QUERY_PARAMS.MOOD] || route.query[QUERY_PARAMS.ATTENTION])
);

const showRecommendationsList = computed(
  () =>
    canShowContent.value &&
    hasRegion.value &&
    userStore.value.hasLikes &&
    recommendations.value.length > 0
);

// Remove filters (mood/attention query params)
const removeFilters = async () => {
  const query: Record<string, string> = {};
  Object.keys(route.query).forEach((key) => {
    if (key !== 'mood' && key !== 'attention') {
      const value = route.query[key];
      if (value !== null && value !== undefined) {
        const strValue = Array.isArray(value) ? value[0] : value;
        if (strValue !== null) {
          query[key] = strValue;
        }
      }
    }
  });
  await navigateTo({ query }, { replace: true });
};

// Clear genre and provider filters (does not apply - user must click "Aplicar")
const clearGenreProviderFilters = () => {
  selectedGenres.value = [];
  selectedProviders.value = [];
  selectedMood.value = null;
  selectedAttention.value = null;
  pendingContentType.value = 'all';
};

// Save filters to user_preferences
const saveFilters = async () => {
  if (!user.value) return;

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      return;
    }

    const preferencesToSave = {
      favorite_genres: selectedGenres.value.map((g) => g.id),
      included_providers: selectedProviders.value.map((p) => p.provider_id),
    };

    await $fetch('/api/users/preferences', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: preferencesToSave,
    });
  } catch (error) {
    console.error('Error saving filters:', error);
  }
};

// Apply filters handler (called when user clicks "Aplicar" button)
const applyFilters = async () => {
  if (!user.value) return;

  filtersLoading.value = true;

  try {
    // Save genre and provider preferences
    await saveFilters();

    // Update query params with mood and attention (this will trigger refetch)
    const query: Record<string, string> = {};

    // Copy existing query params (excluding mood, attention, and type)
    Object.keys(route.query).forEach((key) => {
      if (
        key !== QUERY_PARAMS.MOOD &&
        key !== QUERY_PARAMS.ATTENTION &&
        key !== QUERY_PARAMS.TYPE
      ) {
        const value = route.query[key];
        if (value !== null && value !== undefined) {
          const strValue = Array.isArray(value) ? value[0] : value;
          if (strValue !== null) {
            query[key] = strValue;
          }
        }
      }
    });

    // Add mood and attention to query params
    if (selectedMood.value) {
      query[QUERY_PARAMS.MOOD] = selectedMood.value;
    } else {
      delete query[QUERY_PARAMS.MOOD];
    }

    if (selectedAttention.value) {
      query[QUERY_PARAMS.ATTENTION] = selectedAttention.value;
    } else {
      delete query[QUERY_PARAMS.ATTENTION];
    }

    // Add content type to query params if not 'all'
    if (pendingContentType.value !== 'all') {
      query[QUERY_PARAMS.TYPE] = pendingContentType.value;
    } else {
      delete query[QUERY_PARAMS.TYPE];
    }

    // Update content type in useRecommendations (this will trigger filtering)
    selectedContentType.value = pendingContentType.value;

    // Update route query params (this will trigger the watcher in useRecommendations)
    await router.replace({ query });

    // Clear current recommendations to show skeleton while loading
    allRecommendations.value = [];
    recommendations.value = [];

    // Refresh recommendations to apply new filters
    const fetched = await fetchRecommendations();
    allRecommendations.value = fetched;
    filterRecommendationsByType();
  } catch (error) {
    console.error('Error applying filters:', error);
  } finally {
    filtersLoading.value = false;
  }
};

// Check if there are active genre/provider filters
// Handle auth success - redirect to home with language
const handleAuthSuccess = async () => {
  await navigateTo(routeWithLang('/'), { replace: true });
};

const handleSignupSuccess = () => {
  // Signup success is handled in AuthForm component
};

const handleCloseAuthForm = () => {
  showAuthForm.value = false;
  // Remove auth=login from URL
  const { auth, ...restQuery } = route.query;
  if (auth) {
    router.replace({ query: restQuery });
  }
};

const showAuthForm = ref(false);

// Check if auth query param is present to show auth form
onMounted(() => {
  // CRITICAL: Redirect auth codes to callback FIRST, before any other processing
  // This prevents the auth listener from processing the session before we can check the recovery flag
  const hasCode = !!route.query.code;
  const hasError = !!(
    route.query.error ||
    route.query.error_code ||
    route.query.error_description ||
    route.query.error_message
  );

  if (hasCode || hasError) {
    // Redirect immediately to callback, preserving all query params
    router.replace({
      path: routeWithLang('/auth/callback'),
      query: route.query,
    });
    return;
  }

  // Only check for auth=login query param if no code/error
  if (route.query.auth === 'login' && !user.value) {
    showAuthForm.value = true;
  }
});
</script>

<template>
  <div class="w-full relative">
    <!-- Animated Background - Solo cuando no hay sesión, fijo al hacer scroll -->
    <ClientOnly>
      <AnimatedBackground v-if="showHero" />
    </ClientOnly>

    <!-- Global Loading State - Show while state is initializing -->
    <ClientOnly>
      <template #default>
        <div
          v-if="!isStateReady"
          class="w-full min-h-screen flex items-center justify-center"
        >
          <div class="flex flex-col items-center gap-4">
            <div
              class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"
            ></div>
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              {{ $t('common.loading') || 'Cargando...' }}
            </p>
          </div>
        </div>
      </template>
      <template #fallback>
        <!-- Placeholder during SSR -->
        <div class="w-full min-h-screen flex items-center justify-center">
          <div class="flex flex-col items-center gap-4">
            <div
              class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"
            ></div>
          </div>
        </div>
      </template>
    </ClientOnly>

    <!-- Content - Only show when state is ready -->
    <template v-if="isStateReady">
      <!-- Hero Section -->
      <ClientOnly>
        <template #default>
          <HeroSection
            v-if="showHero"
            :button-text="$t('hero.discoverButton')"
            :show-auth-form="showAuthForm"
            :is-authenticated="false"
            :hide-background="true"
            @auth-success="handleAuthSuccess"
            @signup-success="handleSignupSuccess"
            @close="handleCloseAuthForm"
          />
        </template>
        <template #fallback>
          <!-- Placeholder during SSR -->
        </template>
      </ClientOnly>

      <!-- New Landing Page Sections (only for non-authenticated users) -->
      <ProblemSection />
      <ProductFlowSection />
      <DiscoverSection />
      <DifferentiationSection />
      <ProductValueSection />
      <FaqSection />
      <FinalCtaSection />

      <!-- Recommendations Section -->
      <ClientOnly v-if="showRecommendations">
        <section>
          <AppShell>
            <PageContainer>
              <!-- Recommendations Title and Description -->
              <Section
                v-if="
                  canShowContent &&
                  (showRecommendationsList || (showSkeleton && loading))
                "
              >
                <div class="flex items-start justify-between gap-4">
                  <SectionTitle
                    :description="$t('home.recommendationsDescription')"
                  >
                    {{ $t('home.recommendationsTitle') }}
                  </SectionTitle>
                  <ViewModeSelector page-key="home" />
                </div>
              </Section>

              <!-- Filters Section -->
              <Section v-if="canShowContent && hasRegion">
                <div class="flex flex-col gap-4">
                  <!-- Filter Toggle Button -->
                  <div class="flex justify-start">
                    <Button
                      variant="primary"
                      size="small"
                      icon-position="left"
                      custom-class="cursor-pointer"
                      @click="showFilterCards = !showFilterCards"
                    >
                      <template #icon>
                        <IconFilter icon-class="w-4 h-4" />
                      </template>
                      {{ $t('home.filters') }}
                    </Button>
                  </div>

                  <!-- Filter Cards (Mood, Attention, Content Type, Genre and Provider Filters) -->
                  <FilterCards
                    :is-open="showFilterCards"
                    :available-genres="availableGenres"
                    :available-providers="availableProviders"
                    :selected-genres="selectedGenres"
                    :selected-providers="selectedProviders"
                    :selected-content-type="pendingContentType"
                    :selected-mood="selectedMood"
                    :selected-attention="selectedAttention"
                    @update:selected-genres="selectedGenres = $event"
                    @update:selected-providers="selectedProviders = $event"
                    @update:selected-content-type="pendingContentType = $event"
                    @update:selected-mood="selectedMood = $event"
                    @update:selected-attention="selectedAttention = $event"
                    @clear="clearGenreProviderFilters"
                    @apply="applyFilters"
                  />
                </div>
              </Section>

              <!-- Skeleton loading (also show while filters are loading) -->
              <Section v-if="(showSkeleton && loading) || filtersLoading">
                <div
                  class="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6 overflow-visible"
                >
                  <SkeletonMediaCard
                    v-for="i in 20"
                    :key="`skeleton-${i}`"
                    :show-rating="i % 3 !== 0"
                    :show-watchlist="i % 4 === 0"
                  />
                </div>
              </Section>

              <!-- Empty State: No region -->
              <Section v-if="showNoRegion">
                <div class="py-6 text-center">
                  <div class="mx-auto w-full max-w-md">
                    <svg
                      class="mx-auto mb-4 w-16 h-16 text-gray-600 dark:text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 002 2h2.945M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h3
                      class="mb-2 text-h3 font-heading font-semibold text-gray-800 dark:text-gray-300"
                    >
                      {{ $t('home.noRegion') }}
                    </h3>
                    <p
                      class="mb-6 text-body font-body text-gray-800 dark:text-gray-300"
                    >
                      {{ $t('home.noRegionDescription') }}
                    </p>
                    <nuxt-link
                      :to="preferencesRoute"
                      class="inline-block px-6 py-3 text-base font-medium text-white rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 bg-primary-800 dark:bg-primary hover:bg-primary-900 dark:hover:bg-primary-600 border-primary-600/50"
                    >
                      {{ $t('home.configurePreferences') }}
                    </nuxt-link>
                  </div>
                </div>
              </Section>

              <!-- Empty State: No likes -->
              <Section v-else-if="showNoLikes">
                <div class="py-6 text-center">
                  <div class="mx-auto w-full max-w-md">
                    <svg
                      class="mx-auto mb-4 w-16 h-16 text-gray-600 dark:text-gray-500"
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
                      class="mb-2 text-h3 font-heading font-semibold text-gray-800 dark:text-gray-300"
                    >
                      {{ $t('home.noRecommendations') }}
                    </h3>
                    <p
                      class="mb-6 text-body font-body text-gray-800 dark:text-gray-300"
                    >
                      {{ $t('home.noRecommendationsDescription') }}
                    </p>
                    <nuxt-link
                      :to="listsRoute"
                      class="inline-block px-6 py-3 text-base font-medium text-white rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 bg-primary-800 dark:bg-primary hover:bg-primary-900 dark:hover:bg-primary-600 border-primary-600/50"
                    >
                      {{ $t('home.addFavorites') }}
                    </nuxt-link>
                  </div>
                </div>
              </Section>

              <!-- Empty State: No results with filters -->
              <Section v-else-if="showNoResultsWithFilters">
                <div class="py-12 text-center">
                  <div class="mx-auto w-full max-w-md">
                    <h3
                      class="mb-3 text-h3 font-heading font-semibold text-gray-800 dark:text-gray-300"
                    >
                      {{ $t('home.noResultsWithFilters') }}
                    </h3>
                    <p
                      class="mb-6 text-body font-body text-gray-600 dark:text-gray-400"
                    >
                      {{ $t('home.noResultsWithFiltersDescription') }}
                    </p>
                    <div class="flex justify-center">
                      <Button
                        variant="outline"
                        size="small"
                        @click="removeFilters"
                      >
                        {{ $t('home.removeFilters') }}
                      </Button>
                    </div>
                  </div>
                </div>
              </Section>

              <!-- Recommendations List -->
              <Section v-else-if="showRecommendationsList">
                <RecommendationSection
                  :key="`rec-${recommendations.length}`"
                  :title="''"
                  :recommendations="recommendations"
                  :loading-titles="loadingTitles"
                  :is-loading="false"
                  :fetching-replacement="fetchingReplacement"
                  :view-mode="viewMode"
                  @mark-seen="handleTitleStatus($event, TITLE_STATUS.SEEN)"
                  @mark-not-interested="
                    handleTitleStatus($event, TITLE_STATUS.NOT_INTERESTED)
                  "
                  @mark-liked="handleMarkLiked($event)"
                  @remove-liked="handleRemoveLiked($event)"
                  @mark-watchlist="
                    handleTitleStatus($event, TITLE_STATUS.WATCHLIST)
                  "
                />
              </Section>
            </PageContainer>
          </AppShell>
        </section>
        <template #fallback>
          <section>
            <AppShell>
              <PageContainer>
                <div class="flex flex-col gap-6 pt-6 pb-6"></div>
              </PageContainer>
            </AppShell>
          </section>
        </template>
      </ClientOnly>
    </template>
  </div>
</template>
