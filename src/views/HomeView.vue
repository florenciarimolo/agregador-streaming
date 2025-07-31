<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { searchMovies, getExternalIds, getTrendingMovies } from '../api/tmdb'
import type { Movie } from '../types/MovieSearch'
import Carrousel from '../components/Carrousel.vue'

let movies = ref<Movie[]>([])

onMounted(async () => {
  try {
    // Fetch trending movies
    const response = await getTrendingMovies()
    movies.value = response.results

    // Optionally, fetch external IDs for each movie
    for (const movie of movies.value) {
      const externalIds = await getExternalIds(movie.id)
      movie.imdb_id = externalIds.imdb_id // Assuming the API returns an object with imdb_id
    }
  } catch (error) {
    console.error('Error fetching trending movies:', error)
  }
})

</script>

<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4 uppercase">Películas en tendencia</h1>
    <Carrousel/>
    <!--
    <div class="grid grid-cols-4 md:grid-cols-6 gap-4">
      <div v-for="movie in movies" :key="movie.id"
        class="w-[200px] rounded border border-[#646cff] relative flex flex-col items-center justify-center text-sm text-white/80 overflow-hidden shadow-sm max-w-80">
        <div class="">
          <a href="#">
            <img v-if="movie.poster_path" :src="`https://image.tmdb.org/t/p/w200${movie.poster_path}`"
              :alt="movie.title" class="" />
          </a>
        </div>

        <div class="flex flex-col justify-around backdrop-blur-sm w-full h-full bg-white/10 p-3">
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
