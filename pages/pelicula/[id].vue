<template>
  <!-- Loading state -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
    <div class="text-xl dark:text-white text-gray-900">Cargando...</div>
  </div>

  <!-- Error state -->
  <div
    v-else-if="hasError"
    class="flex items-center justify-center min-h-screen"
  >
    <div class="text-xl text-red-500">Error al cargar la película</div>
  </div>

  <!-- Content -->

  <MediaBannerDetail
    :media="movieWithProviders as unknown as Media"
    :media-type="MediaTypeEnum.movie"
    :in-production="false"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useFetch, useSeoMeta, useHead } from 'nuxt/app';
import type { Movie } from '@/types/Movie';
import { WatchProviderTypes } from '@/types/WatchProvider';
import MediaBannerDetail from '@/components/MediaBannerDetail.vue';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import type { Media } from '@/types/Media';
import type { AlternativeTitlesResponse } from '@/types/AlternativeTitle';

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

// Fetch alternative titles
const {
  data: alternativeTitlesData,
  pending: alternativeTitlesPending,
  error: alternativeTitlesError,
} = await useFetch(`/api/tmdb/movies/${movieId}/alternative-titles`);

// Computed para manejar los datos
const movie = computed<Movie>(
  () => (movieDetails.value as Movie) || ({} as Movie)
);
const providers = computed<WatchProviderTypes>(
  () => (providersData.value as WatchProviderTypes) || {}
);

const alternativeTitles = computed<AlternativeTitlesResponse>(
  () =>
    (alternativeTitlesData.value as AlternativeTitlesResponse) || {
      id: 0,
      titles: [],
    }
);

const movieWithProviders = computed<Movie>(() => {
  return {
    ...movie.value,
    providers: providers.value,
    alternative_titles: alternativeTitles.value,
  };
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

// Loading state
const isLoading = computed(
  () =>
    moviePending.value ||
    providersPending.value ||
    alternativeTitlesPending.value
);

// Error state
const hasError = computed(
  () => movieError.value || providersError.value || alternativeTitlesError.value
);

// Meta tags dinámicos
const pageTitle = computed(() => movie.value?.title || 'Película');
const pageDescription = computed(() => {
  const overview =
    movie.value?.overview ||
    'Descubre esta película y dónde verla en streaming.';
  return overview.length > 160 ? overview.substring(0, 160) + '...' : overview;
});
const ogImage = computed(() => {
  if (movie.value?.backdrop_path) {
    return `https://image.tmdb.org/t/p/w1280${movie.value.backdrop_path}`;
  }
  if (movie.value?.poster_path) {
    return `https://image.tmdb.org/t/p/w780${movie.value.poster_path}`;
  }
  return '';
});

useHead({
  title: pageTitle,
  meta: [
    {
      name: 'description',
      content: pageDescription,
    },
  ],
});

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogImage: ogImage,
  ogType: 'video.movie',
  ogUrl: computed(() => {
    if (import.meta.client) {
      return `${window.location.origin}/pelicula/${movieId}`;
    }
    return '';
  }),
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterImage: ogImage,
});
</script>
<style scoped></style>
