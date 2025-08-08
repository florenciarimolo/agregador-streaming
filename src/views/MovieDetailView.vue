<template>
  <section
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
      <RatingBadge :rating="movieDetails.vote_average" />
      <img
        :src="`https://image.tmdb.org/t/p/w780` + movieDetails.poster_path"
        :alt="movieDetails.title"
        class="object-cover rounded w-80"
      />
    </div>

    <div
      class="z-10 flex flex-col content-start justify-between flex-1 gap-6 p-6 ml-8 rounded-lg"
    >
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
        <h2 class="font-semibold text-md">Plataformas</h2>
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

const backgroundImage = ref<string>('');

function setBackgroundImage() {
  if (movieDetails.value.backdrop_path) {
    backgroundImage.value = `https://image.tmdb.org/t/p/original${movieDetails.value.backdrop_path}`;
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
      setBackgroundImage();
    }
  },
  { immediate: true } // Fetch details immediately on component mount
);
</script>
<style lang=""></style>
