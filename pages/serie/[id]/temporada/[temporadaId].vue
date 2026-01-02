<template>
  <!-- Loading state -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
    <div class="text-xl dark:text-gray-300 text-gray-800">{{
      $t('media.loadingSeason')
    }}</div>
  </div>

  <!-- Error state -->
  <div
    v-else-if="hasError"
    class="flex items-center justify-center min-h-screen"
  >
    <div class="text-xl text-red-500">{{ $t('media.errorLoadingSeason') }}</div>
  </div>

  <!-- Content -->
  <div v-else>
    <!-- Header de temporada -->
    <section
      class="relative flex flex-col items-center justify-between gap-16 pb-8 dark:text-gray-300 text-gray-800 w-full min-w-full flex-shrink-0 min-h-[400px] lg:flex-row lg:items-stretch lg:p-16 lg:bg-gray-100/80 dark:lg:bg-gray-900/40 lg:backdrop-blur-xl lg:border lg:gap-7 rounded-3xl lg:border-gray-300/50 lg:dark:border-primary-800 lg:shadow-lg lg:shadow-primary/20 py-16"
    >
      <div
        class="absolute inset-0 z-0 hidden lg:block rounded-3xl"
        :style="sectionStyle"
      ></div>
      <div
        class="absolute z-0 hidden lg:block rounded-3xl bg-gray-100/90 dark:bg-gray-900/90"
        style="top: 0px; right: 0px; bottom: 0px; left: 0px"
      ></div>
      <div
        class="relative w-full max-w-80 lg:w-80 flex-shrink-0 lg:aspect-[2/3]"
        style="
          filter: drop-shadow(0 10px 15px -3px rgb(0 0 0 / 0.1))
            drop-shadow(0 4px 6px -4px rgb(0 0 0 / 0.1))
            drop-shadow(0 0 20px rgb(var(--color-primary) / 0.3));
        "
      >
        <div
          v-if="seasonWithProviders?.poster_path"
          class="relative overflow-hidden rounded-3xl w-full max-h-[400px] lg:h-full lg:max-h-[500px]"
        >
          <img
            :src="`https://image.tmdb.org/t/p/w780${seasonWithProviders.poster_path}`"
            :alt="seasonWithProviders.name"
            class="w-full h-full rounded-3xl object-contain lg:object-cover"
          />
        </div>
      </div>
      <div
        class="z-10 relative flex flex-col flex-1 gap-6 rounded-lg lg:p-6 lg:ml-8 w-full min-w-[300px] flex-shrink-0 min-h-[300px]"
      >
        <div class="text-left relative flex-row">
          <button
            @click="handleBack"
            class="inline-flex items-center gap-2 mb-4 text-sm font-medium dark:text-gray-300 text-gray-700 hover:dark:text-white hover:text-gray-900 transition-colors"
          >
            <IconArrowLeft icon-class="w-4 h-4" />
            {{ $t('media.backToSeries') }}
          </button>
          <div
            class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 w-full"
          >
            <!-- Title with Rating inline on desktop large -->
            <div
              class="flex items-center gap-3 flex-wrap xl:flex-nowrap xl:flex-1 xl:min-w-0"
            >
              <h1
                class="text-2xl font-bold dark:text-gray-300 text-gray-800 break-words xl:flex-1 xl:min-w-0"
                >{{ seasonWithProviders?.name }}</h1
              >
              <!-- Rating inline with title on desktop large, hidden on mobile/tablet (shown below) -->
              <div class="hidden xl:block xl:flex-shrink-0">
                <RatingBadge
                  v-if="seasonWithProviders?.vote_average"
                  :rating="seasonWithProviders.vote_average"
                />
              </div>
            </div>
            <!-- Rating row (mobile/tablet only, hidden on desktop large) -->
            <div class="flex items-center gap-3 flex-shrink-0 xl:hidden">
              <RatingBadge
                v-if="seasonWithProviders?.vote_average"
                :rating="seasonWithProviders.vote_average"
              />
            </div>
          </div>
        </div>

        <p
          :class="[
            'dark:text-gray-300 text-gray-800',
            { italic: !seasonWithProviders?.overview },
          ]"
          >{{
            seasonWithProviders?.overview || $t('media.noDescriptionAvailable')
          }}</p
        >
        <div
          class="mt-2 flex items-center gap-2 dark:text-gray-300 text-gray-800"
        >
          <IconCalendar icon-class="w-5 h-5" />
          <span>{{
            formatDateToSpanish(seasonWithProviders?.air_date || '')
          }}</span>
        </div>
        <div class="flex items-center gap-2 dark:text-gray-300 text-gray-800">
          <IconEpisodes icon-class="w-5 h-5" />
          <span>{{
            $t('media.episodesCount', {
              count: seasonWithProviders?.episodes?.length || 0,
            })
          }}</span>
        </div>

        <!-- Displaying watch providers -->
        <section class="flex flex-col gap-6">
          <section v-if="hasAvailableProviders" class="flex flex-col gap-8">
            <ProviderList
              v-if="seasonWithProviders?.providers?.flatrate?.length"
              :media-provider-prop-list="seasonWithProviders.providers.flatrate"
              :watch-type-prop="$t('media.watchIn')"
              :media-type="MediaTypeEnum.tv"
              :media-title="seasonWithProviders?.name || ''"
              :tmdb-id="parseInt(seriesId as string, 10)"
            />

            <ProviderList
              v-if="seasonWithProviders?.providers?.buy?.length"
              :media-provider-prop-list="seasonWithProviders.providers.buy"
              :watch-type-prop="$t('media.buyIn')"
              :media-type="MediaTypeEnum.tv"
              :media-title="seasonWithProviders?.name || ''"
              :tmdb-id="parseInt(seriesId as string, 10)"
            />

            <ProviderList
              v-if="seasonWithProviders?.providers?.rent?.length"
              :media-provider-prop-list="seasonWithProviders.providers.rent"
              :watch-type-prop="$t('media.rentIn')"
              :media-type="MediaTypeEnum.tv"
              :media-title="seasonWithProviders?.name || ''"
              :tmdb-id="parseInt(seriesId as string, 10)"
            />
          </section>
          <section v-else class="dark:text-gray-400 text-gray-600">
            <p class="italic">{{ $t('media.noPlatforms') }}</p>
          </section>
        </section>
      </div>
    </section>

    <!-- Episodios -->
    <section>
      <h2
        class="py-16 text-2xl font-semibold dark:text-gray-300 text-gray-800"
        >{{ $t('media.episodes') }}</h2
      >

      <div
        v-if="seasonWithProviders?.episodes?.length"
        class="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3"
      >
        <article
          v-for="(episode, index) in seasonWithProviders.episodes"
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
            <div
              class="absolute px-2 py-1 text-xs dark:text-gray-300 text-gray-800 rounded-lg top-2 left-4 bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-300/50 dark:border-white/10"
            >
              {{ $t('media.episodeNumber', { number: index + 1 }) }}
            </div>
          </div>
          <div class="p-4">
            <div class="flex items-center gap-3 mb-2">
              <h4
                class="font-semibold dark:text-gray-300 text-gray-800 line-clamp-1"
                >{{ episode.name }}</h4
              >
              <RatingBadge :rating="episode.vote_average" />
            </div>
            <p class="mb-2 text-sm dark:text-gray-300 text-gray-800">{{
              formatDateToSpanish(episode.air_date)
            }}</p>
            <p
              v-if="episode.runtime"
              class="mb-2 text-sm dark:text-gray-400 text-gray-600"
              >{{ episode.runtime }} min</p
            >
            <p
              :class="[
                'text-sm dark:text-gray-300 text-gray-700 line-clamp-3',
                { italic: !episode.overview },
              ]"
              >{{ episode.overview || $t('media.noDescriptionAvailable') }}</p
            >
          </div>
        </article>
      </div>

      <!-- Empty state -->
      <div v-else class="py-12 text-center dark:text-gray-400 text-gray-600">
        <div class="text-xl">{{ $t('media.noEpisodes') }}</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useFetch } from 'nuxt/app';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { Season } from '@/types/TVShow';
