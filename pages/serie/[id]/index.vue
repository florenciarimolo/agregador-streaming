<template>
  <!-- Loading state -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
    <div class="text-xl text-white">Cargando...</div>
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
        <div class="aspect-[2/3] overflow-hidden relative">
          <RatingBadge :rating="season.vote_average" />

          <img
            v-if="season.poster_path"
            :src="`https://image.tmdb.org/t/p/w780${season.poster_path}`"
            :alt="season.name"
            class="w-[300px] h-full object-cover"
          />
          <div
            class="absolute bottom-0 left-0 flex flex-col items-center justify-center w-full h-full px-4 transition-all duration-300 rounded opacity-0 group-hover:opacity-100 backdrop-blur-md w-inherit bg-black/20"
          >
            <RatingBadge :rating="season.vote_average" />

            <nuxt-link
              :to="`/serie/${tvShowId}/temporada/${season.season_number}`"
            >
              <button class="text-white bg-primary hover:bg-secondary">
                Ver episodios
              </button>
            </nuxt-link>
          </div>
        </div>

        <div
          class="flex flex-col justify-around py-5 px-6 bg-gray-800 min-h-[120px]"
        >
          <p class="text-lg font-semibold uppercase">{{ season.name }}</p>
          <p
            >Fecha de lanzamiento: {{ formatDateToSpanish(season.air_date) }}</p
          >
          <p> {{ season.episode_count || 0 }} episodios </p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useFetch } from 'nuxt/app';
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
} = await useFetch(`/api/tmdb/tvshows/${tvShowId}`);

const {
  data: tvProviders,
  pending: tvProvidersPending,
  error: tvProvidersError,
} = await useFetch(`/api/tmdb/tvshows/${tvShowId}/providers`);

const isLoading = computed(
  () => tvShowPending.value || tvProvidersPending.value
);
const hasError = computed(() => tvShowError.value || tvProvidersError.value);

const tvShow = computed<TVShow>(
  () => (tvShowDetails.value as TVShow) || ({} as TVShow)
);
const tvShowProviders = computed(
  () => (tvProviders.value as WatchProviderTypes) || ({} as WatchProviderTypes)
);

const tvShowWithProviders = computed<TVShow>(() => {
  return {
    ...tvShow.value,
    providers: tvShowProviders.value,
  };
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
