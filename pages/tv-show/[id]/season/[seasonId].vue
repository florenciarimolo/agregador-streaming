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
            $t('media.loadingSeason')
          }}</div>
        </div>

        <!-- Error state -->
        <div
          v-else-if="hasError"
          class="flex items-center justify-center min-h-screen"
        >
          <div class="text-xl text-red-500">{{
            $t('media.errorLoadingSeason')
          }}</div>
        </div>

        <!-- Content -->
        <div v-else>
          <SeasonBannerDetail
            :season="seasonWithProviders"
            :tmdb-id="parseInt(String(seriesId), 10)"
            :series-id="String(seriesId)"
          />

          <!-- Episodios -->
          <Section>
            <SectionTitle>{{ $t('media.episodes') }}</SectionTitle>

            <div
              v-if="seasonWithProviders?.episodes?.length"
              class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3"
            >
              <article
                v-for="episode in seasonWithProviders.episodes"
                :key="episode.id"
                class="overflow-hidden bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-300/50 dark:border-white/10 rounded-3xl group hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors shadow-lg"
              >
                <div class="relative bg-gray-700 aspect-video">
                  <img
                    v-if="episode.still_path"
                    :src="`https://image.tmdb.org/t/p/w500${episode.still_path}`"
                    :alt="episode.name"
                    class="object-contain w-full h-full rounded-t-3xl max-h-[400px] lg:max-h-[500px]"
                  />
                  <div
                    v-else
                    class="flex items-center justify-center h-full dark:text-gray-400 text-gray-500"
                  >
                    <span class="text-4xl">📺</span>
                  </div>
                  <!-- RatingBadge - top right -->
                  <div class="absolute top-2 right-2 z-10">
                    <RatingBadge :rating="episode.vote_average" />
                  </div>
                </div>
                <div class="p-4">
                  <div class="flex flex-col gap-3 mb-3">
                    <!-- Episode name -->
                    <h4
                      class="font-semibold dark:text-gray-300 text-gray-800 text-sm md:text-base line-clamp-1"
                    >
                      {{ episode.name }}
                    </h4>
                    <!-- Date -->
                    <div
                      class="flex items-center gap-2 dark:text-gray-300 text-gray-800 text-xs md:text-sm"
                    >
                      <IconCalendar icon-class="w-3 h-3 md:w-4 md:h-4" />
                      <span class="truncate">{{
                        formatDateToSpanish(episode.air_date)
                      }}</span>
                    </div>
                    <!-- Duration -->
                    <div
                      v-if="episode.runtime"
                      class="flex items-center gap-2 dark:text-gray-300 text-gray-800 text-xs md:text-sm"
                    >
                      <IconClock icon-class="w-3 h-3 md:w-4 md:h-4" />
                      <span class="truncate">{{ episode.runtime }} min</span>
                    </div>
                  </div>
                  <p
                    :class="[
                      'text-sm dark:text-gray-300 text-gray-700 line-clamp-3',
                      { italic: !episode.overview },
                    ]"
                    >{{
                      episode.overview || $t('media.noDescriptionAvailable')
                    }}</p
                  >
                </div>
              </article>
            </div>

            <!-- Empty state -->
            <div
              v-else
              class="py-12 text-center dark:text-gray-400 text-gray-600"
            >
              <div class="text-xl">{{ $t('media.noEpisodes') }}</div>
            </div>
          </Section>
        </div>
      </div>
    </PageContainer>
  </AppShell>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useFetch } from 'nuxt/app';
import { computed, onMounted, watch } from 'vue';

import { Season, TVShow } from '@/types/TVShow';
import { WatchProviderTypes } from '@/types/WatchProvider';
import SeasonBannerDetail from '@/components/SeasonBannerDetail.vue';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Section from '@/components/layout/Section.vue';
import SectionTitle from '@/components/layout/SectionTitle.vue';
import RatingBadge from '@/components/RatingBadge.vue';
import IconCalendar from '@/components/icons/IconCalendar.vue';
import IconClock from '@/components/icons/IconClock.vue';
import { formatDateToSpanish } from '@/utils/formatDate';

const route = useRoute();
const { locale } = useI18n();

// Necesitamos obtener el seriesId desde la URL padre y el seasonId de los parámetros actuales
const seriesId = route.params.id;
const seasonId = route.params.seasonId;

// Fetch TV show details to get the series name
const {
  data: tvShowData,
  pending: tvShowPending,
  error: tvShowError,
  refresh: refreshTVShowDetails,
} = await useFetch<TVShow>(`/api/tmdb/tvshows/${seriesId}`);

const {
  data: seasonData,
  pending: seasonPending,
  error: seasonError,
  refresh: refreshSeasonData,
} = await useFetch<Season>(`/api/tmdb/tvshows/${seriesId}/seasons/${seasonId}`);

const isLoading = computed(
  () =>
    seasonPending.value || seasonProvidersPending.value || tvShowPending.value
);
const hasError = computed(
  () => seasonError.value || seasonProvidersError.value || tvShowError.value
);

const {
  data: seasonProviders,
  pending: seasonProvidersPending,
  error: seasonProvidersError,
  refresh: refreshSeasonProviders,
} = await useFetch<WatchProviderTypes>(
  `/api/tmdb/tvshows/${seriesId}/seasons/${seasonId}/providers`
);

// Watch for locale changes and refresh all data
watch(
  () => locale.value,
  async (newLocale, oldLocale) => {
    if (newLocale && oldLocale && newLocale !== oldLocale) {
      if (import.meta.dev) {
        console.log(
          '[tv-show/[id]/season/[seasonId].vue] Language changed, refreshing season data:',
          {
            oldLocale,
            newLocale,
          }
        );
      }
      // Refresh all data with new language
      await Promise.all([
        refreshTVShowDetails(),
        refreshSeasonData(),
        refreshSeasonProviders(),
      ]);
    }
  },
  { immediate: false }
);

const seasonWithProviders = computed(() => {
  if (!seasonData.value) return null;
  return {
    ...seasonData.value,
    providers: seasonProviders.value,
  } as Season & { providers?: WatchProviderTypes };
});

const { t } = useI18n();

const pageTitle = computed(() => {
  const seriesName = tvShowData.value?.name || '';
  const seasonName = seasonWithProviders.value?.name || '';

  if (seriesName && seasonName) {
    return `${seasonName} – ${seriesName}`;
  }
  if (seasonName) {
    return seasonName;
  }
  if (seriesName) {
    return `${t('media.seasonTitle')} – ${seriesName}`;
  }
  return t('media.seasonTitle');
});

useHead({
  title: pageTitle,
});

useSeoMeta({
  title: pageTitle,
  description: computed(() => {
    if (seasonWithProviders.value?.overview) {
      return seasonWithProviders.value.overview;
    }
    return t('media.seasonDescription', { seasonId });
  }),
});

onMounted(() => {
  // Save the previous route when mounting
  if (import.meta.client) {
    const referrer = document.referrer;
    const currentOrigin = window.location.origin;

    // Only save if the referrer is from the same origin (within the app)
    if (referrer && referrer.startsWith(currentOrigin)) {
      try {
        const referrerPath = new URL(referrer).pathname;
        // Don't save if we're coming from another season page (to avoid loops)
        if (!referrerPath.includes('/season/')) {
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
