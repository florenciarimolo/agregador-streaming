<template>
  <!-- Mobile: List View -->
  <section
    class="mobile-list-view flex flex-col gap-4 py-4 md:hidden relative z-0 w-full max-w-full overflow-x-hidden"
  >
    <article
      v-for="mediaObject in mediaList"
      :key="mediaObject.id"
      class="flex items-center gap-2 sm:gap-4 dark:bg-black/20 bg-gray-100/50 rounded-xl p-2 sm:p-4 dark:hover:bg-black/30 hover:bg-gray-200/50 transition-all w-full max-w-full overflow-hidden"
    >
      <nuxt-link :to="mediaObject.path" class="flex-shrink-0 self-center">
        <div
          class="relative w-20 sm:w-24 aspect-[2/3] overflow-hidden rounded-lg"
        >
          <img
            :src="`https://image.tmdb.org/t/p/w780${mediaObject.poster_path}`"
            :alt="mediaObject.title ? mediaObject.title : mediaObject.name"
            class="object-cover w-full h-full rounded-lg shadow-md"
            loading="lazy"
            decoding="async"
          />
          <!-- Badge positioned at bottom-left to avoid navbar overlap -->
          <div
            :class="{
              'bg-green-500': mediaObject.vote_average >= 7,
              'bg-yellow-500':
                mediaObject.vote_average >= 5 && mediaObject.vote_average < 7,
              'bg-gray-500':
                mediaObject.vote_average === 0 || !mediaObject.vote_average,
              'bg-red-500':
                mediaObject.vote_average && mediaObject.vote_average < 5,
            }"
            class="absolute bottom-1 left-1 p-1.5 text-xs font-semibold rounded shadow-xl shadow-black/20 z-10"
          >
            <span class="font-bold text-white">
              ⭐
              {{
                mediaObject.vote_average?.toFixed(1) === '0.0' ||
                mediaObject.vote_average === 0 ||
                !mediaObject.vote_average
                  ? 'N/A'
                  : mediaObject.vote_average?.toFixed(1)
              }}
            </span>
          </div>
        </div>
      </nuxt-link>
      <div
        class="flex flex-col justify-between flex-1 min-w-0 overflow-hidden w-0"
      >
        <div class="min-w-0 w-full">
          <h3
            class="text-sm sm:text-base font-semibold dark:text-white text-gray-900 mb-1 break-words line-clamp-2"
          >
            {{ mediaObject.title ? mediaObject.title : mediaObject.name }}
          </h3>
          <p
            v-if="mediaObject.release_date || mediaObject.first_air_date"
            class="text-xs sm:text-sm dark:text-gray-100 text-gray-700 mb-1 sm:mb-2"
          >
            {{
              formatDateToSpanish(
                (mediaObject.release_date || mediaObject.first_air_date) ?? ''
              )
            }}
          </p>
          <p
            v-if="mediaObject.overview"
            class="text-xs sm:text-sm dark:text-gray-300 text-gray-500 line-clamp-3 mb-1 sm:mb-2"
          >
            {{ mediaObject.overview }}
          </p>
        </div>
        <div class="flex items-center justify-end mt-2">
          <!-- Mobile: Link -->
          <nuxt-link
            :to="mediaObject.path"
            class="text-primary hover:text-secondary uppercase text-xs sm:text-sm font-semibold md:hidden"
          >
            Ver detalles
          </nuxt-link>
          <!-- Desktop: Button -->
          <nuxt-link :to="mediaObject.path" class="hidden md:block">
            <button
              class="w-auto px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-white bg-primary hover:bg-secondary rounded-lg transition-colors"
            >
              Ver detalles
            </button>
          </nuxt-link>
        </div>
      </div>
    </article>
  </section>

  <!-- Desktop/Tablet: Carousel View -->
  <section
    class="desktop-carousel hidden md:flex items-center justify-between gap-0 py-4"
  >
    <!-- Flecha izquierda -->
    <button
      class="z-10 mb-20 bg-primary disabled:opacity-30 flex-shrink-0 p-1"
      :disabled="currentPage === 0"
      @click="prevPage"
    >
      ‹
    </button>

    <div class="flex flex-row gap-3 no-scrollbar flex-1 justify-center">
      <article
        v-for="mediaObject in pagedMedia"
        :key="mediaObject.id"
        class="relative flex-shrink-0 w-full transition-all duration-300 md:w-40 rounded-xl group hover:scale-105"
      >
        <nuxt-link :to="mediaObject.path" class="block">
          <div class="relative aspect-[2/3] overflow-hidden rounded-xl">
            <RatingBadge :rating="mediaObject.vote_average" />
            <img
              :src="`https://image.tmdb.org/t/p/w780${mediaObject.poster_path}`"
              :alt="mediaObject.title ? mediaObject.title : mediaObject.name"
              class="object-cover w-full h-full overflow-hidden shadow-md rounded-xl shadow-primary/20"
              loading="lazy"
              decoding="async"
            />
            <div
              class="absolute bottom-0 left-0 flex flex-col items-center justify-center w-full h-full px-4 transition-all duration-300 opacity-0 rounded-xl group-hover:opacity-100 group-hover:shadow-primary/20 group-hover:shadow-lg backdrop-blur-md w-inherit dark:bg-black/80 bg-white/80"
            >
              <RatingBadge :rating="mediaObject.vote_average" />
              <p class="mt-4 dark:text-white text-gray-900 font-semibold"
                >Ver detalles</p
              >
            </div>
          </div>
        </nuxt-link>
        <p
          class="mt-2 text-base font-semibold text-center dark:text-white text-gray-900"
        >
          {{ mediaObject.title ? mediaObject.title : mediaObject.name }}
        </p>
        <p
          v-if="mediaObject.release_date || mediaObject.first_air_date"
          class="text-sm text-center dark:text-gray-100 text-gray-700"
        >
          {{
            formatDateToSpanish(
              (mediaObject.release_date || mediaObject.first_air_date) ?? ''
            )
          }}
        </p>
      </article>
    </div>
    <!-- Flecha derecha -->
    <button
      :disabled="endReached"
      class="z-10 p-1 mb-20 rounded-full shadow-md bg-primary disabled:opacity-30 flex-shrink-0"
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

