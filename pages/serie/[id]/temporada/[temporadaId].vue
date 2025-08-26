<template>
  <!-- Loading state -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
    <div class="text-white text-xl">Cargando temporada...</div>
  </div>

  <!-- Error state -->
  <div
    v-else-if="hasError"
    class="flex items-center justify-center min-h-screen"
  >
    <div class="text-red-500 text-xl">Error al cargar la temporada</div>
  </div>

  <!-- Content -->
  <div v-else>
    <!-- Header de temporada -->
    <section
      class="relative flex flex-row items-center justify-between p-8 text-white bg-gray-800 border gap-7 rounded-xl border-primary mb-8"
      :style="sectionStyle"
    >
      <div
        class="absolute inset-0 z-0 overflow-hidden rounded-xl bg-gradient-to-b from-black/70 to-black/90"
      ></div>

      <article
        class="relative overflow-hidden border cursor-pointer border-primary/50 rounded-xl max-w-80"
      >
        <RatingBadge :rating="seasonWithProviders?.vote_average" />
        <img
          v-if="seasonWithProviders?.poster_path"
          :src="`https://image.tmdb.org/t/p/w780${seasonWithProviders.poster_path}`"
          :alt="seasonWithProviders.name"
          class="object-cover rounded w-80"
        />
      </article>

      <article
        class="z-10 flex flex-col content-start justify-between flex-1 gap-6 p-6 ml-8 rounded-lg"
      >
        <div class="flex items-center gap-4">
          <button
            class="text-white hover:text-gray-300 transition-all duration-300 text-xl"
            @click="goBack"
          >
            ← Volver a la serie
          </button>
        </div>

        <h1 class="text-3xl font-bold">{{ seasonWithProviders?.name }}</h1>
        <p class="text-gray-300">{{
          seasonWithProviders?.overview || 'Sin descripción disponible'
        }}</p>

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
            />

            <ProviderList
              v-if="seasonWithProviders?.providers?.buy?.length"
              :media-provider-prop-list="seasonWithProviders.providers.buy"
              watch-type-prop="Compra:"
            />

            <ProviderList
              v-if="seasonWithProviders?.providers?.rent?.length"
              :media-provider-prop-list="seasonWithProviders.providers.rent"
              watch-type-prop="Alquiler:"
            />
          </article>
        </article>
        <article v-else class="text-gray-400">
          <p>No disponible en ninguna plataforma</p>
        </article>
      </article>
    </section>

    <!-- Episodios -->
    <section>
      <h2 class="text-2xl font-semibold text-white mb-8">Episodios</h2>

      <div
        v-if="seasonWithProviders?.episodes?.length"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <article
          v-for="(episode, index) in seasonWithProviders.episodes"
          :key="episode.id"
          class="bg-gray-800 rounded-md overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <div class="relative aspect-video bg-gray-700">
            <img
              v-if="episode.still_path"
              :src="`https://image.tmdb.org/t/p/w500${episode.still_path}`"
              :alt="episode.name"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="flex items-center justify-center h-full text-gray-400"
            >
              <span class="text-4xl">📺</span>
            </div>
            <div
              class="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm"
            >
              Episodio {{ index + 1 }}
            </div>
            <RatingBadge :rating="episode.vote_average" />
          </div>
          <div class="p-4">
            <h4 class="text-white font-semibold mb-2 line-clamp-1">{{
              episode.name
            }}</h4>
            <p class="text-gray-400 text-sm mb-2">{{
              formatDateToSpanish(episode.air_date)
            }}</p>
            <p v-if="episode.runtime" class="text-gray-400 text-sm mb-2"
              >{{ episode.runtime }} min</p
            >
            <p class="text-gray-300 text-sm line-clamp-3">{{
              episode.overview || 'Sin descripción disponible'
            }}</p>
          </div>
        </article>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center text-gray-400 py-12">
        <div class="text-xl">No hay episodios disponibles</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useFetch } from 'nuxt/app';
import { computed, onMounted, ref, watch } from 'vue';

import { Season } from '@/types/TVShow';
import { formatDateToSpanish } from '@/utils/formatDate';
import { WatchProviderTypes } from '@/types/WatchProvider';
import ProviderList from '@/components/ProviderList.vue';
import RatingBadge from '@/components/RatingBadge.vue';

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

const isLoading = computed(() => seasonPending.value || seasonProvidersPending.value);
const hasError = computed(() => seasonError.value || seasonProvidersError.value);


const {
  data: seasonProviders,
  pending: seasonProvidersPending,
  error: seasonProvidersError,
} = await useFetch<WatchProviderTypes>(`/api/tmdb/tvshows/${seriesId}/seasons/${seasonId}/providers`);

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

const goBack = () => {
  router.push(`/serie/${seriesId}`);
};

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
