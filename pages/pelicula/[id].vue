<template>
  <!-- Loading state -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
    <div class="text-xl text-white">Cargando...</div>
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
import { useFetch } from 'nuxt/app';
import type { Movie } from '@/types/Movie';
import { WatchProviderTypes } from '@/types/WatchProvider';
import MediaBannerDetail from '@/components/MediaBannerDetail.vue';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import type { Media } from '@/types/Media';

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
const movie = computed<Movie>(
  () => (movieDetails.value as Movie) || ({} as Movie)
);
const providers = computed<WatchProviderTypes>(
  () => (providersData.value as WatchProviderTypes) || {}
);

const movieWithProviders = computed<Movie>(() => {
  return {
    ...movie.value,
    providers: providers.value,
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
const isLoading = computed(() => moviePending.value || providersPending.value);

// Error state
const hasError = computed(() => movieError.value || providersError.value);
</script>
<style scoped></style>
