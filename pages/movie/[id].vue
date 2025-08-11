<template>
  <!-- Loading state -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
    <div class="text-white text-xl">Cargando...</div>
  </div>

  <!-- Error state -->
  <div
    v-else-if="hasError"
    class="flex items-center justify-center min-h-screen"
  >
    <div class="text-red-500 text-xl">Error al cargar la película</div>
  </div>

  <!-- Content -->
  <section
    v-else
    class="relative flex flex-row items-center justify-between p-8 text-white bg-gray-800 border gap-7 rounded-xl border-primary"
    :style="sectionStyle"
  >
    <div
      class="absolute inset-0 z-0 overflow-hidden rounded-xl bg-gradient-to-b from-black/70 to-black/90"
    ></div>
    <div
      class="relative overflow-hidden transition-transform duration-200 ease-out border cursor-pointer border-secondary rounded-xl max-w-80"

    >
      <RatingBadge :rating="movieWithProviders.vote_average" />
      <img
        :src="
          `https://image.tmdb.org/t/p/w780` + movieWithProviders.poster_path
        "
        :alt="movieWithProviders.title"
        class="object-cover rounded w-80"
      />
    </div>

    <div
      class="z-10 flex flex-col content-start justify-between flex-1 gap-6 p-6 ml-8 rounded-lg"
    >
      <h1 class="text-2xl font-bold">{{ movieWithProviders.title }}</h1>
      <p class="text-gray-300">{{ movieWithProviders.overview }}</p>
      <p class="mt-2"
        >Fecha de lanzamiento:
        {{ formatDateToSpanish(movieWithProviders.release_date) }}</p
      >
      <p
        >Géneros:
        {{
          movieWithProviders?.genres
            ?.map((genre: Genre) => genre.name)
            .join(', ') || 'No disponible'
        }}</p
      >
      <!-- Displaying watch providers with their logos-->
      <section class="flex flex-col gap-6">
        <h2 class="font-semibold text-md">Plataformas</h2>
        <section v-if="hasAvailableProviders" class="flex flex-col gap-8">
          <ProviderList
            :media-provider-prop-list="
              movieWithProviders.providers?.flatrate || []
            "
            watch-type-prop="Ver en:"
          />

          <ProviderList
            :media-provider-prop-list="movieWithProviders.providers?.buy || []"
            watch-type-prop="Compra:"
          />

          <ProviderList
            :media-provider-prop-list="movieWithProviders.providers?.rent || []"
            watch-type-prop="Alquiler:"
          />
        </section>
        <section v-else class="text-gray-400">
          <p>No disponible en ninguna plataforma</p>
        </section>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useFetch } from 'nuxt/app';
import { formatDateToSpanish } from '@/utils/formatDate';
import type { Movie } from '@/types/Movie';
import type { Genre } from '@/types/Genre';
import RatingBadge from '@/components/RatingBadge.vue';
import ProviderList from '@/components/ProviderList.vue';
import { WatchProviderTypes } from '@/types/WatchProvider';
import { calculateTilt, getDefaultTilt } from '@/utils/functions';

const route = useRoute();
const movieId = route.params.id as string;

// Fetch movie details
const {
  data: movieDetails,
  pending: moviePending,
  error: movieError,
} = await useFetch(`/api/tmdb/movies/${movieId}`);

// Fetch providers
const {
  data: providersData,
  pending: providersPending,
  error: providersError,
} = await useFetch(`/api/tmdb/movies/${movieId}/providers`);

// Computed para manejar los datos
const movie = computed<Movie>(() => movieDetails.value as Movie || {} as Movie);
const providers = computed<WatchProviderTypes>(() => providersData.value as WatchProviderTypes || {});

const movieWithProviders = computed<Movie>(() => {
  return {
    ...movie.value,
    providers: providers.value,
  };
});

let tilt = getDefaultTilt();

const resetTilt = () => {
  tilt = getDefaultTilt();
};

const backgroundImage = ref<string>('')

function setBackgroundImage() {
  if (movie.value.backdrop_path) {
    backgroundImage.value = `https://image.tmdb.org/t/p/original${movie.value.backdrop_path}`;
  } else {
    backgroundImage.value = '';
  }
}

const sectionStyle = computed(() => ({
  backgroundImage: `url(${backgroundImage.value})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}));

const transformStyle = computed(() => ({
  transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
}));

const hasAvailableProviders = computed(() => {
  return (
    movieWithProviders.value.providers?.flatrate?.length ||
    movieWithProviders.value.providers?.buy?.length ||
    movieWithProviders.value.providers?.rent?.length
  );
});

// Loading state
const isLoading = computed(() => moviePending.value || providersPending.value);

// Error state
const hasError = computed(() => movieError.value || providersError.value);

onMounted(() => {
  setBackgroundImage();
});

watch(
  () => route.params.id,
  async (newId) => {
    if (newId && newId !== movieId) {
      setBackgroundImage();
    }
  }
);
</script>
<style lang=""></style>
