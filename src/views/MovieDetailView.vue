<template>
  <section
    class="flex flex-row items-center justify-between gap-7 p-8 bg-gray-800 text-white rounded-xl border border-primary relative"
  >
    <div
      class="relative rounded-xl shadow-[4px_4px_20px_0px_rgba(255,_255,_255,_0.2)] overflow-hidden transition-transform duration-200 ease-out cursor-pointer max-w-80 bg-white"
      :style="transformStyle"
      @mousemove="handleMove"
      @mouseleave="resetTilt"
    >
      <RatingBadge :rating="movieDetails.vote_average" />
      <img
        :src="`https://image.tmdb.org/t/p/w500` + movieDetails.poster_path"
        :alt="movieDetails.title"
        class="rounded w-80 object-cover"
      />
    </div>

    <div class="flex flex-1 flex-col justify-between content-start gap-6 ml-8">
      <h1 class="text-2xl font-bold">{{ movieDetails.title }}</h1>
      <p class="text-gray-300">{{ movieDetails.overview }}</p>
      <p class="mt-2"
        >Fecha de lanzamiento:
        {{ formatDateToSpanish(movieDetails.release_date) }}</p
      >
      <p
        >Géneros:
        {{
          movieDetails?.genres.map((genre: Genre) => genre.name).join(', ')
        }}</p
      >
      <!-- Displaying watch providers with their logos-->
      <section class="flex flex-col gap-6">
        <h2 class="text-md font-semibold">Plataformas</h2>
        <section v-if="hasAvailableProviders" class="flex flex-col gap-8">
          <ProviderList
            :media-provider-prop-list="movieDetails.providers?.flatrate || []"
            watch-type-prop="Ver en:"
          />

          <ProviderList
            :media-provider-prop-list="movieDetails.providers?.buy || []"
            watch-type-prop="Compra:"
          />

          <ProviderList
            :media-provider-prop-list="movieDetails.providers?.rent || []"
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
import { ref, computed } from 'vue';
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import { getMovieDetails, getMovieProviders } from '@/api/tmdb/movie';
import { formatDateToSpanish } from '@/utils/formatDate';
import type { Movie, Genre } from '@/types/Movie';
import RatingBadge from '@/components/RatingBadge.vue';
import ProviderList from '@/components/ProviderList.vue';

const route = useRoute();
let movieId = route.params.id;

let movieDetails = ref<Movie>({} as Movie);

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

const transformStyle = computed(() => ({
  transform: `perspective(1000px) rotateX(${tilt.value.x}deg) rotateY(${tilt.value.y}deg)`,
}));

async function fetchMovieDetails(id: number) {
  try {
    const response = await getMovieDetails(id);
    movieDetails.value = response;
  } catch (error) {
    console.error('Error fetching movie details:', error);
  }
}

async function fetchMovieProviders(id: number) {
  try {
    const response = await getMovieProviders(id);
    // Assign the entire providers object to movieDetails.value.providers
    movieDetails.value.providers = response;
  } catch (error) {
    console.error('Error fetching movie providers:', error);
  }
}

const hasAvailableProviders = ref<boolean>(false);

function checkAvailableProviders() {
  if (
    movieDetails.value.providers?.flatrate?.length ||
    movieDetails.value.providers?.buy?.length ||
    movieDetails.value.providers?.rent?.length
  ) {
    hasAvailableProviders.value = true;
  } else {
    hasAvailableProviders.value = false;
  }
}

watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (newId !== oldId) {
      movieId = newId;
      await fetchMovieDetails(Number(movieId));
      await fetchMovieProviders(Number(movieId));
      checkAvailableProviders();
    }
  },
  { immediate: true } // Fetch details immediately on component mount
);
</script>
<style lang=""></style>
