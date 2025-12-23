<script setup lang="ts">
import MediaCarousel from '@/components/MediaCarousel.vue';
import type { Media, MediaResponse } from '@/types/Media';
import { useFetch, useSeoMeta, useHead } from 'nuxt/app';
import { computed } from 'vue';

// Usar useFetch para SSR/SSG automático
// Using IMDB trending movies scraper instead of TMDB trending
// Fallback to TMDB if IMDB fails
const {
  data: trendingMoviesData,
  pending: moviesPending,
  error: imdbError,
} = await useFetch('/api/imdb/movies/trending', {
  transform: (response: MediaResponse) => response.results as Media[],
  // useFetch automatically caches responses based on the key
  // Server-side cache is handled by defineCachedEventHandler
  // Fallback to TMDB if IMDB fails
  onResponseError({ response }) {
    console.warn(
      'IMDB scraper failed, falling back to TMDB:',
      response.statusText
    );
  },
});

// Fallback to TMDB if IMDB fails
const shouldUseFallback = computed(
  () =>
    imdbError.value !== null ||
    (trendingMoviesData.value !== null &&
      trendingMoviesData.value !== undefined &&
      (trendingMoviesData.value?.length ?? 0) === 0)
);

const { data: fallbackMoviesData } = await useFetch(
  '/api/tmdb/movies/trending',
  {
    transform: (response: MediaResponse) => response.results as Media[],
    // Only fetch if IMDB failed or returned empty
    lazy: true,
    server: false,
    immediate: shouldUseFallback.value,
  }
);

// Using IMDB trending TV shows scraper instead of TMDB trending
// Fallback to TMDB if IMDB fails
const {
  data: trendingTVShowsData,
  pending: showsPending,
  error: imdbTVError,
} = await useFetch('/api/imdb/tvshows/trending', {
  transform: (response: MediaResponse) => response.results as Media[],
  // useFetch automatically caches responses based on the key
  // Server-side cache is handled by defineCachedEventHandler
  // Fallback to TMDB if IMDB fails
  onResponseError({ response }) {
    console.warn(
      'IMDB TV scraper failed, falling back to TMDB:',
      response.statusText
    );
  },
});

// Fallback to TMDB if IMDB fails
const shouldUseTVFallback = computed(
  () =>
    imdbTVError.value !== null ||
    (trendingTVShowsData.value !== null &&
      trendingTVShowsData.value !== undefined &&
      (trendingTVShowsData.value?.length ?? 0) === 0)
);

const { data: fallbackTVShowsData } = await useFetch(
  '/api/tmdb/tvshows/trending',
  {
    transform: (response: MediaResponse) => response.results as Media[],
    // Only fetch if IMDB failed or returned empty
    lazy: true,
    server: false,
    immediate: shouldUseTVFallback.value,
  }
);

// Computed para manejar los datos
// Use IMDB data if available, otherwise fallback to TMDB
const trendingMovies = computed(() => {
  const imdbData = trendingMoviesData.value;
  if (imdbData && imdbData.length > 0) {
    return imdbData;
  }
  return fallbackMoviesData.value || [];
});
// Use IMDB data if available, otherwise fallback to TMDB
const trendingTVShows = computed(() => {
  const imdbData = trendingTVShowsData.value;
  if (imdbData && imdbData.length > 0) {
    return imdbData;
  }
  return fallbackTVShowsData.value || [];
});

// Loading state
const isLoading = computed(() => moviesPending.value || showsPending.value);

// Meta tags
useHead({
  title: 'Inicio',
});

useSeoMeta({
  title: 'Inicio - Agregador Streaming',
  description:
    'Descubre las películas y series más populares del momento. Encuentra dónde ver tu contenido favorito en diferentes plataformas de streaming.',
  ogTitle: 'Agregador Streaming - Películas y Series en Tendencia',
  ogDescription:
    'Descubre las películas y series más populares del momento. Encuentra dónde ver tu contenido favorito en diferentes plataformas de streaming.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
});
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
        <h1 class="mb-4 text-2xl font-bold text-center uppercase md:text-left"
          >Series en tendencia</h1
        >
        <MediaCarousel :media-trending-list="trendingTVShows" />
      </section>
    </div>
  </div>
</template>
