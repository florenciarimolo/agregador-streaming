<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getTrendingMovies, getTrendingTVShows } from "../api/tmdb";
import Carrousel from "@/components/Carrousel.vue";
import type { MediaTrending } from "@/types/Media";

let trendingMovies = ref<MediaTrending[]>([]);
let trendingTVShows = ref<MediaTrending[]>([]);

onMounted(async () => {
  // Fetch trending movies
  const trendingMoviesResponse = await getTrendingMovies();
  trendingMovies.value = trendingMoviesResponse.results;

  // Fetch TV trending shows
  const trendingShowsResponse = await getTrendingTVShows();
  trendingTVShows.value = trendingShowsResponse.results;
});
</script>

<template>
  <div class="flex flex-col gap-20 md:gap-40 p-9">
    <section class="flex-1">
      <h1 class="mb-4 text-2xl font-bold uppercase">Películas en tendencia</h1>
      <Carrousel :media-trending-list="trendingMovies" />
    </section>
    <section class="flex-1">
      <h1 class="mb-4 text-2xl font-bold uppercase">Series en tendencia</h1>
      <Carrousel :media-trending-list="trendingTVShows" />
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
</template>