// Initialize based on environment
// During SSR, we can't detect screen size, so we'll use CSS to handle it
// On client, we'll detect and update
const isMobile = ref(false);
const isTablet = ref(false);

// Detect mobile screen size
const checkMobile = () => {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth < 768;
    isTablet.value = window.innerWidth < 1024;
  }
};

const itemsPerPage = computed(() =>
  isMobile.value ? 1 : isTablet.value ? 3 : 6
);
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
  // Check on mount (client-side only)
  if (typeof window !== 'undefined') {
    checkMobile();
    window.addEventListener('resize', handleResize);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

watch(
  () => props.mediaTrendingList,
  (newList) => {
    mediaList.value = newList;

    mediaList.value.forEach((media) => {
      if (media.media_type === MediaTypeEnum.movie) {
        media.path = `/pelicula/${media.id}`;
      } else {
        media.path = `/serie/${media.id}`;
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

/* Ensure desktop carousel is completely hidden on mobile */
@media (max-width: 767px) {
  section.desktop-carousel {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    position: fixed !important;
    top: -9999px !important;
    left: -9999px !important;
    width: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
    z-index: -1 !important;
  }

  section.desktop-carousel * {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
  }

  /* Ensure mobile section is visible and above everything */
  section.mobile-list-view {
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    position: relative !important;
    z-index: 1 !important;
    width: 100% !important;
    max-width: 100vw !important;
    height: auto !important;
    overflow-x: hidden !important;
    overflow-y: visible !important;
    pointer-events: auto !important;
    box-sizing: border-box !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  section.mobile-list-view article {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  section.mobile-list-view article > * {
    box-sizing: border-box !important;
  }
}
</style>
