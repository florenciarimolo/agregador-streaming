<template>
  <AppShell>
    <PageContainer>
      <div class="w-full pt-6 pb-6">
        <!-- Loading state -->
        <div
          v-if="isLoading"
          class="flex items-center justify-center min-h-screen"
        >
          <div class="text-xl dark:text-gray-300 text-gray-800">{{
            $t('common.loading')
          }}</div>
        </div>

        <!-- Error state -->
        <div
          v-else-if="hasError"
          class="flex items-center justify-center min-h-screen"
        >
          <div class="text-xl text-red-500">{{
            $t('media.errorLoadingTvShow')
          }}</div>
        </div>

        <!-- Content -->
        <template v-else>
          <Section>
            <MediaBannerDetail
              :media="tvShowWithProviders as unknown as Media"
              :media-type="MediaTypeEnum.tv"
              :in-production="tvShowWithProviders.in_production"
            />
          </Section>
          <Section>
            <SectionTitle>{{ $t('media.seasons') }}</SectionTitle>
            <div class="w-full">
              <div
                class="relative grid grid-cols-2 gap-4 justify-items-stretch lg:grid-cols-3 xl:grid-cols-4"
              >
                <article
                  v-for="season in tvShowWithProviders.seasons"
                  :key="season.id"
                  class="rounded-3xl relative flex flex-col text-sm overflow-hidden bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-300/50 dark:border-white/10 w-full cursor-pointer group hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors shadow-lg"
                >
                  <nuxt-link
                    :to="`/tv-show/${tvShowId}/season/${season.season_number}`"
                    class="block"
                  >
                    <div class="aspect-[2/3] overflow-hidden relative">
                      <img
                        v-if="season.poster_path"
                        :src="`https://image.tmdb.org/t/p/w780${season.poster_path}`"
                        :alt="season.name"
                        class="w-full h-full object-cover"
                      />
                      <!-- RatingBadge in image (mobile only) -->
                      <div class="absolute top-2 right-2 md:hidden">
                        <RatingBadge
                          v-if="season.vote_average"
                          :rating="season.vote_average"
                        />
                      </div>
                      <div
                        class="absolute bottom-0 left-0 flex flex-col items-center justify-center w-full h-full px-4 transition-all duration-300 rounded opacity-0 group-hover:opacity-100 backdrop-blur-md w-inherit dark:bg-black/80 bg-white/80"
                      >
                        <p
                          class="dark:text-gray-300 text-gray-800 font-semibold"
                          >{{ $t('media.viewEpisodes') }}</p
                        >
                      </div>
                    </div>
                  </nuxt-link>

                  <div
                    class="flex flex-col justify-around py-3 px-3 md:py-5 md:px-6 min-h-[120px]"
                  >
                    <div
                      class="flex flex-col gap-2 md:flex-row md:items-center md:gap-3"
                    >
                      <p
                        class="text-sm md:text-lg font-semibold uppercase dark:text-gray-300 text-gray-800 line-clamp-2 md:line-clamp-1"
                        >{{ season.name }}</p
                      >
                      <!-- RatingBadge in content (desktop only) -->
                      <div class="hidden md:block flex-shrink-0">
                        <RatingBadge
                          v-if="season.vote_average"
                          :rating="season.vote_average"
                        />
                      </div>
                    </div>
                    <div
                      class="flex items-center gap-2 dark:text-gray-300 text-gray-800 text-xs md:text-sm"
                    >
                      <IconCalendar icon-class="w-3 h-3 md:w-4 md:h-4" />
                      <span class="truncate">{{
                        formatDateToSpanish(season.air_date)
                      }}</span>
                    </div>
                    <div
                      class="flex items-center gap-2 dark:text-gray-300 text-gray-800 text-xs md:text-sm"
                    >
                      <IconEpisodes icon-class="w-3 h-3 md:w-4 md:h-4" />
                      <span class="truncate">{{
                        $t('media.episodesCount', {
                          count: season.episode_count || 0,
                        })
                      }}</span>
                    </div>
                  </div>
                </article>
              </div>
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
import { computed, onMounted, watch } from 'vue';

import { TVShow } from '@/types/TVShow';
import { formatDateToSpanish } from '@/utils/formatDate';
import { WatchProviderTypes } from '@/types/WatchProvider';
import MediaBannerDetail from '@/components/MediaBannerDetail.vue';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import type { Media } from '@/types/Media';
import IconCalendar from '@/components/icons/IconCalendar.vue';
import IconEpisodes from '@/components/icons/IconEpisodes.vue';
import RatingBadge from '@/components/RatingBadge.vue';
import { useTVShowSchema } from '@/composables/useSchemaOrg';
import { getTVShowSeoExperience } from '@/composables/useSeoExperience';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Section from '@/components/layout/Section.vue';
import SectionTitle from '@/components/layout/SectionTitle.vue';

const route = useRoute();
const { locale } = useI18n();

const tvShowId = route.params.id;

const {
  data: tvShowDetails,
  pending: tvShowPending,
  error: tvShowError,
  refresh: refreshTVShowDetails,
} = await useFetch<TVShow>(`/api/tmdb/tvshows/${tvShowId}`);

const {
  data: tvProviders,
  pending: tvProvidersPending,
  error: tvProvidersError,
  refresh: refreshTVProviders,
} = await useFetch(`/api/tmdb/tvshows/${tvShowId}/providers`);

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
const canonicalUrl = computed(() => `${siteUrl}/tv-show/${tvShowId}`);

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
    {
      rel: 'canonical',
      href: canonicalUrl,
    },
  ],
  script: tvShowSchema.value
    ? [
        {
          type: 'application/ld+json',
          children: JSON.stringify(tvShowSchema.value),
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
  ogType: 'video.tv_show',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterImage: ogImage,
  robots: 'index, follow',
});

// Save the previous route when mounting
onMounted(() => {
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
      } catch (e) {
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