import { formatDateToSpanish } from '@/utils/formatDate';
import { WatchProviderTypes } from '@/types/WatchProvider';
import ProviderList from '@/components/ProviderList.vue';
import RatingBadge from '@/components/RatingBadge.vue';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import IconArrowLeft from '@/components/icons/IconArrowLeft.vue';
import IconCalendar from '@/components/icons/IconCalendar.vue';
import IconEpisodes from '@/components/icons/IconEpisodes.vue';

const route = useRoute();
const router = useRouter();

// Necesitamos obtener el seriesId desde la URL padre y el seasonId de los parámetros actuales
const seriesId = route.params.id;
const seasonId = route.params.temporadaId;

const {
  data: seasonData,
  pending: seasonPending,
  error: seasonError,
} = await useFetch<Season>(`/api/tmdb/tvshows/${seriesId}/seasons/${seasonId}`);

const isLoading = computed(
  () => seasonPending.value || seasonProvidersPending.value
);
const hasError = computed(
  () => seasonError.value || seasonProvidersError.value
);

const {
  data: seasonProviders,
  pending: seasonProvidersPending,
  error: seasonProvidersError,
} = await useFetch<WatchProviderTypes>(
  `/api/tmdb/tvshows/${seriesId}/seasons/${seasonId}/providers`
);

