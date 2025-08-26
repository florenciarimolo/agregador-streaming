<script setup lang="ts">
import MediaCarousel from '@/components/MediaCarousel.vue';
import type { Media, MediaResponse } from '@/types/Media';
import { useFetch } from 'nuxt/app';
import { computed } from 'vue';

// Usar useFetch para SSR/SSG automático
const {
  data: trendingMoviesData,
  pending: moviesPending,
  error: moviesError,
} = await useFetch('/api/tmdb/movies/trending', {
  transform: (response: MediaResponse) =>
    response.results as Media[],
});

const {
  data: trendingTVShowsData,
  pending: showsPending,
  error: showsError,
} = await useFetch('/api/tmdb/tvshows/trending', {
  transform: (response: MediaResponse) =>
    response.results as Media[],
});

// Computed para manejar los datos
const trendingMovies = computed(() => trendingMoviesData.value || []);
const trendingTVShows = computed(() => trendingTVShowsData.value || []);

// Loading state
const isLoading = computed(() => moviesPending.value || showsPending.value);
</script>

<template>
  <div v-if="isLoading">Cargando...</div>
  <div v-else>
    <div class="flex flex-col gap-10 md:gap-40 lg:p-9">
      <section class="flex-1">
        <h1 class="mb-4 text-2xl font-bold text-center uppercase md:text-left"
          >Películas en tendencia</h1
        >
        <MediaCarousel :media-trending-list="trendingMovies" />
      </section>
      <section class="flex-1">
        <h1 class="mb-4 text-2xl font-bold text-center uppercase md:text-left">Series en tendencia</h1>
        <MediaCarousel :media-trending-list="trendingTVShows" />
      </section>
    </div>
  </div>
</template>
