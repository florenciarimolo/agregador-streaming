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
  <section>
    <h2 class="col-span-4 text-2xl font-semibold my-11">Temporadas</h2>
    <div
      class="relative grid grid-cols-1 gap-y-8 sm:gap-8 justify-items-center lg:justify-items-stretch md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <article
        v-for="season in tvShowWithProviders.seasons"
        :key="season.id"
        class="rounded-xl relative flex flex-col text-sm overflow-hidden shadow-primary/20 shadow-sm w-[300px] cursor-pointer hover:shadow-xl group hover:scale-105 transition-all duration-300"
      >
        <nuxt-link
          :to="`/serie/${tvShowId}/temporada/${season.season_number}`"
          class="block"
        >
          <div class="aspect-[2/3] overflow-hidden relative">
            <RatingBadge :rating="season.vote_average" />

            <img
              v-if="season.poster_path"
              :src="`https://image.tmdb.org/t/p/w780${season.poster_path}`"
              :alt="season.name"
              class="w-[300px] h-full object-cover"
            />
            <div
              class="absolute bottom-0 left-0 flex flex-col items-center justify-center w-full h-full px-4 transition-all duration-300 rounded opacity-0 group-hover:opacity-100 backdrop-blur-md w-inherit dark:bg-black/80 bg-white/80"
            >
              <RatingBadge :rating="season.vote_average" />
              <p class="mt-4 dark:text-gray-300 text-gray-800 font-semibold"
                >Ver episodios</p
              >
            </div>
          </div>
        </nuxt-link>

        <div
          class="flex flex-col justify-around py-5 px-6 dark:bg-gray-800 bg-gray-100 min-h-[120px]"
        >
          <p
            class="text-lg font-semibold uppercase dark:text-gray-300 text-gray-800"
            >{{ season.name }}</p
          >
          <p class="dark:text-gray-300 text-gray-800"
            >Fecha de lanzamiento: {{ formatDateToSpanish(season.air_date) }}</p
          >
          <p class="dark:text-gray-300 text-gray-800">
            {{ season.episode_count || 0 }} episodios
          </p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useFetch, useSeoMeta, useHead } from 'nuxt/app';
import { computed } from 'vue';

import { TVShow } from '@/types/TVShow';
import { formatDateToSpanish } from '@/utils/formatDate';
import { WatchProviderTypes } from '@/types/WatchProvider';
import MediaBannerDetail from '@/components/MediaBannerDetail.vue';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import type { Media } from '@/types/Media';

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
