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
      class="relative overflow-hidden transition-transform duration-200 ease-out bg-white bg-center bg-no-repeat bg-cover border cursor-pointer z-90 border-secondary rounded-xl max-w-80"
      :style="transformStyle"
      @mousemove="handleMove"
      @mouseleave="resetTilt"
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
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useFetch } from 'nuxt/app';
import { formatDateToSpanish } from '@/utils/formatDate';
import type { Movie, Genre } from '@/types/Movie';
import RatingBadge from '@/components/RatingBadge.vue';
import ProviderList from '@/components/ProviderList.vue';

const route = useRoute();
const movieId = route.params.id as string;

// Usar useFetch para obtener los detalles de la película
const {
  data: movieDetails,
  pending: moviePending,
  error: movieError,
} = await useFetch(`/api/tmdb/movies/${movieId}`, {
  transform: (response: any) => response as Movie,
});

// Usar useFetch para obtener los proveedores
const {
  data: providersData,
  pending: providersPending,
  error: providersError,
} = await useFetch(`/api/tmdb/movies/${movieId}/providers`, {
  transform: (response: any) => response,
});

// Computed para manejar los datos
const movie = computed(() => movieDetails.value || ({} as Movie));
const providers = computed(() => providersData.value || {});

// Combinar los datos de la película con los proveedores
const movieWithProviders = computed(() => ({
  ...movie.value,
  providers: providers.value,
}));

// Adjust the threshold value to control the tilt effect
const threshold = 12;

interface Tilt {
  x: number;
  y: number;
}

const tilt = ref<Tilt>({ x: 0, y: 0 });

const handleMove = (e: MouseEvent) => {
  const target = e.currentTarget as HTMLElement;
  const { left, top, width, height } = target.getBoundingClientRect();
  const x = (e.clientX - left) / width - 0.5;
  const y = (e.clientY - top) / height - 0.5;
  tilt.value = {
    x: y * -threshold,
    y: x * threshold,
  };
};

const resetTilt = () => {
  tilt.value = { x: 0, y: 0 };
};

const backgroundImage = ref<string>('');

function setBackgroundImage() {
  if (movieWithProviders.value.backdrop_path) {
    backgroundImage.value = `https://image.tmdb.org/t/p/original${movieWithProviders.value.backdrop_path}`;
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
  transform: `perspective(1000px) rotateX(${tilt.value.x}deg) rotateY(${tilt.value.y}deg)`,
}));

const hasAvailableProviders = computed(() => {
  return !!(
    movieWithProviders.value.providers?.flatrate?.length ||
    movieWithProviders.value.providers?.buy?.length ||
    movieWithProviders.value.providers?.rent?.length
  );
});

// Loading state
const isLoading = computed(() => moviePending.value || providersPending.value);

// Error state
const hasError = computed(() => movieError.value || providersError.value);

// Watch for route changes to refetch data
watch(
  () => route.params.id,
  async (newId) => {
    if (newId && newId !== movieId) {
      // Nuxt automáticamente refetch cuando cambia la URL
      setBackgroundImage();
    }
  }
);

// Set background image when data is available
watch(
  movieWithProviders,
  () => {
    setBackgroundImage();
  },
  { immediate: true }
);
</script>
<style lang=""></style>
