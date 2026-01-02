<template>
  <!-- Loading state -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
    <div class="text-xl dark:text-gray-300 text-gray-800">Cargando...</div>
  </div>

  <!-- Error state -->
  <div
    v-else-if="hasError"
    class="flex items-center justify-center min-h-screen"
  >
    <div class="text-xl text-red-500">Error al cargar la serie</div>
  </div>

  <!-- Content -->

  <MediaBannerDetail
    :media="tvShowWithProviders as unknown as Media"
    :media-type="MediaTypeEnum.tv"
    :in-production="tvShowWithProviders.in_production"
  />
  <section class="mt-6 mb-6">
    <h2 class="col-span-4 text-2xl font-semibold mb-6">Temporadas</h2>
    <div
      class="relative grid grid-cols-2 gap-4 md:gap-8 justify-items-stretch lg:grid-cols-3 xl:grid-cols-4"
    >
      <article
        v-for="season in tvShowWithProviders.seasons"
        :key="season.id"
        class="rounded-3xl relative flex flex-col text-sm overflow-hidden bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-300/50 dark:border-white/10 w-full cursor-pointer group hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors shadow-lg"
      >
        <nuxt-link
          :to="`/serie/${tvShowId}/temporada/${season.season_number}`"
          class="block"
        >
          <div class="aspect-[2/3] overflow-hidden relative">
            <img
              v-if="season.poster_path"
              :src="`https://image.tmdb.org/t/p/w780${season.poster_path}`"
              :alt="season.name"
              class="w-full h-full object-cover"
            />
            <div
              class="absolute bottom-0 left-0 flex flex-col items-center justify-center w-full h-full px-4 transition-all duration-300 rounded opacity-0 group-hover:opacity-100 backdrop-blur-md w-inherit dark:bg-black/80 bg-white/80"
            >
              <p class="dark:text-gray-300 text-gray-800 font-semibold"
                >Ver episodios</p
              >
            </div>
          </div>
        </nuxt-link>

        <div class="flex flex-col justify-around py-5 px-6 min-h-[120px]">
          <div class="flex items-center gap-3">
            <p
              class="text-lg font-semibold uppercase dark:text-gray-300 text-gray-800"
              >{{ season.name }}</p
            >
            <RatingBadge
              v-if="season.vote_average"
              :rating="season.vote_average"
            />
          </div>
          <div class="flex items-center gap-2 dark:text-gray-300 text-gray-800">
            <IconCalendar icon-class="w-4 h-4" />
            <span>{{ formatDateToSpanish(season.air_date) }}</span>
          </div>
          <div class="flex items-center gap-2 dark:text-gray-300 text-gray-800">
            <IconEpisodes icon-class="w-4 h-4" />
            <span>{{ season.episode_count || 0 }} episodios</span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useFetch, useSeoMeta, useHead } from 'nuxt/app';
import { computed, onMounted } from 'vue';

import { TVShow } from '@/types/TVShow';
import { formatDateToSpanish } from '@/utils/formatDate';
import { WatchProviderTypes } from '@/types/WatchProvider';
import MediaBannerDetail from '@/components/MediaBannerDetail.vue';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import type { Media } from '@/types/Media';
import IconCalendar from '@/components/icons/IconCalendar.vue';
import IconEpisodes from '@/components/icons/IconEpisodes.vue';
import RatingBadge from '@/components/RatingBadge.vue';

const route = useRoute();

const tvShowId = route.params.id;

const {
  data: tvShowDetails,
  pending: tvShowPending,
  error: tvShowError,
} = await useFetch<TVShow>(`/api/tmdb/tvshows/${tvShowId}`);

const {
  data: tvProviders,
  pending: tvProvidersPending,
  error: tvProvidersError,
} = await useFetch(`/api/tmdb/tvshows/${tvShowId}/providers`);

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

// Meta tags dinámicos
const pageTitle = computed(() => tvShow.value?.name || 'Serie');
const pageDescription = computed(() => {
  const overview =
    tvShow.value?.overview || 'Descubre esta serie y dónde verla en streaming.';
  return overview.length > 160 ? overview.substring(0, 160) + '...' : overview;
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

useHead({
  title: pageTitle,
  meta: [
    {
      name: 'description',
      content: pageDescription,
    },
  ],
});

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogImage: ogImage,
  ogType: 'video.tv_show',
  ogUrl: computed(() => {
    if (import.meta.client) {
      return `${window.location.origin}/serie/${tvShowId}`;
    }
    return '';
  }),
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterImage: ogImage,
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
          !referrerPath.startsWith('/pelicula/') &&
          !referrerPath.startsWith('/serie/')
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
