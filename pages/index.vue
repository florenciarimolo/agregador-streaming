<script setup lang="ts">
import MediaCarousel from '@/components/MediaCarousel.vue';
import type { MediaTrending } from '@/types/Media';
import { useFetch } from 'nuxt/app';
import { computed } from 'vue';

// Usar useFetch para SSR/SSG automático
const {
  data: trendingMoviesData,
  pending: moviesPending,
  error: moviesError,
} = await useFetch('/api/tmdb/movies/trending', {
  transform: (response: any) => response.results as MediaTrending[],
});

const {
  data: trendingTVShowsData,
  pending: showsPending,
  error: showsError,
} = await useFetch('/api/tmdb/tvshows/trending', {
  transform: (response: any) => response.results as MediaTrending[],
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
    <div class="flex flex-col gap-20 md:gap-40 p-9">
      <section class="flex-1">
        <h1 class="mb-4 text-2xl font-bold uppercase"
          >Películas en tendencia</h1
        >
        <MediaCarousel :media-trending-list="trendingMovies" />
      </section>
      <section class="flex-1">
        <h1 class="mb-4 text-2xl font-bold uppercase">Series en tendencia</h1>
        <MediaCarousel :media-trending-list="trendingTVShows" />
      </section>
      <!--
    <div class="grid grid-cols-4 gap-4 md:grid-cols-6">
      <div v-for="movie in movies" :key="movie.id"
        class="w-[200px] rounded border border-[#646cff] relative flex flex-col items-center justify-center text-sm text-white/80 overflow-hidden shadow-sm max-w-80">
        <div class="">
          <a href="#">
            <img v-if="movie.poster_path" :src="`https://image.tmdb.org/t/p/w200${movie.poster_path}`"
              :alt="movie.title" class="" />
          </a>
        </div>

        <div class="flex flex-col justify-around w-full h-full p-3 backdrop-blur-sm bg-white/10">
          <div class="flex items-center justify-between w-full pb-3">
            <p>{{ movie.title }}</p>
            <div class="bg-black/50 rounded px-2 py-1.5">{{ movie.vote_average }}</div>
          </div>
          <p class="text-xs text-gray-300">{{ movie.release_date }}</p>

        </div>

      </div>
    </div> -->
    </div>
  </div>
</template>
