<template>
  <!-- Loading state -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
    <div class="text-xl dark:text-white text-gray-900"
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
      class="relative flex flex-row items-center justify-between p-8 my-8 dark:text-white text-gray-900 dark:bg-gray-800 bg-gray-100 border gap-7 rounded-xl border-primary/30 shadow-lg shadow-primary/20"
      :style="sectionStyle"
    >
      <div
        class="absolute inset-0 z-0 overflow-hidden rounded-xl bg-gradient-to-b from-black/70 to-black/90"
      ></div>

      <article
        class="relative overflow-hidden shadow-xl shadow-primary/20 rounded-xl max-w-80 hidden md:block"
      >
        <RatingBadge :rating="seasonWithProviders?.vote_average || 0" />
        <img
          v-if="seasonWithProviders?.poster_path"
          :src="`https://image.tmdb.org/t/p/w780${seasonWithProviders.poster_path}`"
          :alt="seasonWithProviders.name"
          class="object-cover rounded w-80"
        />
      </article>

      <article
        class="z-10 flex flex-col content-start justify-between flex-1 gap-6 p-6 md:ml-8 rounded-lg relative"
      >
        <!-- Rating badge for mobile (top right) -->
        <div class="absolute top-2 right-2 md:hidden z-20">
          <RatingBadge :rating="seasonWithProviders?.vote_average || 0" />
        </div>
        <!-- Back link aligned with rating badge on mobile -->
        <nuxt-link
          :to="`/serie/${seriesId}`"
          class="absolute top-4 left-2 md:relative md:top-0 md:left-0 text-xl dark:text-white text-gray-900 transition-all duration-300 dark:hover:text-gray-300 hover:text-gray-600 no-underline md:underline"
        >
          ← Volver a la serie
        </nuxt-link>

        <h1 class="text-3xl font-bold mt-10 md:mt-0">{{
          seasonWithProviders?.name
        }}</h1>
        <p
          :class="[
            'dark:text-gray-300 text-gray-700',
            { italic: !seasonWithProviders?.overview },
          ]"
          >{{
            seasonWithProviders?.overview || 'Sin descripción disponible'
          }}</p
        >

        <div class="flex items-center gap-6 text-sm">
          <p
            >Fecha de lanzamiento:
            {{ formatDateToSpanish(seasonWithProviders?.air_date || '') }}</p
          >
          <p>{{ seasonWithProviders?.episodes?.length }} episodios</p>
        </div>

        <!-- Displaying watch providers -->
        <article v-if="hasAvailableProviders" class="flex flex-col gap-6">
          <h2 class="font-semibold text-md">Plataformas</h2>
          <article class="flex flex-col gap-8">
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
          </article>
        </article>
        <article v-else class="dark:text-gray-400 text-gray-600">
          <p class="italic">No disponible en ninguna plataforma</p>
        </article>
      </article>
    </section>

    <!-- Episodios -->
    <section>
      <h2 class="mb-8 text-2xl font-semibold dark:text-white text-gray-900"
        >Episodios</h2
      >

      <div
        v-if="seasonWithProviders?.episodes?.length"
        class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        <article
          v-for="(episode, index) in seasonWithProviders.episodes"
          :key="episode.id"
          class="overflow-hidden transition-shadow duration-300 dark:bg-gray-800 bg-gray-100 rounded-md shadow-lg hover:shadow-xl"
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
              class="absolute px-2 py-1 text-sm dark:text-white text-gray-900 rounded top-2 left-2 dark:bg-black/70 bg-white/70"
            >
              Episodio {{ index + 1 }}
            </div>
            <RatingBadge :rating="episode.vote_average" />
          </div>
          <div class="p-4">
            <h4
              class="mb-2 font-semibold dark:text-white text-gray-900 line-clamp-1"
              >{{ episode.name }}</h4
            >
            <p class="mb-2 text-sm dark:text-gray-400 text-gray-600">{{
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
import { computed, onMounted, ref, watch } from 'vue';

import { Season } from '@/types/TVShow';
import { formatDateToSpanish } from '@/utils/formatDate';
import { WatchProviderTypes } from '@/types/WatchProvider';
import ProviderList from '@/components/ProviderList.vue';
import RatingBadge from '@/components/RatingBadge.vue';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';

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

const hasAvailableProviders = computed(() => {
  return (
    seasonWithProviders.value.providers?.flatrate?.length ||
    seasonWithProviders.value.providers?.buy?.length ||
    seasonWithProviders.value.providers?.rent?.length
  );
});

const backgroundImage = ref<string>('');

function setBackgroundImage() {
  if (seasonData.value?.poster_path) {
    backgroundImage.value = `https://image.tmdb.org/t/p/original${seasonData.value.poster_path}`;
  } else {
    backgroundImage.value = '';
  }
}

const sectionStyle = computed(() => ({
  backgroundImage: `url(${backgroundImage.value})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}));

onMounted(() => {
  setBackgroundImage();
});

watch(
  () => route.params.temporadaId,
  async (newId) => {
    if (newId && newId !== seasonId) {
      setBackgroundImage();
    }
  }
);
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
