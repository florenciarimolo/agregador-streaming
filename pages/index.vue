<script setup lang="ts">
import { computed, watchEffect, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useRecommendations } from '@/composables/useRecommendations';
import { useTitleActions } from '@/composables/useTitleActions';
import { getSession } from '@/services/auth';
import { TITLE_STATUS } from '@/constants/domain/titleStatus';
import { QUERY_PARAMS } from '@/constants/api/queryParams';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Section from '@/components/layout/Section.vue';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';

// Middleware handles onboarding check - if user has session, onboarding is completed
definePageMeta({
  middleware: ['onboarding'],
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const user = useSupabaseUser();
const userStore = useUserStore();

// SEO
const config = useRuntimeConfig();
const siteUrl = config.public.baseUrl || config.public.siteUrl;

watchEffect(() => {
  const isAuthenticated = !!user.value;
  useHead({
    title: isAuthenticated ? t('seo.defaultTitle') : t('seo.homeTitlePublic'),
    titleTemplate: isAuthenticated ? '%s' : undefined,
    meta: [
      {
        name: 'robots',
        content: isAuthenticated ? 'noindex, nofollow' : 'index, follow',
      },
    ],
    link: [
      {
        rel: 'canonical',
        href: `${siteUrl}/`,
      },
    ],
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
    ogUrl: `${siteUrl}/`,
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

// Fetch user preferences to check if region is set
const { data: userPreferences, pending: preferencesPending } = useAsyncData(
  'user-preferences-region',
  async () => {
    if (!user.value) return null;

    try {
      const {
        data: { session },
      } = await getSession();

      if (!session?.access_token) {
        return null;
      }

      const response = await $fetch<{
        success: boolean;
        preferences: {
          region?: string;
        } | null;
      }>('/api/users/preferences', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      return response.success && response.preferences
        ? response.preferences
        : null;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return null;
    }
  },
  {
    server: false,
    default: () => null,
    watch: [user],
  }
);

// Computed: Check if auth is fully initialized
const isAuthReady = computed(() => {
  return userStore.authInitialized;
});

// Computed: Check if user profile is ready (if user exists, profile must be loaded)
const isProfileReady = computed(() => {
  // If no user, profile is ready (no profile needed)
  if (!user.value) return true;
  // If user exists, profile must be loaded (not null)
  return userStore.profile !== null;
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
  () => canShowContent.value && hasRegion.value && !userStore.hasLikes
);

const showNoResultsWithFilters = computed(
  () =>
    canShowContent.value &&
    hasRegion.value &&
    userStore.hasLikes &&
    hasAttemptedLoad.value &&
    recommendations.value.length === 0 &&
    !loading.value &&
    (route.query[QUERY_PARAMS.MOOD] || route.query[QUERY_PARAMS.ATTENTION])
);

const showRecommendationsList = computed(
  () =>
    canShowContent.value &&
    hasRegion.value &&
    userStore.hasLikes &&
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

// Handle auth success (redirect handled by middleware)
const handleAuthSuccess = async () => {
  await navigateTo('/', { replace: true });
};

const handleSignupSuccess = () => {
  // Signup success is handled in AuthForm component
};

const showAuthForm = ref(false);

// Check if auth query param is present to show auth form
onMounted(() => {
  // Redirect auth-related query params to /auth/callback
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
        path: '/auth/callback',
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
  <div class="w-full">
    <!-- Global Loading State - Show while state is initializing -->
    <ClientOnly>
      <template #default>
        <div v-if="!isStateReady" class="w-full min-h-screen flex items-center justify-center">
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
            @auth-success="handleAuthSuccess"
            @signup-success="handleSignupSuccess"
          />
        </template>
        <template #fallback>
          <!-- Placeholder during SSR -->
        </template>
      </ClientOnly>

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
                      class="text-xs font-semibold tracking-wide text-gray-800 uppercase dark:text-gray-300"
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
              <div class="space-y-4 md:space-y-8">
                <!-- First row: full row -->
                <div
                  class="grid grid-cols-2 gap-4 md:grid-cols-5 lg:grid-cols-6 overflow-visible"
                >
                  <SkeletonMediaCard
                    v-for="i in 6"
                    :key="`skeleton-${i}`"
                    :show-rating="i % 3 !== 0"
                    :show-watchlist="i % 4 === 0"
                  />
                </div>
                <!-- Second row: only 2 cards -->
                <div
                  class="grid grid-cols-2 gap-4 md:grid-cols-5 lg:grid-cols-6 overflow-visible"
                >
                  <SkeletonMediaCard
                    v-for="i in 2"
                    :key="`skeleton-${i + 6}`"
                    :show-rating="(i + 6) % 3 !== 0"
                    :show-watchlist="(i + 6) % 4 === 0"
                  />
                </div>
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
                    class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300 font-heading"
                  >
                    {{ $t('home.noRegion') }}
                  </h3>
                  <p class="mb-6 text-gray-800 dark:text-gray-300">
                    {{ $t('home.noRegionDescription') }}
                  </p>
                  <nuxt-link
                    to="/preferences"
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
                    class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300 font-heading"
                  >
                    {{ $t('home.noRecommendations') }}
                  </h3>
                  <p class="mb-6 text-gray-800 dark:text-gray-300">
                    {{ $t('home.noRecommendationsDescription') }}
                  </p>
                  <nuxt-link
                    to="/lists?tab=liked"
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
                    class="mb-3 text-xl font-semibold text-gray-800 dark:text-gray-300"
                  >
                    {{ $t('home.noResultsWithFilters') }}
                  </h3>
                  <p class="mb-6 text-gray-600 dark:text-gray-400">
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

    <!-- How It Works Section -->
    <section v-if="showHero" id="como-funciona" class="py-6">
      <AppShell>
        <PageContainer>
          <Section>
            <h2
              class="mb-6 text-3xl font-bold text-center text-gray-800 md:text-4xl dark:text-gray-300 font-heading"
            >
              {{ $t('home.howItWorksTitle') }}
            </h2>
            <div class="grid gap-4 md:grid-cols-3">
              <Card
                padding="lg"
                custom-class="!bg-white/60 dark:!bg-gray-900/40 md:p-8 relative overflow-hidden group hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors flex flex-col text-center"
              >
                <div
                  class="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gradient-to-r rounded-full from-primary to-accent"
                >
                  <span class="text-2xl font-bold text-white">1</span>
                </div>
                <h3
                  class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300 font-heading"
                >
                  {{ $t('home.step1Title') }}
                </h3>
                <p class="text-gray-800 dark:text-gray-300">
                  {{ $t('home.step1Description') }}
                </p>
              </Card>
              <Card
                padding="lg"
                custom-class="!bg-white/60 dark:!bg-gray-900/40 md:p-8 relative overflow-hidden group hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors flex flex-col text-center"
              >
                <div
                  class="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gradient-to-r rounded-full from-accent to-secondary"
                >
                  <span class="text-2xl font-bold text-white">2</span>
                </div>
                <h3
                  class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300 font-heading"
                >
                  {{ $t('home.step2Title') }}
                </h3>
                <p class="text-gray-800 dark:text-gray-300">
                  {{ $t('home.step2Description') }}
                </p>
              </Card>
              <Card
                padding="lg"
                custom-class="!bg-white/60 dark:!bg-gray-900/40 md:p-8 relative overflow-hidden group hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors flex flex-col text-center"
              >
                <div
                  class="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gradient-to-r rounded-full from-secondary to-pink"
                >
                  <span class="text-2xl font-bold text-white">3</span>
                </div>
                <h3
                  class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300 font-heading"
                >
                  {{ $t('home.step3Title') }}
                </h3>
                <p class="text-gray-800 dark:text-gray-300">
                  {{ $t('home.step3Description') }}
                </p>
              </Card>
            </div>
          </Section>
        </PageContainer>
      </AppShell>
    </section>

    <!-- Value Proposition Section -->
    <section v-if="showHero" class="pb-16 md:pt-16">
      <AppShell>
        <PageContainer>
          <div class="w-full text-center">
            <p
              class="mb-6 text-2xl font-semibold leading-relaxed text-gray-900 md:text-3xl dark:text-gray-100"
            >
              {{ $t('home.tagline1') }}
            </p>
            <p
              class="text-3xl font-semibold leading-relaxed text-gray-900 md:text-5xl dark:text-gray-100"
            >
              {{ $t('home.tagline2') }}
              <span
                class="text-transparent bg-clip-text bg-gradient-to-r from-primary-700 via-primary-800 to-primary-900 dark:from-primary-400 dark:via-primary-500 dark:to-primary-600"
                style="
                  background-clip: text;
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                "
                >{{ $t('home.tagline3') }}</span
              >
              {{ $t('home.tagline4') }}
              <span
                class="text-transparent bg-clip-text bg-gradient-to-r from-primary-700 via-primary-800 to-primary-900 dark:from-primary-400 dark:via-primary-500 dark:to-primary-600"
                style="
                  background-clip: text;
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                "
                >{{ $t('home.tagline5') }}</span
              >{{ $t('home.tagline6') }}
            </p>
          </div>
        </PageContainer>
      </AppShell>
    </section>
    </template>
  </div>
</template>
