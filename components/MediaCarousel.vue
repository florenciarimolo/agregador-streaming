<template>
  <section class="flex items-center justify-between gap-4 py-9">
    <!-- Flecha izquierda -->
    <button
      class="z-10 mb-20 bg-primary disabled:opacity-30"
      :disabled="currentPage === 0"
      @click="prevPage"
    >
      ‹
    </button>

    <div class="flex flex-row w-full gap-4 no-scrollbar">
        <article
          v-for="mediaObject in pagedMedia"
          :key="mediaObject.id"
          class="relative flex-shrink-0 w-full transition-all duration-300 md:w-56 rounded-xl group hover:scale-105"
        >
          <div class="relative aspect-[2/3]">
            <RatingBadge :rating="mediaObject.vote_average" />
          <img
            :src="`https://image.tmdb.org/t/p/w780${mediaObject.poster_path}`"
            :alt="mediaObject.title ? mediaObject.title : mediaObject.name"
            class="object-cover w-full h-full overflow-hidden shadow-md rounded-xl shadow-primary/20"
          />
          <div
            class="absolute bottom-0 left-0 flex flex-col items-center justify-center w-full h-full px-4 transition-all duration-300 opacity-0 rounded-xl group-hover:opacity-100 group-hover:shadow-primary/20 group-hover:shadow-lg backdrop-blur-md w-inherit bg-black/20"
          >
            <RatingBadge :rating="mediaObject.vote_average" />

              <nuxt-link :v-if="mediaObject.media_type === MediaTypeEnum.movie" :to="mediaObject.path">
                <button class="mt-4 text-white bg-primary hover:bg-secondary">
                    Ver detalles
                </button>
              </nuxt-link>

          </div>
          </div>
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
            class="flex justify-center lg:hidden"
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
    <!-- Flecha derecha -->
    <button
      :disabled="endReached"
      class="z-10 p-2 mb-20 rounded-full shadow-md bg-primary disabled:opacity-30"
      @click="nextPage"
    >
      ›
    </button>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { formatDateToSpanish } from '@/utils/formatDate';
import type { Media } from '@/types/Media';
import RatingBadge from './RatingBadge.vue';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';

const props = defineProps({
  mediaTrendingList: {
    type: Array as () => Media[],
    required: true,
  },
});

const isMobile = ref(false);
const isTablet = ref(false);

// Detect mobile screen size
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
  isTablet.value = window.innerWidth < 1024;
};

const itemsPerPage = computed(() => isMobile.value ? 1 : isTablet.value ? 2 : 5);
const currentPage = ref(0);

const totalPages = computed(() =>
  Math.ceil(props.mediaTrendingList.length / itemsPerPage.value)
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


const pagedMedia = computed(() =>
  mediaList.value.slice(
    currentPage.value * itemsPerPage.value,
    (currentPage.value + 1) * itemsPerPage.value
  )
);

const endReached = computed(() => currentPage.value >= totalPages.value - 1);

// Reactive list to handle media items
const mediaList = ref<Media[]>(props.mediaTrendingList);

// Handle resize
const handleResize = () => {
  checkMobile();
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', handleResize);
  console.log(isMobile.value);
});


onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

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
