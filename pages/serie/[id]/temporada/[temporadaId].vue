<template>
  <!-- Loading state -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
    <div class="text-xl dark:text-gray-300 text-gray-800"
      >Cargando temporada...</div
    >
  </div>

  <!-- Error state -->
  <div
    v-else-if="hasError"
    class="flex items-center justify-center min-h-screen"
  >
    <div class="text-xl text-red-500">Error al cargar la temporada</div>
  </div>

  <!-- Content -->
  <div v-else>
    <!-- Header de temporada -->
    <section
      class="relative flex flex-col items-center justify-between gap-16 pb-8 dark:text-gray-300 text-gray-800 w-full min-w-full flex-shrink-0 min-h-[400px] md:flex-row md:items-stretch md:p-16 md:bg-gray-100/80 dark:md:bg-gray-900/40 md:backdrop-blur-xl md:border md:gap-7 rounded-3xl md:border-gray-300/50 md:dark:border-primary-800 md:shadow-lg md:shadow-primary/20 py-16"
    >
      <div
        class="absolute inset-0 z-0 hidden md:block rounded-3xl"
        :style="sectionStyle"
      ></div>
      <div
        class="absolute z-0 hidden md:block rounded-3xl bg-gray-100/90 dark:bg-gray-900/90"
        style="top: 0px; right: 0px; bottom: 0px; left: 0px"
      ></div>
      <div
        class="relative overflow-hidden rounded-lg shadow-lg shadow-primary/30 w-full max-w-80 md:w-80 flex-shrink-0 aspect-[2/3]"
      >
        <RatingBadge :rating="seasonWithProviders?.vote_average || 0" />
        <img
          v-if="seasonWithProviders?.poster_path"
          :src="`https://image.tmdb.org/t/p/w780${seasonWithProviders.poster_path}`"
          :alt="seasonWithProviders.name"
          class="object-cover w-full h-full"
        />
      </div>
      <div
        class="z-10 relative flex flex-col flex-1 gap-6 rounded-lg md:p-6 md:ml-8 w-full min-w-[300px] flex-shrink-0 min-h-[300px]"
      >
        <div class="text-left relative flex-row">
          <nuxt-link
            :to="`/serie/${seriesId}`"
            class="inline-flex items-center gap-2 mb-4 text-sm font-medium dark:text-gray-300 text-gray-700 hover:dark:text-white hover:text-gray-900 transition-colors"
          >
            <IconArrowLeft icon-class="w-4 h-4" />
            Volver
          </nuxt-link>
          <div>
            <h1 class="text-2xl font-bold dark:text-gray-300 text-gray-800">{{
              seasonWithProviders?.name
            }}</h1>
          </div>
        </div>

        <p
          :class="[
            'dark:text-gray-300 text-gray-800',
            { italic: !seasonWithProviders?.overview },
          ]"
          >{{
            seasonWithProviders?.overview || 'Sin descripción disponible'
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
          <span>{{ seasonWithProviders?.episodes?.length }} episodios</span>
        </div>

        <!-- Displaying watch providers -->
        <section class="flex flex-col gap-6">
          <section v-if="hasAvailableProviders" class="flex flex-col gap-8">
            <ProviderList
              v-if="seasonWithProviders?.providers?.flatrate?.length"
              :media-provider-prop-list="seasonWithProviders.providers.flatrate"
              watch-type-prop="Ver en:"
              :media-type="MediaTypeEnum.tv"
            />

            <ProviderList
              v-if="seasonWithProviders?.providers?.buy?.length"
              :media-provider-prop-list="seasonWithProviders.providers.buy"
              watch-type-prop="Compra:"
              :media-type="MediaTypeEnum.tv"
            />

            <ProviderList
              v-if="seasonWithProviders?.providers?.rent?.length"
              :media-provider-prop-list="seasonWithProviders.providers.rent"
              watch-type-prop="Alquiler:"
              :media-type="MediaTypeEnum.tv"
            />
          </section>
          <section v-else class="dark:text-gray-400 text-gray-600">
            <p class="italic">No disponible en ninguna plataforma</p>
          </section>
        </section>
      </div>
    </section>

    <!-- Episodios -->
    <section>
      <h2 class="py-16 text-2xl font-semibold dark:text-gray-300 text-gray-800"
        >Episodios</h2
      >

      <div
        v-if="seasonWithProviders?.episodes?.length"
        class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
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
              class="object-cover w-full h-full"
            />
            <div
              v-else
              class="flex items-center justify-center h-full dark:text-gray-400 text-gray-500"
            >
              <span class="text-4xl">📺</span>
            </div>
            <div
              class="absolute px-2 py-1 text-sm dark:text-gray-300 text-gray-800 rounded-lg top-2 left-4 dark:bg-gray-800/70 bg-white/70"
            >
              Episodio {{ index + 1 }}
            </div>
            <RatingBadge :rating="episode.vote_average" />
          </div>
          <div class="p-4">
            <h4
              class="mb-2 font-semibold dark:text-gray-300 text-gray-800 line-clamp-1"
              >{{ episode.name }}</h4
            >
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
              >{{ episode.overview || 'Sin descripción disponible' }}</p
            >
          </div>
        </article>
      </div>

      <!-- Empty state -->
      <div v-else class="py-12 text-center dark:text-gray-400 text-gray-600">
        <div class="text-xl">No hay episodios disponibles</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
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

const pageTitle = computed(() => {
  if (seasonWithProviders.value?.name) {
    return `${seasonWithProviders.value.name} - UpNext`;
  }
  return 'Temporada - UpNext';
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
    return `Temporada ${seasonId} de la serie`;
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

// Detect mobile screen size
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

// Handle resize
const handleResize = () => {
  checkMobile();
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', handleResize);
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
