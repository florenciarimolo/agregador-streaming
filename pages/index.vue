<script setup lang="ts">
import { computed, watchEffect, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useRecommendations } from '@/composables/useRecommendations';
import { useTitleActions } from '@/composables/useTitleActions';
import { useUserRegion } from '@/composables/useUserRegion';
import { TITLE_STATUS } from '@/constants/domain/titleStatus';
import { QUERY_PARAMS } from '@/constants/api/queryParams';
import { useHreflang } from '@/composables/useHreflang';
import { useCanonical } from '@/composables/useCanonical';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Section from '@/components/layout/Section.vue';
import Button from '@/components/ui/Button.vue';
import ProblemSection from '@/components/home/ProblemSection.vue';
import ProductFlowSection from '@/components/home/ProductFlowSection.vue';
import DifferentiationSection from '@/components/home/DifferentiationSection.vue';
import DiscoverSection from '@/components/home/DiscoverSection.vue';
import ProductValueSection from '@/components/home/ProductValueSection.vue';
import FaqSection from '@/components/home/FaqSection.vue';
import FinalCtaSection from '@/components/home/FinalCtaSection.vue';
import AnimatedBackground from '@/components/AnimatedBackground.vue';

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
  filterRecommendationsByType,
  fetchRecommendations
);

// Use composable for user region (has cache, avoids duplicate API calls)
const { getUserRegion } = useUserRegion();
const userRegion = ref<string | null>(null);
const preferencesPending = ref(false);

// Fetch user region once when user is available
watch(
  user,
  async (newUser) => {
    if (!newUser) {
      userRegion.value = null;
      preferencesPending.value = false;
      return;
    }

    preferencesPending.value = true;
    try {
      userRegion.value = await getUserRegion();
    } catch (error) {
      console.error('Error fetching user region:', error);
      userRegion.value = null;
    } finally {
      preferencesPending.value = false;
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
  // If user exists, preferences must be loaded (not pending)
  return !preferencesPending.value;
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

// Remove filters
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

// Handle auth success - redirect to home with language
const handleAuthSuccess = async () => {
  await navigateTo(routeWithLang('/'), { replace: true });
};

const handleSignupSuccess = () => {
  // Signup success is handled in AuthForm component
};

const showAuthForm = ref(false);

// Check if auth query param is present to show auth form
onMounted(() => {
  // Redirect auth-related query params to auth/callback with language
  if (typeof window !== 'undefined') {
    const hasCode = !!route.query.code;
    const hasError = !!(
      route.query.error ||
      route.query.error_code ||
      route.query.error_description ||
      route.query.error_message
    );

    if (hasCode || hasError) {
      router.replace({
        path: routeWithLang('/auth/callback'),
        query: route.query,
      });
      return;
    }
  }
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
              <!-- Filters Section -->
              <Section v-if="canShowContent">
                <div class="flex flex-col gap-4">
                  <MoodSelector />

                  <!-- Content Type Filter -->
                  <div
                    class="p-6 rounded-3xl border backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 border-gray-300/50 dark:border-white/10 md:p-8"
                  >
                    <div class="flex flex-col gap-2">
                      <label
                        class="text-label uppercase tracking-overline font-label text-gray-800 dark:text-gray-300"
                      >
                        {{ $t('home.contentTypeFilter') }}
                      </label>
                      <div class="flex flex-wrap gap-2">
                        <button
                          v-for="typeOption in [
                            { value: 'all', label: $t('home.contentTypeAll') },
                            {
                              value: 'movie',
                              label: $t('home.contentTypeMovie'),
                            },
                            { value: 'tv', label: $t('home.contentTypeTv') },
                          ]"
                          :key="typeOption.value"
                          :class="[
                            'px-3 py-1.5 rounded-full font-medium transition-all text-xs',
                            selectedContentType === typeOption.value
                              ? 'bg-primary-800 text-white border border-gray-700/50 dark:border-gray-600/50'
                              : 'bg-gray-100/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700/50 hover:border-primary/50 dark:hover:border-purple-500/30',
                          ]"
                          @click="
                            selectedContentType = typeOption.value as
                              | 'all'
                              | 'movie'
                              | 'tv'
                          "
                        >
                          {{ typeOption.label }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Section>

              <!-- Skeleton loading -->
              <Section v-if="showSkeleton && loading && !hasAttemptedLoad">
                <div
                  class="grid grid-cols-2 gap-4 md:grid-cols-5 lg:grid-cols-6 overflow-visible"
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
                  :title="$t('home.recommendationsTitle')"
                  :description="$t('home.recommendationsDescription')"
                  :recommendations="recommendations"
                  :loading-titles="loadingTitles"
                  :is-loading="fetchingReplacement"
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
