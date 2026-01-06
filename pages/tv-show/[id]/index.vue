<template>
  <AppShell>
    <PageContainer>
      <div class="w-full pt-0 pb-6 lg:pt-6">
        <!-- Skeleton loading (after delay) -->
        <template v-if="showSkeleton && isLoading">
          <SkeletonMediaDetail />
        </template>

        <!-- Error state -->
        <div
          v-else-if="hasError"
          class="flex items-center justify-center min-h-[80dvh]"
        >
          <div class="w-full max-w-2xl px-4">
            <Alert
              variant="error"
              :message="$t('media.errorLoadingTvShow')"
              :show-icon="true"
            />
          </div>
        </div>

        <!-- Content -->
        <template v-else-if="!isLoading">
          <section class="pt-0 pb-6 w-full space-y-4 md:space-y-8 lg:pt-6">
            <MediaBannerDetail
              :media="tvShowWithProviders as unknown as Media"
              :media-type="MEDIA_TYPE.TV"
              :in-production="tvShowWithProviders.in_production"
            />
          </section>
          <Section>
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <h2
                  class="text-2xl font-semibold text-gray-800 md:text-3xl dark:text-gray-300 font-heading"
                >
                  {{ $t('media.seasons') }}
                </h2>
                <Badge
                  v-if="tvShowWithProviders.number_of_seasons"
                  :label="String(tvShowWithProviders.number_of_seasons)"
                  size="md"
                />
              </div>
            </div>
            <div
              class="relative grid grid-cols-2 gap-4 justify-items-stretch lg:grid-cols-4 xl:grid-cols-5 mt-4"
            >
              <TitleCard
                v-for="season in tvShowWithProviders.seasons"
                :key="season.id"
                :title="season.name"
                :poster-path="season.poster_path"
                :link-to="routeWithLang(`/tv-show/${tvShowId}/season/${season.season_number}`)"
                :link-aria-label="
                  $t('media.viewDetailsOf', { title: season.name })
                "
                :image-alt="$t('media.posterOf', { title: season.name })"
                :no-image-aria-label="
                  $t('media.noPosterAvailableFor', { title: season.name })
                "
                :show-content="true"
                :show-type="false"
                :hover-text="$t('media.viewEpisodes')"
                custom-class="shadow-lg hover:border-gray-300/50 dark:hover:border-white/10"
              >
                <!-- Season name badge - top left -->
                <template #top-left-badges>
                  <Badge :label="season.name" />
                </template>

                <!-- RatingBadge - top right -->
                <template #top-right-actions>
                  <RatingBadge
                    v-if="season.vote_average"
                    :rating="season.vote_average"
                  />
                </template>

                <!-- Content: Date and episode count -->
                <template #content>
                  <div class="flex flex-col gap-3">
                    <div
                      class="flex items-center gap-2 dark:text-gray-300 text-gray-800 text-xs md:text-sm"
                    >
                      <IconCalendar icon-class="w-3 h-3 md:w-4 md:h-4" />
                      <span
                        class="truncate"
                        :class="{ italic: !season.air_date || season.air_date.trim() === '' }"
                      >{{
                        formatDateByRegion(season.air_date, userRegion, t)
                      }}</span>
                    </div>
                    <div
                      class="flex items-center gap-2 dark:text-gray-300 text-gray-800 text-xs md:text-sm"
                    >
                      <IconEpisodes icon-class="w-3 h-3 md:w-4 md:h-4" />
                      <span class="truncate">{{
                        $t(
                          (season.episode_count || 0) === 1
                            ? 'media.episodesCount_one'
                            : 'media.episodesCount_other',
                          {
                            count: season.episode_count || 0,
                          }
                        )
                      }}</span>
                    </div>
                  </div>
                </template>
              </TitleCard>
            </div>
          </Section>
        </template>
      </div>
    </PageContainer>
  </AppShell>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useFetch, useSeoMeta, useHead } from 'nuxt/app';
import { computed, onMounted, watch, ref } from 'vue';
import { useRouteWithLang } from '@/composables/useRouteWithLang';

import type { TVShow } from '@/types/TVShow';
import { formatDateByRegion } from '@/utils/formatDate';
import { WatchProviderTypes } from '@/types/WatchProvider';
import MediaBannerDetail from '@/components/MediaBannerDetail.vue';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import type { Media } from '@/types/Media';
import IconCalendar from '@/components/icons/IconCalendar.vue';
import IconEpisodes from '@/components/icons/IconEpisodes.vue';
import RatingBadge from '@/components/RatingBadge.vue';
import Badge from '@/components/Badge.vue';
import TitleCard from '@/components/TitleCard.vue';
import { useTVShowSchema } from '@/composables/useSchemaOrg';
import { getTVShowSeoExperience } from '@/composables/useSeoExperience';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Section from '@/components/layout/Section.vue';
import Alert from '@/components/ui/Alert.vue';

const route = useRoute();
const { locale } = useI18n();
const { getUserRegion } = useUserRegion();
const userRegion = ref<string | null>(null);
const { lang } = useRouteWithLang();

// Get current language URL code for API calls
const currentLangUrlCode = computed(() => lang.value);

const tvShowId = route.params.id;

const {
  data: tvShowDetails,
  pending: tvShowPending,
  error: tvShowError,
  refresh: refreshTVShowDetails,
} = await useFetch<TVShow>(`/api/tmdb/tvshows/${tvShowId}`, {
  query: { lang: currentLangUrlCode },
});

