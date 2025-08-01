<template>
    <section class="flex items-center justify-between gap-4">
        <!-- Flecha izquierda -->
        <button @click="prevPage" :disabled="currentPage === 0"
            class="z-10 bg-[#2731f5] shadow-md rounded-full p-2 disabled:opacity-30">
            ‹
        </button>

        <div class="w-full no-scrollbar">
            <div class="flex gap-4">
                <article
                    v-for="movie in pagedMovies"
                    :key="movie.id"
                    class="w-56 flex-shrink-0 h-[20rem] relative group hover:scale-105 transition-all duration-300"
                >
                    <img :src="`https://image.tmdb.org/t/p/w500${movie.poster_path}`" alt="card"
                        class="w-full h-full object-cover rounded border border-[#2731f5]" />
                    <div
                        class="w-full flex flex-col rounded border border-[#2731f5] items-center justify-center px-4 opacity-0 group-hover:opacity-100 transition-all duration-300 absolute bottom-0 backdrop-blur-md left-0 w-inherit h-full bg-black/20">
                        <p class="text-lg font-semibold text-center text-white">
                            {{ movie.title }}
                        </p>
                        <p class="text-lg font-semibold text-center text-white">
                            {{ movie.release_date }}
                        </p>
                    </div>
                </article>
            </div>
        </div>
        <!-- Flecha derecha -->
        <button @click="nextPage" :disabled="endReached"
            class="z-10 bg-[#2731f5] shadow-md rounded-full p-2 disabled:opacity-30">
            ›
        </button>
    </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onMounted } from 'vue'
import type { Movie } from '../types/MovieSearch'
import { getExternalIds, getTrendingMovies } from '../api/tmdb'

const itemsPerPage = 5
const currentPage = ref(0)



let movies = ref<Movie[]>([])


const totalPages = computed(() => Math.ceil(movies.value.length / itemsPerPage))

const carouselStyle = computed(() => {
    // 224px = w-56 (width de cada card) + gap (aprox 16px)
    const cardWidth = 224
    const gap = 16
    const offset = currentPage.value * itemsPerPage * (cardWidth + gap)
    return {
        transform: `translateX(-${offset}px)`
    }
})


const nextPage = () => {
    if (currentPage.value < totalPages.value - 1) {
        currentPage.value++
    }
}

const prevPage = () => {
    if (currentPage.value > 0) {
        currentPage.value--
    }
}

const endReached = computed(() => currentPage.value >= totalPages.value - 1)

const pagedMovies = computed(() =>
    movies.value.slice(currentPage.value * itemsPerPage, (currentPage.value + 1) * itemsPerPage)
)

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

<style scoped>
button:disabled {
    cursor: not-allowed;
}

/* Ocultar scroll en WebKit (Chrome, Safari) */
.no-scrollbar::-webkit-scrollbar {
    display: none;
}

/* Firefox */
.no-scrollbar {
    scrollbar-width: none;
}
</style>