const seasonWithProviders = computed(() => {
  return {
    ...seasonData.value,
    providers: seasonProviders.value,
  };
});

const { t } = useI18n();

const pageTitle = computed(() => {
  if (seasonWithProviders.value?.name) {
    return `${seasonWithProviders.value.name} - UpNext`;
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

const hasAvailableProviders = computed(() => {
  return (
    seasonWithProviders.value.providers?.flatrate?.length ||
    seasonWithProviders.value.providers?.buy?.length ||
    seasonWithProviders.value.providers?.rent?.length
  );
});

const isMobile = ref(false);

// Detect mobile/tablet screen size (use mobile style for tablet too)
const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024; // lg breakpoint
};

// Handle resize
const handleResize = () => {
  checkMobile();
};

// Handle back navigation
const handleBack = () => {
  // Try to get the previous route from sessionStorage
  const previousRoute = sessionStorage.getItem('previousRoute');
  
  if (previousRoute) {
    // Clear the stored route
    sessionStorage.removeItem('previousRoute');
    // Navigate to the previous route
    router.push(previousRoute);
  } else {
    // Default: go back to the series page
    router.push(`/serie/${seriesId}`);
  }
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', handleResize);
  
  // Save the previous route when mounting
  if (import.meta.client) {
    const referrer = document.referrer;
    const currentOrigin = window.location.origin;
    
    // Only save if the referrer is from the same origin (within the app)
    if (referrer && referrer.startsWith(currentOrigin)) {
      try {
        const referrerPath = new URL(referrer).pathname;
        // Don't save if we're coming from another season page (to avoid loops)
        if (!referrerPath.includes('/temporada/')) {
          sessionStorage.setItem('previousRoute', referrerPath);
        }
      } catch (e) {
        // If URL parsing fails, ignore
      }
    }
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

const backgroundImage = computed(() => {
  if (seasonData.value?.poster_path) {
    return `https://image.tmdb.org/t/p/w780${seasonData.value.poster_path}`;
  }
  return '';
});

const sectionStyle = computed(() => ({
  backgroundImage: isMobile.value ? '' : `url(${backgroundImage.value})`,
  backgroundSize: isMobile.value ? 'contain' : 'cover',
  backgroundPosition: isMobile.value ? 'center' : 'center',
}));
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