const {
  data: tvProviders,
  pending: tvProvidersPending,
  error: tvProvidersError,
  refresh: refreshTVProviders,
} = await useFetch(`/api/tmdb/tvshows/${tvShowId}/providers`, {
  query: { lang: currentLangUrlCode },
});

// Watch for locale changes and refresh all data
watch(
  () => locale.value,
  async (newLocale, oldLocale) => {
    if (newLocale && oldLocale && newLocale !== oldLocale) {
      if (import.meta.dev) {
        console.log(
          '[tv-show/[id]/index.vue] Language changed, refreshing TV show data:',
          {
            oldLocale,
            newLocale,
          }
        );
      }
      // Refresh all data with new language
      await Promise.all([refreshTVShowDetails(), refreshTVProviders()]);
    }
  },
  { immediate: false }
);

const isLoading = computed(
  () => tvShowPending.value || tvProvidersPending.value
);
const hasError = computed(() => tvShowError.value || tvProvidersError.value);

// Skeleton loading state with delay (500-700ms)
const showSkeleton = ref(false);
let skeletonTimeoutId: ReturnType<typeof setTimeout> | null = null;

// Watch isLoading to show skeleton after delay
watch(isLoading, (isLoadingValue) => {
  if (isLoadingValue) {
    // Clear any existing timeout
    if (skeletonTimeoutId) {
      clearTimeout(skeletonTimeoutId);
    }
    // Show skeleton after 600ms delay
    skeletonTimeoutId = setTimeout(() => {
      if (isLoading.value) {
        showSkeleton.value = true;
      }
    }, 600);
  } else {
    // Clear timeout and hide skeleton immediately when loading stops
    if (skeletonTimeoutId) {
      clearTimeout(skeletonTimeoutId);
      skeletonTimeoutId = null;
    }
    showSkeleton.value = false;
  }
});

const tvShow = computed<TVShow>(() => {
  if (!tvShowDetails.value) {
    return {} as TVShow;
  }
  return tvShowDetails.value as TVShow;
});
const tvShowProviders = computed(
  () => (tvProviders.value as WatchProviderTypes) || ({} as WatchProviderTypes)
);

const tvShowWithProviders = computed<TVShow>(() => {
  return {
    ...tvShow.value,
    providers: tvShowProviders.value,
  };
});

// SEO: TV Show page - public, indexable
const config = useRuntimeConfig();
const siteUrl = config.public.baseUrl || config.public.siteUrl;

const { t } = useI18n();
const { routeWithLang } = useRouteWithLang();

// Get SEO experience based on genre
const seoExperienceKey = computed(() => getTVShowSeoExperience(tvShow.value));
const seoExperience = computed(() => t(seoExperienceKey.value));

// Meta tags dinámicos
const pageTitle = computed(() => {
  const name = tvShow.value?.name || t('media.series');
  return `${name} – ${t('seo.tvShowPrefix')} ${seoExperience.value}`;
});

const pageDescription = computed(() => {
  const title = tvShow.value?.name || t('media.series');
  const experience = seoExperience.value;
  return t('seo.tvShowDescription', { title, experience });
});

const ogImage = computed(() => {
  if (tvShow.value?.backdrop_path) {
    return `https://image.tmdb.org/t/p/w1280${tvShow.value.backdrop_path}`;
  }
  if (tvShow.value?.poster_path) {
    return `https://image.tmdb.org/t/p/w780${tvShow.value.poster_path}`;
  }
  return '';
});

// Canonical URL - ensure unique, avoid duplicates with /tv-show/[id]/index
// SEO: hreflang and canonical
const { hreflangLinks } = useHreflang();
const { canonicalUrl: canonicalUrlFromComposable } = useCanonical();

// Schema.org JSON-LD
const tvShowSchema = computed(() => {
  if (!tvShow.value) return null;
  return useTVShowSchema(tvShow.value, siteUrl);
});

useHead({
  title: pageTitle,
  meta: [
    {
      name: 'description',
      content: pageDescription,
    },
    {
      name: 'robots',
      content: 'index, follow',
    },
  ],
  link: [
    ...hreflangLinks.value,
    {
      rel: 'canonical',
      href: canonicalUrlFromComposable.value,
    },
  ],
  script: tvShowSchema.value
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify(tvShowSchema.value),
        },
      ]
    : [],
});

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogImage: ogImage,
  ogType: 'video.TV_show',
  ogUrl: canonicalUrlFromComposable.value,
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterImage: ogImage,
  robots: 'index, follow',
});

// Save the previous route when mounting
onMounted(async () => {
  // Get user region for date formatting
  userRegion.value = await getUserRegion();
  if (import.meta.client) {
    const referrer = document.referrer;
    const currentOrigin = window.location.origin;

    // Only save if the referrer is from the same origin (within the app)
    if (referrer && referrer.startsWith(currentOrigin)) {
      try {
        const referrerPath = new URL(referrer).pathname;
        // Don't save if we're coming from another detail page or season page (to avoid loops)
        if (
          !referrerPath.startsWith('/movie/') &&
          !referrerPath.startsWith('/tv-show/')
        ) {
          sessionStorage.setItem('previousRoute', referrerPath);
        }
      } catch {
        // If URL parsing fails, ignore
      }
    }
  }
});
</script>

<style scoped>
.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
}

.line-clamp-3 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}
</style>
