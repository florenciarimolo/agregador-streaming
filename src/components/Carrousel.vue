<template>
    <section class="flex items-center justify-between gap-4 py-9">
        <!-- Flecha izquierda -->
        <button @click="prevPage" :disabled="currentPage === 0"
            class="z-10 bg-[#2731f5] shadow-md rounded-full p-2 disabled:opacity-30">
            ‹
        </button>

        <div class="w-full no-scrollbar">
            <div class="flex gap-4">
                <article v-for="mediaObject in pagedMedia" :key="mediaObject.id"
                    class="w-56 flex-shrink-0 h-[20rem] relative group hover:scale-105 transition-all duration-300">
                    <RatingBadge :rating="mediaObject.vote_average" />
                    <img :src="`https://image.tmdb.org/t/p/w500${mediaObject.poster_path}`"
                        :alt="mediaObject.title ? mediaObject.title : mediaObject.name"
                        class="w-full h-full object-cover rounded border border-[#2731f5]" />
                    <p class="mt-4 text-lg font-semibold text-center text-white">
                        {{ mediaObject.title ? mediaObject.title : mediaObject.name }}
                    </p>
                    <p v-if="mediaObject.release_date" class="text-lg font-semibold text-center text-white">
                        {{ formatDateToSpanish(mediaObject.release_date) }}
                    </p>
                    <div
                        class="w-full flex flex-col rounded border border-[#2731f5] items-center justify-center px-4 opacity-0 group-hover:opacity-100 transition-all duration-300 absolute bottom-0 backdrop-blur-md left-0 w-inherit h-full bg-black/20">
                        <RatingBadge :rating="mediaObject.vote_average" />
                        <p v-if="mediaObject.release_date" class="text-lg font-semibold text-center text-white">
                            {{ formatDateToSpanish(mediaObject.release_date) }}
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
import { ref, computed, onMounted, watch } from 'vue'
import { formatDateToSpanish } from '../utils/formatDate'
import type { MediaTrending } from '../types/Media'
import RatingBadge from './RatingBadge.vue'

const props = defineProps({
    mediaTrendingList: {
        type: Array as () => MediaTrending[],
        required: true
    }
})

const itemsPerPage = 5
const currentPage = ref(0)

const totalPages = computed(() => Math.ceil(props.mediaTrendingList.length / itemsPerPage))


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

onMounted(() => {
    if (props.mediaTrendingList.length === 0) {
        console.warn('No media items available to display in the carousel.')
    }
})
const mediaList = ref<MediaTrending[]>(props.mediaTrendingList)
watch(() => props.mediaTrendingList, (newList) => {
    mediaList.value = newList
    currentPage.value = 0 // Reset to first page when the list changes
}, { immediate: true })
const pagedMedia = computed(() =>
    mediaList.value.slice(currentPage.value * itemsPerPage, (currentPage.value + 1) * itemsPerPage)
)

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
