<template>
  <section class="flex items-center justify-between gap-4 py-9">
    <!-- Flecha izquierda -->
    <button
      class="z-10 p-2 rounded-full shadow-md bg-primary disabled:opacity-30"
      :disabled="currentPage === 0"
      @click="prevPage"
    >
      ‹
    </button>

    <div class="w-full no-scrollbar">
      <div class="flex gap-4">
        <article
          v-for="mediaObject in pagedMedia"
          :key="mediaObject.id"
          class="w-56 flex-shrink-0 h-[20rem] relative group hover:scale-105 transition-all duration-300"
        >
          <RatingBadge :rating="mediaObject.vote_average" />
          <img
            :src="`https://image.tmdb.org/t/p/w780${mediaObject.poster_path}`"
            :alt="mediaObject.title ? mediaObject.title : mediaObject.name"
            class="object-cover w-full h-full border rounded border-primary"
          />
          <p class="mt-4 text-lg font-semibold text-center text-white">
            {{ mediaObject.title ? mediaObject.title : mediaObject.name }}
          </p>
          <p
            v-if="mediaObject.release_date"
            class="text-lg font-semibold text-center text-white"
          >
            {{ formatDateToSpanish(mediaObject.release_date) }}
          </p>
          <div
            class="absolute bottom-0 left-0 flex flex-col items-center justify-center w-full h-full px-4 transition-all duration-300 border rounded opacity-0 border-primary group-hover:opacity-100 backdrop-blur-md w-inherit bg-black/20"
          >
            <RatingBadge :rating="mediaObject.vote_average" />

              <nuxt-link :v-if="mediaObject.media_type === MediaTypeEnum.movie" :to="mediaObject.path">
                <button class="mt-4 text-white bg-primary hover:bg-secondary">
                    Ver detalles
                </button>
              </nuxt-link>

          </div>
        </article>
      </div>
    </div>
    <!-- Flecha derecha -->
    <button
      :disabled="endReached"
      class="z-10 p-2 rounded-full shadow-md bg-primary disabled:opacity-30"
      @click="nextPage"
    >
      ›
    </button>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { formatDateToSpanish } from '@/utils/formatDate';
import type { MediaTrending } from '@/types/Media';
import RatingBadge from './RatingBadge.vue';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';

const props = defineProps({
  mediaTrendingList: {
    type: Array as () => MediaTrending[],
    required: true,
  },
});

const itemsPerPage = 5;
const currentPage = ref(0);

const totalPages = computed(() =>
  Math.ceil(props.mediaTrendingList.length / itemsPerPage)
);

const nextPage = () => {
  if (currentPage.value < totalPages.value - 1) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--;
  }
};

const endReached = computed(() => currentPage.value >= totalPages.value - 1);

// Reactive list to handle media items
const mediaList = ref<MediaTrending[]>(props.mediaTrendingList);

watch(
  () => props.mediaTrendingList,
  (newList) => {
    mediaList.value = newList;

    mediaList.value.forEach(media => {
      if (media.media_type === MediaTypeEnum.movie) {
        media.path = `/pelicula/${media.id}`
      }
      else {
        media.path = `/serie/${media.id}`
      }
    });
    currentPage.value = 0; // Reset to first page when the list changes
  },
  { immediate: true }
);

const pagedMedia = computed(() =>
  mediaList.value.slice(
    currentPage.value * itemsPerPage,
    (currentPage.value + 1) * itemsPerPage
  )
);

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
